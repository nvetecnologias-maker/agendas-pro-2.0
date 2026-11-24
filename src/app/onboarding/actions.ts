"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePanel } from "@/lib/panel/context";
import { dbErrorMessage, type ActionResult } from "@/lib/db-errors";

async function owner() {
  const panel = await requirePanel();
  if (panel.role !== "owner" && panel.role !== "admin") redirect("/painel");
  return panel;
}

export async function setOnboardingStepAction(step: number): Promise<ActionResult> {
  const panel = await owner();
  const s = Math.max(1, Math.min(7, Math.round(step)));
  const { error } = await panel.supabase.from("barbershops").update({ onboarding_step: s }).eq("id", panel.shop.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  return { ok: true };
}

/** "Eu também atendo": cria o profissional ligado ao login do dono, com todos os serviços */
export async function addSelfAsProfessionalAction(): Promise<ActionResult> {
  const panel = await owner();
  const sb = panel.supabase;
  const { data: existing } = await sb.from("professionals").select("id").eq("barbershop_id", panel.shop.id).eq("user_id", panel.userId).maybeSingle();
  if (existing) return { ok: true };
  const { data: pro, error } = await sb
    .from("professionals")
    .insert({ barbershop_id: panel.shop.id, user_id: panel.userId, name: panel.profile?.full_name ?? "Eu", phone: panel.profile?.phone ?? null, email: panel.profile?.email ?? null, sort_order: 0 })
    .select("id")
    .single();
  if (error || !pro) return { ok: false, error: dbErrorMessage(error) };
  const { data: services } = await sb.from("services").select("id").eq("barbershop_id", panel.shop.id);
  if (services?.length) {
    await sb.from("professional_services").insert(services.map((s) => ({ barbershop_id: panel.shop.id, professional_id: pro.id, service_id: s.id })));
  }
  revalidatePath("/onboarding");
  return { ok: true, message: "Você foi adicionado como profissional" };
}

export async function completeOnboardingAction(publish: boolean): Promise<ActionResult> {
  const panel = await owner();
  const { error } = await panel.supabase
    .from("barbershops")
    .update({
      onboarding_step: 7,
      onboarding_completed_at: new Date().toISOString(),
      ...(publish ? { published_at: panel.shop.published_at ?? new Date().toISOString() } : {}),
    })
    .eq("id", panel.shop.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}
