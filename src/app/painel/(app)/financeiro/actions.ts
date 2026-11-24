"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePanel } from "@/lib/panel/context";
import { dbErrorMessage, type ActionResult } from "@/lib/db-errors";
import { isValidDay, zonedToUtc } from "@/lib/datetime";
import { parseMoney } from "@/lib/money";

const schema = z.object({
  appointmentId: z.string().uuid().optional().or(z.literal("")),
  serviceId: z.string().uuid().optional().or(z.literal("")),
  professionalId: z.string().uuid().optional().or(z.literal("")),
  customerId: z.string().uuid().optional().or(z.literal("")),
  amount: z.string().min(1, "Informe o valor"),
  method: z.enum(["cash", "pix", "debit_card", "credit_card", "other"]),
  day: z.string().refine(isValidDay, "Data inválida"),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().trim().max(500).optional(),
});

/** Registra um pagamento EFETIVAMENTE recebido (agendamento não vira receita sozinho) */
export async function recordPaymentAction(raw: z.input<typeof schema>): Promise<ActionResult> {
  const panel = await requirePanel();
  if (!panel.can("finance.manage")) return { ok: false, error: "Apenas proprietário ou administrador registram pagamentos." };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const v = parsed.data;
  const cents = parseMoney(v.amount);
  if (!cents || cents <= 0) return { ok: false, error: "Valor inválido.", fieldErrors: { amount: "Valor inválido" } };

  let { serviceId, professionalId, customerId } = v;
  if (v.appointmentId) {
    const { data: a } = await panel.supabase
      .from("appointments")
      .select("service_id, professional_id, customer_id")
      .eq("id", v.appointmentId)
      .maybeSingle();
    if (a) {
      serviceId ||= a.service_id;
      professionalId ||= a.professional_id;
      customerId ||= a.customer_id;
    }
  }

  const { error } = await panel.supabase.from("payments").insert({
    barbershop_id: panel.shop.id,
    appointment_id: v.appointmentId || null,
    service_id: serviceId || null,
    professional_id: professionalId || null,
    customer_id: customerId || null,
    amount_cents: cents,
    method: v.method,
    paid_at: zonedToUtc(v.day, v.time ?? "12:00", panel.tz).toISOString(),
    notes: v.notes || null,
    recorded_by: panel.userId,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Pagamento registrado" };
}

export async function refundPaymentAction(id: string): Promise<ActionResult> {
  const panel = await requirePanel();
  if (!panel.can("finance.manage")) return { ok: false, error: "Sem permissão." };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Pagamento inválido." };
  const { error } = await panel.supabase.from("payments").update({ status: "refunded" }).eq("id", id).eq("barbershop_id", panel.shop.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Pagamento estornado" };
}
