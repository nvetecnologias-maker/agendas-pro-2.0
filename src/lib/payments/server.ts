import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GatewayEnv, Provider } from "./providers";

export type GatewayConfig = {
  id: string;
  provider: Provider;
  environment: GatewayEnv;
  isActive: boolean;
  publicKey: string | null;
  methods: string[];
  secret: string | null;
  webhookSecret: string | null;
};

export const PROVIDER_SLUG: Record<Provider, string> = { mercado_pago: "mercado-pago", asaas: "asaas", stripe: "stripe" };
export const SLUG_PROVIDER: Record<string, Provider> = { "mercado-pago": "mercado_pago", asaas: "asaas", stripe: "stripe" };

export function hasServiceRole() {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function load(rows: { id: string; provider: Provider; environment: GatewayEnv; is_active: boolean; public_key: string | null; enabled_methods: string[] }[]) {
  const admin = createAdminClient();
  return Promise.all(rows.map(async (r) => {
    const [s, w] = await Promise.all([
      admin.rpc("get_gateway_secret", { p_gateway_id: r.id, p_kind: "secret" }),
      admin.rpc("get_gateway_secret", { p_gateway_id: r.id, p_kind: "webhook" }),
    ]);
    return {
      id: r.id, provider: r.provider, environment: r.environment, isActive: r.is_active, publicKey: r.public_key,
      methods: r.enabled_methods, secret: (s.data as string | null) ?? null, webhookSecret: (w.data as string | null) ?? null,
    } satisfies GatewayConfig;
  }));
}

const COLS = "id, provider, environment, is_active, public_key, enabled_methods";

/** Gateway ativo da plataforma (com segredos). Só no servidor. */
export async function getActiveGateway(): Promise<GatewayConfig | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("payment_gateways").select(COLS).eq("is_active", true).maybeSingle();
  if (!data) return null;
  const [cfg] = await load([data]);
  return cfg;
}

/** Todas as configurações (teste e produção) de um provedor, para validar webhooks */
export async function getProviderConfigs(provider: Provider): Promise<GatewayConfig[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("payment_gateways").select(COLS).eq("provider", provider)
    .order("is_active", { ascending: false });
  return load(data ?? []);
}
