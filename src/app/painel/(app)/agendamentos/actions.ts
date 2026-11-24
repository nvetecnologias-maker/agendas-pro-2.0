"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePanel } from "@/lib/panel/context";
import { dbErrorMessage, type ActionResult } from "@/lib/db-errors";
import { isValidDay, toLocalTime, zonedToUtc } from "@/lib/datetime";
import { parseMoney } from "@/lib/money";
import type { AppointmentStatus } from "@/types/database";

const uuid = z.string().uuid();

function canManage(panel: Awaited<ReturnType<typeof requirePanel>>) {
  return panel.can("appointments.manage_all") || panel.can("appointments.manage_own");
}

/** Horários livres (calculados no banco) para o formulário de agendamento */
export async function getSlotsAction(input: { serviceId: string; day: string; professionalId?: string | null }) {
  const panel = await requirePanel();
  if (!uuid.safeParse(input.serviceId).success || !isValidDay(input.day)) return [];
  const { data } = await panel.supabase.rpc("get_available_slots", {
    p_barbershop_id: panel.shop.id,
    p_service_id: input.serviceId,
    p_day: input.day,
    ...(input.professionalId ? { p_professional_id: input.professionalId } : {}),
  });
  return (data ?? []).map((s) => ({ professionalId: s.professional_id, startsAt: s.starts_at, time: toLocalTime(s.starts_at, panel.tz) }));
}

/** Busca de clientes por nome ou telefone */
export async function searchCustomersAction(q: string) {
  const panel = await requirePanel();
  const term = q.trim();
  if (term.length < 2) return [];
  const digits = term.replace(/\D/g, "");
  const safe = term.replace(/[%,()*]/g, " ");
  let query = panel.supabase.from("customers").select("id, name, phone").eq("barbershop_id", panel.shop.id).limit(8);
  query = digits.length >= 3 ? query.ilike("phone", `%${digits}%`) : query.ilike("name", `%${safe}%`);
  const { data } = await query.order("name");
  return data ?? [];
}

const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length >= 10 && v.length <= 13, "Telefone inválido (DDD + número)");

const saveSchema = z
  .object({
    id: uuid.optional(),
    customerId: uuid.optional(),
    customerName: z.string().trim().min(2, "Informe o nome do cliente").max(120).optional(),
    customerPhone: phoneSchema.optional(),
    serviceId: uuid,
    professionalId: uuid,
    day: z.string().refine(isValidDay, "Data inválida"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Escolha um horário"),
    price: z.string().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.customerId || (v.customerName && v.customerPhone), {
    message: "Escolha um cliente ou informe nome e telefone",
    path: ["customerName"],
  });

export async function saveAppointmentAction(raw: z.input<typeof saveSchema>): Promise<ActionResult<{ id: string }>> {
  const panel = await requirePanel();
  if (!canManage(panel)) return { ok: false, error: "Você não tem permissão para agendar." };

  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { ok: false, error: "Confira os campos destacados.", fieldErrors };
  }
  const v = parsed.data;
  const sb = panel.supabase;

  // cliente: existente ou novo (telefone é único por barbearia)
  let customerId = v.customerId;
  if (!customerId) {
    const { data: existing } = await sb
      .from("customers")
      .select("id")
      .eq("barbershop_id", panel.shop.id)
      .eq("phone", v.customerPhone!)
      .maybeSingle();
    if (existing) customerId = existing.id;
    else {
      const { data: created, error } = await sb
        .from("customers")
        .insert({ barbershop_id: panel.shop.id, name: v.customerName!, phone: v.customerPhone! })
        .select("id")
        .single();
      if (error || !created) return { ok: false, error: dbErrorMessage(error) };
      customerId = created.id;
    }
  }

  const startsAt = zonedToUtc(v.day, v.time, panel.tz).toISOString();
  const priceCents = v.price ? parseMoney(v.price) : null;

  if (v.id) {
    const { error } = await sb
      .from("appointments")
      .update({
        customer_id: customerId,
        service_id: v.serviceId,
        professional_id: v.professionalId,
        starts_at: startsAt,
        notes: v.notes || null,
        ...(priceCents !== null ? { price_cents: priceCents } : {}),
      })
      .eq("id", v.id)
      .eq("barbershop_id", panel.shop.id);
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/painel", "layout");
    return { ok: true, data: { id: v.id }, message: "Agendamento atualizado" };
  }

  // duração e preço padrão vêm do serviço (o banco preenche); a duração define o término
  const { data: service } = await sb.from("services").select("duration_minutes, price_cents").eq("id", v.serviceId).single();
  if (!service) return { ok: false, error: "Serviço não encontrado." };

  const { data: created, error } = await sb
    .from("appointments")
    .insert({
      barbershop_id: panel.shop.id,
      customer_id: customerId,
      service_id: v.serviceId,
      professional_id: v.professionalId,
      starts_at: startsAt,
      ends_at: startsAt, // recalculado pelo banco
      duration_minutes: service.duration_minutes,
      price_cents: priceCents ?? service.price_cents,
      status: panel.shop.auto_confirm ? "confirmed" : "pending",
      source: "manual",
      notes: v.notes || null,
      created_by: panel.userId,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/painel", "layout");
  return { ok: true, data: { id: created.id }, message: "Agendamento criado" };
}

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "in_progress", "completed", "cancelled", "no_show"],
  confirmed: ["in_progress", "completed", "cancelled", "no_show", "pending"],
  in_progress: ["completed", "cancelled", "confirmed"],
  completed: ["in_progress", "confirmed"],
  cancelled: ["pending", "confirmed"],
  no_show: ["confirmed", "pending"],
};

export async function setStatusAction(id: string, status: AppointmentStatus, reason?: string): Promise<ActionResult> {
  const panel = await requirePanel();
  if (!canManage(panel)) return { ok: false, error: "Você não tem permissão." };
  if (!uuid.safeParse(id).success) return { ok: false, error: "Agendamento inválido." };

  const { data: current } = await panel.supabase.from("appointments").select("status").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "Agendamento não encontrado." };
  if (!TRANSITIONS[current.status].includes(status)) return { ok: false, error: "Essa mudança de status não é permitida." };

  const { error } = await panel.supabase
    .from("appointments")
    .update({ status, cancel_reason: status === "cancelled" ? (reason?.trim().slice(0, 500) || null) : null })
    .eq("id", id)
    .eq("barbershop_id", panel.shop.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/painel", "layout");
  return { ok: true };
}

export async function getHistoryAction(id: string) {
  const panel = await requirePanel();
  if (!uuid.safeParse(id).success) return { events: [], payments: [] };
  const { data } = await panel.supabase
    .from("appointment_events")
    .select("id, kind, from_status, to_status, details, created_at")
    .eq("appointment_id", id)
    .order("created_at");
  const { data: paid } = panel.can("finance.view")
    ? await panel.supabase.from("payments").select("id, amount_cents, method, paid_at, status").eq("appointment_id", id)
    : { data: [] };
  return { events: data ?? [], payments: paid ?? [] };
}
