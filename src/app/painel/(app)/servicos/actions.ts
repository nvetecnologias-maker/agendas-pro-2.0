"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePanelAction } from "@/lib/panel/context";
import { dbErrorMessage, type ActionResult } from "@/lib/db-errors";
import { parseMoney } from "@/lib/money";

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome").max(120),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(60).optional(),
  price: z.string().min(1, "Informe o preço"),
  duration: z.coerce.number().int().min(5, "Mínimo 5 min").max(600, "Máximo 10 h"),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean(),
  professionalIds: z.array(z.string().uuid()),
});

export async function saveServiceAction(raw: z.input<typeof schema>): Promise<ActionResult> {
  const panel = await requirePanelAction("services.manage");
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Confira os campos.", fieldErrors };
  }
  const v = parsed.data;
  const price = parseMoney(v.price);
  if (price === null) return { ok: false, error: "Preço inválido.", fieldErrors: { price: "Preço inválido" } };

  const row = {
    barbershop_id: panel.shop.id,
    name: v.name,
    description: v.description || null,
    category: v.category || null,
    price_cents: price,
    duration_minutes: v.duration,
    image_url: v.imageUrl ?? null,
    is_active: v.isActive,
  };
  const sb = panel.supabase;
  let id = v.id;
  if (id) {
    const { error } = await sb.from("services").update(row).eq("id", id).eq("barbershop_id", panel.shop.id);
    if (error) return { ok: false, error: dbErrorMessage(error) };
  } else {
    const { count } = await sb.from("services").select("id", { count: "exact", head: true }).eq("barbershop_id", panel.shop.id);
    const { data, error } = await sb.from("services").insert({ ...row, sort_order: count ?? 0 }).select("id").single();
    if (error || !data) return { ok: false, error: dbErrorMessage(error) };
    id = data.id;
  }

  // profissionais que realizam o serviço: substitui o conjunto
  const { error: delErr } = await sb.from("professional_services").delete().eq("service_id", id).eq("barbershop_id", panel.shop.id);
  if (delErr) return { ok: false, error: dbErrorMessage(delErr) };
  if (v.professionalIds.length) {
    const { error } = await sb
      .from("professional_services")
      .insert(v.professionalIds.map((pid) => ({ barbershop_id: panel.shop.id, professional_id: pid, service_id: id! })));
    if (error) return { ok: false, error: dbErrorMessage(error) };
  }
  revalidatePath("/painel", "layout");
  return { ok: true, message: v.id ? "Serviço atualizado" : "Serviço criado" };
}

export async function toggleServiceAction(id: string, isActive: boolean): Promise<ActionResult> {
  const panel = await requirePanelAction("services.manage");
  const { error } = await panel.supabase.from("services").update({ is_active: isActive }).eq("id", id).eq("barbershop_id", panel.shop.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/painel", "layout");
  return { ok: true };
}

export async function deleteServiceAction(id: string): Promise<ActionResult> {
  const panel = await requirePanelAction("services.manage");
  const { error } = await panel.supabase.from("services").delete().eq("id", id).eq("barbershop_id", panel.shop.id);
  if (error) {
    if (error.code === "23503") return { ok: false, error: "Este serviço tem agendamentos no histórico. Desative-o em vez de excluir." };
    return { ok: false, error: dbErrorMessage(error) };
  }
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Serviço excluído" };
}

export async function duplicateServiceAction(id: string): Promise<ActionResult> {
  const panel = await requirePanelAction("services.manage");
  const sb = panel.supabase;
  const { data: s } = await sb.from("services").select("*").eq("id", id).eq("barbershop_id", panel.shop.id).single();
  if (!s) return { ok: false, error: "Serviço não encontrado." };
  const { data: links } = await sb.from("professional_services").select("professional_id").eq("service_id", id);
  const { data: copy, error } = await sb
    .from("services")
    .insert({
      barbershop_id: s.barbershop_id,
      name: `${s.name} (cópia)`.slice(0, 120),
      description: s.description,
      category: s.category,
      price_cents: s.price_cents,
      duration_minutes: s.duration_minutes,
      image_url: s.image_url,
      is_active: false,
      sort_order: s.sort_order + 1,
    })
    .select("id")
    .single();
  if (error || !copy) return { ok: false, error: dbErrorMessage(error) };
  if (links?.length) {
    await sb.from("professional_services").insert(links.map((l) => ({ barbershop_id: s.barbershop_id, professional_id: l.professional_id, service_id: copy.id })));
  }
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Cópia criada (inativa)" };
}

export async function reorderServicesAction(ids: string[]): Promise<ActionResult> {
  const panel = await requirePanelAction("services.manage");
  const parsed = z.array(z.string().uuid()).max(500).safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Ordem inválida." };
  const results = await Promise.all(
    parsed.data.map((id, i) => panel.supabase.from("services").update({ sort_order: i }).eq("id", id).eq("barbershop_id", panel.shop.id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: dbErrorMessage(failed.error) };
  revalidatePath("/painel", "layout");
  return { ok: true };
}
