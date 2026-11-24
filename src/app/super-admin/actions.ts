"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, type ActionResult } from "@/lib/db-errors";
import { parseMoney } from "@/lib/money";
import type { Enums, TablesInsert, TablesUpdate } from "@/types/database";

/** Toda ação confere o papel no servidor; o banco confere de novo (assert_super_admin / RLS). */
async function admin() {
  const s = await getSession();
  if (!s?.isSuperAdmin) throw new Error("Acesso negado");
  return createClient();
}

function issues(e: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const i of e.issues) fieldErrors[String(i.path[0])] ??= i.message;
  return { ok: false as const, error: "Confira os campos.", fieldErrors };
}

const uuid = z.string().uuid();
const reason = z.string().trim().max(300).optional();

// ---------------------------------------------------------------- barbearias
export async function setShopStatusAction(shopId: string, status: Enums<"barbershop_status">, why?: string): Promise<ActionResult> {
  const supabase = await admin();
  if (!uuid.safeParse(shopId).success) return { ok: false, error: "Barbearia inválida." };
  const { error } = await supabase.rpc("admin_set_shop_status", { p_barbershop_id: shopId, p_status: status, ...(why ? { p_reason: why } : {}) });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath(`/super-admin/barbearias/${shopId}`);
  return { ok: true, message: status === "suspended" ? "Barbearia suspensa." : "Barbearia reativada." };
}

export async function grantDaysAction(shopId: string, raw: { days: number; reason?: string }): Promise<ActionResult> {
  const supabase = await admin();
  const p = z.object({ days: z.coerce.number().int().min(-365).max(365).refine((d) => d !== 0, "Informe os dias"), reason }).safeParse(raw);
  if (!p.success) return issues(p.error);
  const { error } = await supabase.rpc("admin_grant_days", { p_barbershop_id: shopId, p_days: p.data.days, ...(p.data.reason ? { p_reason: p.data.reason } : {}) });
  if (error) return { ok: false, error: error.message.includes("AP_NO_SUBSCRIPTION") ? "Esta barbearia não tem assinatura vigente. Defina um plano primeiro." : dbErrorMessage(error) };
  revalidatePath(`/super-admin/barbearias/${shopId}`);
  return { ok: true, message: p.data.days > 0 ? `${p.data.days} dia(s) concedido(s).` : `${-p.data.days} dia(s) removido(s).` };
}

export async function changePlanAction(shopId: string, raw: { planId: string; status?: string; periodDays?: string; reason?: string }): Promise<ActionResult> {
  const supabase = await admin();
  const p = z.object({
    planId: uuid,
    status: z.enum(["", "trial", "active", "pending", "past_due", "suspended"]).optional(),
    periodDays: z.string().optional().transform((v) => (v ? Number(v) : undefined)).pipe(z.number().int().min(1).max(3650).optional()),
    reason,
  }).safeParse(raw);
  if (!p.success) return issues(p.error);
  const { error } = await supabase.rpc("admin_change_plan", {
    p_barbershop_id: shopId,
    p_plan_id: p.data.planId,
    ...(p.data.status ? { p_status: p.data.status as Enums<"subscription_status"> } : {}),
    ...(p.data.periodDays ? { p_period_days: p.data.periodDays } : {}),
    ...(p.data.reason ? { p_reason: p.data.reason } : {}),
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath(`/super-admin/barbearias/${shopId}`);
  return { ok: true, message: "Plano atualizado." };
}

export async function setSubscriptionStatusAction(shopId: string, status: Enums<"subscription_status">, why?: string): Promise<ActionResult> {
  const supabase = await admin();
  const { error } = await supabase.rpc("admin_set_subscription_status", { p_barbershop_id: shopId, p_status: status, ...(why ? { p_reason: why } : {}) });
  if (error) return { ok: false, error: error.message.includes("AP_NO_SUBSCRIPTION") ? "Sem assinatura vigente." : dbErrorMessage(error) };
  revalidatePath(`/super-admin/barbearias/${shopId}`);
  return { ok: true, message: "Assinatura atualizada." };
}

// ---------------------------------------------------------------- planos
const planSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2, "Informe o nome").max(60),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,60}$/, "Use letras minúsculas, números e hífen"),
  description: z.string().trim().max(500).optional(),
  price: z.string().min(1, "Informe o preço"),
  compareAt: z.string().optional(),
  billingPeriod: z.enum(["monthly", "quarterly", "semiannual", "annual"]),
  trialDays: z.coerce.number().int().min(0).max(90),
  isFeatured: z.boolean(),
  highlightLabel: z.string().trim().max(30).optional(),
  isActive: z.boolean(),
  isDefaultTrial: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999),
  features: z.array(z.object({
    key: z.string().trim().regex(/^[a-z][a-z0-9_.]{1,60}$/, "Chave inválida"),
    enabled: z.boolean(),
    limit: z.string().optional(),
    label: z.string().trim().max(120).optional(),
  })).max(40),
});

export async function savePlanAction(raw: z.input<typeof planSchema>): Promise<ActionResult<{ id: string }>> {
  const supabase = await admin();
  const p = planSchema.safeParse(raw);
  if (!p.success) return issues(p.error);
  const v = p.data;
  const price = parseMoney(v.price);
  const compare = v.compareAt ? parseMoney(v.compareAt) : null;
  if (price === null) return { ok: false, error: "Preço inválido.", fieldErrors: { price: "Preço inválido" } };
  const keys = new Set<string>();
  for (const f of v.features) {
    if (keys.has(f.key)) return { ok: false, error: `Recurso repetido: ${f.key}` };
    keys.add(f.key);
    if (f.limit && !/^\d+$/.test(f.limit)) return { ok: false, error: `Limite inválido em ${f.key}` };
  }

  const row = {
    name: v.name, slug: v.slug, description: v.description || null, price_cents: price, compare_at_cents: compare,
    billing_period: v.billingPeriod, trial_days: v.trialDays, is_featured: v.isFeatured, highlight_label: v.highlightLabel || null,
    is_active: v.isActive, is_default_trial: v.isDefaultTrial, sort_order: v.sortOrder,
  } satisfies TablesUpdate<"plans">;

  let id = v.id;
  if (v.isDefaultTrial) {
    // só um plano pode ser o de teste padrão
    const { error } = await supabase.from("plans").update({ is_default_trial: false }).neq("id", id ?? "00000000-0000-0000-0000-000000000000");
    if (error) return { ok: false, error: dbErrorMessage(error) };
  }
  if (id) {
    const { error } = await supabase.from("plans").update(row).eq("id", id);
    if (error) return { ok: false, error: dbErrorMessage(error) };
  } else {
    const { data, error } = await supabase.from("plans").insert(row as TablesInsert<"plans">).select("id").single();
    if (error || !data) return { ok: false, error: dbErrorMessage(error) };
    id = data.id;
  }

  const { error: delErr } = await supabase.from("plan_features").delete().eq("plan_id", id!);
  if (delErr) return { ok: false, error: dbErrorMessage(delErr) };
  if (v.features.length) {
    const { error } = await supabase.from("plan_features").insert(v.features.map((f, i) => ({
      plan_id: id!, feature_key: f.key, enabled: f.enabled, limit_value: f.limit ? Number(f.limit) : null, label: f.label || null, sort_order: i,
    })));
    if (error) return { ok: false, error: dbErrorMessage(error) };
  }
  revalidatePath("/super-admin/planos");
  revalidatePath("/");
  return { ok: true, data: { id: id! }, message: "Plano salvo." };
}

export async function deletePlanAction(id: string): Promise<ActionResult> {
  const supabase = await admin();
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) return { ok: false, error: error.code === "23503" ? "Há assinaturas neste plano. Desative-o em vez de excluir." : dbErrorMessage(error) };
  revalidatePath("/super-admin/planos");
  return { ok: true, message: "Plano excluído." };
}

// ---------------------------------------------------------------- cupons
const couponSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2, "Informe o nome").max(80),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/, "3 a 40 letras, números, - ou _"),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.string().min(1, "Informe o desconto"),
  extraTrialDays: z.coerce.number().int().min(0).max(90),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  maxRedemptions: z.string().optional(),
  audience: z.enum(["all", "new_customers", "existing_customers"]),
  planIds: z.array(uuid),
  isActive: z.boolean(),
});

export async function saveCouponAction(raw: z.input<typeof couponSchema>): Promise<ActionResult> {
  const supabase = await admin();
  const p = couponSchema.safeParse(raw);
  if (!p.success) return issues(p.error);
  const v = p.data;
  let value: number | null;
  if (v.discountType === "percent") {
    value = Number(v.discountValue.replace(",", "."));
    if (!Number.isInteger(value) || value < 1 || value > 100) return { ok: false, error: "Percentual entre 1 e 100.", fieldErrors: { discountValue: "Entre 1 e 100" } };
  } else {
    value = parseMoney(v.discountValue);
    if (!value) return { ok: false, error: "Valor inválido.", fieldErrors: { discountValue: "Valor inválido" } };
  }
  const toTs = (d?: string) => (d ? new Date(`${d}T00:00:00-03:00`).toISOString() : null);
  const endTs = v.endsAt ? new Date(`${v.endsAt}T23:59:59-03:00`).toISOString() : null;
  if (v.startsAt && v.endsAt && v.endsAt < v.startsAt) return { ok: false, error: "O fim precisa ser depois do início.", fieldErrors: { endsAt: "Depois do início" } };
  const max = v.maxRedemptions ? Number(v.maxRedemptions) : null;
  if (max !== null && (!Number.isInteger(max) || max < 1)) return { ok: false, error: "Limite de usos inválido.", fieldErrors: { maxRedemptions: "Número inteiro" } };
  const s = await getSession();

  const row = {
    name: v.name, code: v.code, discount_type: v.discountType, discount_value: value, extra_trial_days: v.extraTrialDays,
    starts_at: toTs(v.startsAt), ends_at: endTs, max_redemptions: max, audience: v.audience, applicable_plan_ids: v.planIds, is_active: v.isActive,
  } satisfies TablesUpdate<"coupons">;
  const { error } = v.id
    ? await supabase.from("coupons").update(row).eq("id", v.id)
    : await supabase.from("coupons").insert({ ...row, created_by: s?.userId ?? null } as TablesInsert<"coupons">);
  if (error) return { ok: false, error: error.code === "23505" ? "Já existe um cupom com esse código." : dbErrorMessage(error) };
  revalidatePath("/super-admin/cupons");
  return { ok: true, message: "Cupom salvo." };
}

export async function toggleCouponAction(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await admin();
  const { error } = await supabase.from("coupons").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/super-admin/cupons");
  return { ok: true, message: active ? "Cupom ativado." : "Cupom desativado." };
}

// ---------------------------------------------------------------- gateways
const gatewaySchema = z.object({
  provider: z.enum(["mercado_pago", "asaas", "stripe"]),
  environment: z.enum(["sandbox", "production"]),
  publicKey: z.string().trim().max(500).optional(),
  methods: z.array(z.enum(["pix", "credit_card", "boleto"])).min(1, "Escolha ao menos uma forma"),
  isActive: z.boolean(),
  secretKey: z.string().trim().max(1000).optional(),
  webhookSecret: z.string().trim().max(1000).optional(),
});

export async function saveGatewayAction(raw: z.input<typeof gatewaySchema>): Promise<ActionResult> {
  const supabase = await admin();
  const p = gatewaySchema.safeParse(raw);
  if (!p.success) return issues(p.error);
  const v = p.data;
  const { error } = await supabase.rpc("admin_save_gateway", {
    p_provider: v.provider, p_environment: v.environment, p_public_key: v.publicKey ?? "", p_enabled_methods: v.methods, p_is_active: v.isActive,
    ...(v.secretKey ? { p_secret_key: v.secretKey } : {}),
    ...(v.webhookSecret ? { p_webhook_secret: v.webhookSecret } : {}),
  });
  if (error) {
    if (error.message.includes("AP_GATEWAY_NO_SECRET")) return { ok: false, error: "Informe a chave secreta antes de ativar.", fieldErrors: { secretKey: "Obrigatória para ativar" } };
    return { ok: false, error: dbErrorMessage(error) };
  }
  revalidatePath("/super-admin/gateways");
  return { ok: true, message: "Gateway salvo. As chaves ficam guardadas de forma segura e não são exibidas novamente." };
}

// ---------------------------------------------------------------- plataforma
const settingsSchema = z.object({
  platformName: z.string().trim().min(2).max(60),
  supportEmail: z.string().trim().email("E-mail inválido").or(z.literal("")),
  contactPhone: z.string().trim().max(20).optional(),
  contactWhatsapp: z.string().trim().max(20).optional(),
  publicBaseUrl: z.string().trim().url("URL inválida"),
  defaultTrialDays: z.coerce.number().int().min(0).max(90),
  gracePeriodDays: z.coerce.number().int().min(0).max(60),
  instagram: z.string().trim().max(120).optional(),
});

export async function savePlatformSettingsAction(raw: z.input<typeof settingsSchema>): Promise<ActionResult> {
  const supabase = await admin();
  const p = settingsSchema.safeParse(raw);
  if (!p.success) return issues(p.error);
  const v = p.data;
  const s = await getSession();
  const digits = (x?: string) => (x ? x.replace(/\D/g, "") || null : null);
  const { data: cur } = await supabase.from("platform_settings").select("social_links").eq("id", true).maybeSingle();
  const social = { ...((cur?.social_links as Record<string, string> | null) ?? {}), instagram: v.instagram || "" };
  const { error } = await supabase.from("platform_settings").update({
    social_links: social,
    platform_name: v.platformName, support_email: v.supportEmail || null, contact_phone: digits(v.contactPhone), contact_whatsapp: digits(v.contactWhatsapp),
    public_base_url: v.publicBaseUrl.replace(/\/$/, ""), default_trial_days: v.defaultTrialDays, grace_period_days: v.gracePeriodDays,
    updated_by: s?.userId ?? null,
  }).eq("id", true);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/super-admin/configuracoes");
  revalidatePath("/");
  return { ok: true, message: "Configurações salvas." };
}
