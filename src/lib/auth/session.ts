import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AccessLevel, Barbershop, Profile, ShopRole } from "@/types/database";

export type Membership = { role: ShopRole; barbershop: Barbershop };

export type SessionContext = {
  userId: string;
  email: string | null;
  emailConfirmed: boolean;
  profile: Profile | null;
  isSuperAdmin: boolean;
  memberships: Membership[];
  /** barbearia ativa (por enquanto, a primeira; seletor virá no painel) */
  current: (Membership & { access: AccessLevel }) | null;
};

/**
 * Carrega o contexto do usuário logado UMA vez por requisição.
 * Tudo aqui passa pela RLS: o usuário só recebe o que tem direito de ver.
 */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("barbershop_members")
      .select("role, barbershop:barbershops(*)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  const memberships: Membership[] = ((rows ?? []) as unknown as { role: ShopRole; barbershop: Barbershop | null }[])
    .filter((r) => r.barbershop)
    .map((r) => ({ role: r.role, barbershop: r.barbershop! }));

  let current: SessionContext["current"] = null;
  if (memberships[0]) {
    const { data: access } = await supabase.rpc("barbershop_access_level", {
      p_barbershop_id: memberships[0].barbershop.id,
    });
    current = { ...memberships[0], access: (access as AccessLevel) ?? "blocked" };
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
    profile: (profile as Profile | null) ?? null,
    isSuperAdmin: profile?.platform_role === "super_admin",
    memberships,
    current,
  };
});

/** Para onde levar o usuário depois do login, conforme o perfil */
export function homePathFor(ctx: SessionContext): string {
  if (ctx.isSuperAdmin && ctx.memberships.length === 0) return "/super-admin";
  if (!ctx.current) return "/painel";
  const shop = ctx.current.barbershop;
  if (ctx.current.role === "owner" && !shop.onboarding_completed_at) return "/onboarding";
  return "/painel";
}

export async function requireSession() {
  const ctx = await getSession();
  if (!ctx) redirect("/entrar");
  return ctx;
}

export async function requireSuperAdmin() {
  const ctx = await requireSession();
  // validação no servidor (o banco valida de novo em cada consulta via is_super_admin())
  if (!ctx.isSuperAdmin) redirect("/painel");
  return ctx;
}

/** Valida que "next" é um caminho interno (evita open redirect) */
export function safeNextPath(next: string | null | undefined, fallback = "/auth/redirecionar") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
