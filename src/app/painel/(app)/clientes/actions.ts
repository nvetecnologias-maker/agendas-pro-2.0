"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePanelAction } from "@/lib/panel/context";
import { dbErrorMessage, type ActionResult } from "@/lib/db-errors";

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome").max(120),
  phone: z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length >= 10 && v.length <= 13, "Telefone inválido (DDD + número)"),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
});

export async function saveCustomerAction(raw: z.input<typeof schema>): Promise<ActionResult<{ id: string }>> {
  const panel = await requirePanelAction("customers.manage");
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Confira os campos.", fieldErrors };
  }
  const v = parsed.data;
  const row = { barbershop_id: panel.shop.id, name: v.name, phone: v.phone, email: v.email || null, notes: v.notes || null };
  if (v.id) {
    const { error } = await panel.supabase.from("customers").update(row).eq("id", v.id).eq("barbershop_id", panel.shop.id);
    if (error) return { ok: false, error: error.code === "23505" ? "Já existe um cliente com esse telefone." : dbErrorMessage(error) };
    revalidatePath("/painel", "layout");
    return { ok: true, data: { id: v.id }, message: "Cliente atualizado" };
  }
  const { data, error } = await panel.supabase.from("customers").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: error?.code === "23505" ? "Já existe um cliente com esse telefone." : dbErrorMessage(error) };
  revalidatePath("/painel", "layout");
  return { ok: true, data: { id: data.id }, message: "Cliente cadastrado" };
}
