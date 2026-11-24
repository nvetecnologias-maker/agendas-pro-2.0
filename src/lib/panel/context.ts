import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { can, type Action } from "@/lib/permissions/matrix";
import { createClient } from "@/lib/supabase/server";
import type { Plan, Subscription } from "@/types/database";

export type PanelContext = Awaited<ReturnType<typeof loadPanel>>;

const loadPanel = cache(async () => {
  const ctx = await requireSession();
  if (!ctx.current) {
    if (ctx.isSuperAdmin) redirect("/super-admin");
    redirect("/painel/sem-barbearia");
  }
  const supabase = await createClient();
  const { barbershop, role, access } = ctx.current;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("barbershop_id", barbershop.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const subscription = (sub as (Subscription & { plan: Plan | null }) | null) ?? null;

  return {
    supabase,
    userId: ctx.userId,
    profile: ctx.profile,
    isSuperAdmin: ctx.isSuperAdmin,
    shop: barbershop,
    role,
    access,
    tz: barbershop.timezone,
    subscription,
    can: (action: Action) => can(role, action, access),
  };
});

/**
 * Contexto do painel: sessão + barbearia + assinatura. Redireciona se faltar algo.
 * O layout do painel usa { allowOnboarding: false } para levar o dono ao passo a passo inicial;
 * server actions e páginas internas não redirecionam (o layout já cuida disso).
 */
export async function requirePanel(options: { allowOnboarding?: boolean } = {}) {
  const panel = await loadPanel();
  if (options.allowOnboarding === false && panel.role === "owner" && !panel.shop.onboarding_completed_at) {
    redirect("/onboarding");
  }
  return panel;
}

/** Garante a permissão (o banco valida de novo via RLS) */
export async function requirePanelAction(action: Action) {
  const panel = await requirePanel();
  if (!panel.can(action)) redirect("/painel");
  return panel;
}
