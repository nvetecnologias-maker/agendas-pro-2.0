"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePanelAction } from "@/lib/panel/context";
import { dbErrorMessage, type ActionResult } from "@/lib/db-errors";
import { RESERVED_SLUGS } from "@/lib/slug";

export async function setPublishedAction(published: boolean): Promise<ActionResult> {
  const panel = await requirePanelAction("public_page.manage");
  if (published) {
    // checagem amigável antes de publicar: precisa ter algo para agendar
    const [{ count: svc }, { count: links }] = await Promise.all([
      panel.supabase.from("services").select("id", { count: "exact", head: true }).eq("barbershop_id", panel.shop.id).eq("is_active", true),
      panel.supabase.from("professional_services").select("service_id", { count: "exact", head: true }).eq("barbershop_id", panel.shop.id),
    ]);
    if (!svc || !links) return { ok: false, error: "Cadastre ao menos um serviço ativo com um profissional antes de publicar." };
  }
  const { error } = await panel.supabase
    .from("barbershops")
    .update({ published_at: published ? new Date().toISOString() : null })
    .eq("id", panel.shop.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: published ? "Agenda publicada" : "Agenda despublicada" };
}

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/, "Use de 3 a 60 letras minúsculas, números e hífens (sem acento).")
  .refine((s) => !RESERVED_SLUGS.has(s), "Esse endereço é reservado pelo sistema. Escolha outro.");

export async function updateSlugAction(raw: string): Promise<ActionResult> {
  const panel = await requirePanelAction("public_page.manage");
  const parsed = slugSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { error } = await panel.supabase.from("barbershops").update({ slug: parsed.data }).eq("id", panel.shop.id);
  if (error) return { ok: false, error: error.code === "23505" ? "Esse endereço já está em uso por outra barbearia." : dbErrorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Link atualizado" };
}
