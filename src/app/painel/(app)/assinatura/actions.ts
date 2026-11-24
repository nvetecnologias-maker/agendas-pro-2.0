"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, type ActionResult } from "@/lib/db-errors";
import { requirePanelAction } from "@/lib/panel/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/supabase/env";
import { getActiveGateway, hasServiceRole, PROVIDER_SLUG } from "@/lib/payments/server";
import { asaas, GatewayError, mercadoPago, stripe, type CheckoutInput } from "@/lib/payments/providers";

type Quote = {
  plan_id: string; plan_name: string; amount_cents: number; discount_cents: number; coupon_id: string | null; coupon_code: string | null;
};

const NOT_READY = "O pagamento online ainda não foi configurado pela plataforma. Fale com o suporte.";

export async function quoteCheckoutAction(planSlug: string, coupon?: string): Promise<ActionResult<{ amount: number; discount: number; plan: string }>> {
  const panel = await requirePanelAction("subscription.manage");
  const { data, error } = await panel.supabase.rpc("quote_checkout", {
    p_barbershop_id: panel.shop.id, p_plan_slug: planSlug, ...(coupon ? { p_coupon_code: coupon } : {}),
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  const q = data as unknown as Quote;
  return { ok: true, data: { amount: q.amount_cents, discount: q.discount_cents, plan: q.plan_name } };
}

/**
 * Cria a cobrança no gateway ativo e devolve a URL do checkout. A assinatura só
 * muda quando o webhook do gateway confirma o pagamento.
 */
export async function startCheckoutAction(planSlug: string, coupon?: string): Promise<ActionResult<{ url: string }>> {
  const panel = await requirePanelAction("subscription.manage");
  if (!/^[a-z0-9-]{1,60}$/.test(planSlug)) return { ok: false, error: "Plano inválido." };
  if (coupon && !/^[A-Za-z0-9_ -]{1,40}$/.test(coupon)) return { ok: false, error: "Cupom inválido." };

  const { data, error } = await panel.supabase.rpc("quote_checkout", {
    p_barbershop_id: panel.shop.id, p_plan_slug: planSlug, ...(coupon ? { p_coupon_code: coupon } : {}),
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  const q = data as unknown as Quote;

  if (!hasServiceRole()) return { ok: false, error: NOT_READY };
  const gw = await getActiveGateway();
  if (!gw?.secret) return { ok: false, error: NOT_READY };

  const admin = createAdminClient();
  const { data: settings } = await admin.from("platform_settings").select("public_base_url, platform_name").eq("id", true).maybeSingle();
  const site = getSiteUrl();
  const hookBase = (settings?.public_base_url ?? site).replace(/\/$/, "");

  const { data: tx, error: txErr } = await admin.from("payment_transactions").insert({
    barbershop_id: panel.shop.id, plan_id: q.plan_id, subscription_id: panel.subscription?.id ?? null,
    gateway: gw.provider, environment: gw.environment, amount_cents: q.amount_cents, discount_cents: q.discount_cents,
    coupon_id: q.coupon_id, status: "pending", created_by: panel.userId,
  }).select("id").single();
  if (txErr || !tx) return { ok: false, error: "Não foi possível iniciar o pagamento. Tente de novo." };

  // cupom de 100%: não há o que cobrar, aplica direto
  if (q.amount_cents === 0) {
    const { error: e } = await admin.rpc("apply_payment_event", {
      p_gateway: gw.provider, p_tx_id: tx.id, p_gateway_payment_id: `free_${tx.id}`, p_checkout_ref: null as unknown as string, p_status: "approved", p_amount_cents: 0, p_method: "coupon",
    });
    if (e) return { ok: false, error: dbErrorMessage(e) };
    revalidatePath("/painel", "layout");
    return { ok: true, data: { url: `${site}/painel/assinatura?pagamento=sucesso` } };
  }

  const input: CheckoutInput = {
    txId: tx.id,
    title: `${settings?.platform_name ?? "Agendas Pro"} · Plano ${q.plan_name}`,
    amountCents: q.amount_cents,
    methods: gw.methods,
    customer: { name: panel.profile?.full_name ?? panel.shop.name, email: panel.profile?.email ?? null, phone: panel.profile?.phone ?? null },
    successUrl: `${site}/painel/assinatura?pagamento=sucesso`,
    cancelUrl: `${site}/painel/assinatura?pagamento=cancelado`,
    webhookUrl: `${hookBase}/api/webhooks/${PROVIDER_SLUG[gw.provider]}`,
  };
  try {
    const r = gw.provider === "mercado_pago" ? await mercadoPago.createCheckout(gw.secret, gw.environment, input)
      : gw.provider === "asaas" ? await asaas.createCheckout(gw.secret, gw.environment, input)
      : await stripe.createCheckout(gw.secret, input);
    await admin.from("payment_transactions").update({ checkout_ref: r.checkoutRef }).eq("id", tx.id);
    return { ok: true, data: { url: r.url } };
  } catch (e) {
    await admin.from("payment_transactions").update({ status: "canceled", raw_payload: { error: e instanceof Error ? e.message.slice(0, 300) : "erro" } }).eq("id", tx.id);
    console.error("[checkout]", gw.provider, e instanceof GatewayError ? `${e.status} ${e.message}` : e);
    return { ok: false, error: "O gateway de pagamento não respondeu. Tente de novo em instantes." };
  }
}

export async function cancelSubscriptionAction(reason?: string): Promise<ActionResult> {
  const panel = await requirePanelAction("subscription.manage");
  const { error } = await panel.supabase.rpc("cancel_my_subscription", { p_barbershop_id: panel.shop.id, ...(reason ? { p_reason: reason.slice(0, 300) } : {}) });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Cancelamento agendado. O acesso continua até o fim do período." };
}

export async function resumeSubscriptionAction(): Promise<ActionResult> {
  const panel = await requirePanelAction("subscription.manage");
  const { error } = await panel.supabase.rpc("resume_my_subscription", { p_barbershop_id: panel.shop.id });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Assinatura mantida." };
}
