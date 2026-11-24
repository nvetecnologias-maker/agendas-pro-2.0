import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database, Plan, PlanFeature } from "@/types/database";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type PublicPlan = Plan & { features: PlanFeature[] };

export type PublicPlatformInfo = {
  platform_name: string;
  support_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  public_base_url: string;
  default_trial_days: number;
  social_links: Record<string, string>;
};

/** Cliente anônimo, sem cookies: só enxerga o que a RLS libera ao visitante */
function anonClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createClient<Database>(url, anonKey, { auth: { persistSession: false } });
}

/** Vitrine de planos: preços, benefícios e destaques vêm do banco (Super Admin) */
export async function getPublicPlans(): Promise<{ plans: PublicPlan[]; error: boolean }> {
  try {
    const sb = anonClient();
    const [{ data: plans, error: e1 }, { data: features, error: e2 }] = await Promise.all([
      sb.from("plans").select("*").eq("is_active", true).order("sort_order"),
      sb.from("plan_features").select("*").order("sort_order"),
    ]);
    if (e1 || e2 || !plans) return { plans: [], error: true };
    return {
      plans: (plans as Plan[]).map((p) => ({
        ...p,
        features: ((features ?? []) as PlanFeature[]).filter((f) => f.plan_id === p.id),
      })),
      error: false,
    };
  } catch {
    return { plans: [], error: true };
  }
}

const FALLBACK_INFO: PublicPlatformInfo = {
  platform_name: "Agendas Pro",
  support_email: null,
  contact_phone: null,
  contact_whatsapp: null,
  public_base_url: "https://agendaspro.com.br",
  default_trial_days: 14,
  social_links: {},
};

export async function getPublicPlatformInfo(): Promise<PublicPlatformInfo> {
  try {
    const { data, error } = await anonClient().rpc("get_public_platform_info").maybeSingle();
    if (error || !data) return FALLBACK_INFO;
    return { ...FALLBACK_INFO, ...(data as Partial<PublicPlatformInfo>), social_links: (data as PublicPlatformInfo).social_links ?? {} };
  } catch {
    return FALLBACK_INFO;
  }
}
