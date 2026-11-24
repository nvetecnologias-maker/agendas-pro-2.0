"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePanelAction } from "@/lib/panel/context";
import { dbErrorMessage, type ActionResult } from "@/lib/db-errors";

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome").max(120),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  specialties: z.array(z.string().trim().min(1).max(40)).max(12),
  bio: z.string().trim().max(1000).optional(),
  photoUrl: z.string().url().nullable().optional(),
  isActive: z.boolean(),
  serviceIds: z.array(z.string().uuid()),
});

export async function saveProfessionalAction(raw: z.input<typeof schema>): Promise<ActionResult<{ id: string }>> {
  const panel = await requirePanelAction("professionals.manage");
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Confira os campos.", fieldErrors };
  }
  const v = parsed.data;
  const sb = panel.supabase;
  const row = {
    barbershop_id: panel.shop.id,
    name: v.name,
    phone: v.phone?.replace(/\D/g, "") || null,
    email: v.email || null,
    specialties: v.specialties,
    bio: v.bio || null,
    photo_url: v.photoUrl ?? null,
    is_active: v.isActive,
  };
  let id = v.id;
  if (id) {
    const { error } = await sb.from("professionals").update(row).eq("id", id).eq("barbershop_id", panel.shop.id);
    if (error) return { ok: false, error: dbErrorMessage(error) };
  } else {
    const { count } = await sb.from("professionals").select("id", { count: "exact", head: true }).eq("barbershop_id", panel.shop.id);
    const { data, error } = await sb.from("professionals").insert({ ...row, sort_order: count ?? 0 }).select("id").single();
    if (error || !data) return { ok: false, error: dbErrorMessage(error) };
    id = data.id;
  }
  const { error: delErr } = await sb.from("professional_services").delete().eq("professional_id", id).eq("barbershop_id", panel.shop.id);
  if (delErr) return { ok: false, error: dbErrorMessage(delErr) };
  if (v.serviceIds.length) {
    const { error } = await sb.from("professional_services").insert(v.serviceIds.map((sid) => ({ barbershop_id: panel.shop.id, professional_id: id!, service_id: sid })));
    if (error) return { ok: false, error: dbErrorMessage(error) };
  }
  revalidatePath("/painel", "layout");
  return { ok: true, data: { id }, message: v.id ? "Profissional atualizado" : "Profissional adicionado" };
}

export async function toggleProfessionalAction(id: string, isActive: boolean): Promise<ActionResult> {
  const panel = await requirePanelAction("professionals.manage");
  const { error } = await panel.supabase.from("professionals").update({ is_active: isActive }).eq("id", id).eq("barbershop_id", panel.shop.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/painel", "layout");
  return { ok: true, message: isActive ? "Profissional ativado" : "Profissional desativado" };
}
