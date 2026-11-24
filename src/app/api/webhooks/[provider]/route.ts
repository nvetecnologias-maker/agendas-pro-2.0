import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProviderConfigs, hasServiceRole, SLUG_PROVIDER, type GatewayConfig } from "@/lib/payments/server";
import { asaas, mercadoPago, stripe, type PaymentEvent, type Provider } from "@/lib/payments/providers";
import { verifyAsaasToken, verifyMercadoPagoSignature, verifyStripeSignature } from "@/lib/payments/signatures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 512 * 1024;
const ok = (extra: Record<string, unknown> = {}) => NextResponse.json({ received: true, ...extra });
const deny = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Webhooks dos gateways. Regras de segurança:
 *  1. o corpo só é aceito com assinatura/token válido de uma configuração salva;
 *  2. Mercado Pago e Asaas: o status é confirmado consultando a API do gateway
 *     com a chave secreta (o corpo do webhook nunca é a fonte da verdade);
 *  3. a aplicação no banco é idempotente (apply_payment_event).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: slug } = await ctx.params;
  const provider = SLUG_PROVIDER[slug] as Provider | undefined;
  if (!provider) return deny(404, "unknown provider");
  if (!hasServiceRole()) return deny(503, "not configured");

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) return deny(413, "too large");
  const raw = await req.text();
  if (raw.length > MAX_BODY) return deny(413, "too large");

  const configs = (await getProviderConfigs(provider)).filter((c) => c.secret);
  if (configs.length === 0) return deny(503, "gateway not configured");

  let event: PaymentEvent | null = null;
  let cfg: GatewayConfig | undefined;
  try {
    if (provider === "stripe") {
      const sig = req.headers.get("stripe-signature");
      cfg = configs.find((c) => c.webhookSecret && verifyStripeSignature(raw, sig, c.webhookSecret));
      if (!cfg) return deny(401, "invalid signature");
      event = stripe.parseEvent(JSON.parse(raw));
    } else if (provider === "mercado_pago") {
      const url = new URL(req.url);
      let body: Record<string, unknown> = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch { /* notificações IPN antigas vêm só na URL */ }
      const type = String(body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");
      const dataId = String((body.data as { id?: unknown } | undefined)?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
      if (type !== "payment" || !dataId) return ok({ ignored: true });
      const signed = configs.filter((c) => c.webhookSecret);
      const sigHeader = req.headers.get("x-signature");
      if (signed.length) {
        cfg = signed.find((c) => verifyMercadoPagoSignature({ dataId, requestId: req.headers.get("x-request-id"), header: sigHeader, secret: c.webhookSecret! }));
        if (!cfg) return deny(401, "invalid signature");
        event = await mercadoPago.fetchPayment(cfg.secret!, dataId);
      } else {
        // sem segredo de webhook: só confia no que a API do Mercado Pago confirmar
        for (const c of configs) {
          try { event = await mercadoPago.fetchPayment(c.secret!, dataId); cfg = c; break; } catch { /* tenta o outro ambiente */ }
        }
        if (!cfg) return deny(404, "payment not found");
      }
    } else {
      const token = req.headers.get("asaas-access-token");
      const withToken = configs.filter((c) => c.webhookSecret);
      cfg = withToken.length ? withToken.find((c) => verifyAsaasToken(token, c.webhookSecret!)) : configs[0];
      if (!cfg) return deny(401, "invalid token");
      const body = JSON.parse(raw) as { event?: string; payment?: { id?: string } };
      const paymentId = body.payment?.id;
      if (!paymentId || !body.event?.startsWith("PAYMENT_")) return ok({ ignored: true });
      event = await asaas.fetchPayment(cfg.secret!, cfg.environment, paymentId);
    }
  } catch (e) {
    console.error("[webhook]", provider, e instanceof Error ? e.message : e);
    return deny(502, "gateway lookup failed"); // o gateway tenta de novo
  }

  if (!event) return ok({ ignored: true });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("apply_payment_event", {
    p_gateway: provider,
    // nulos são aceitos pela função; o tipo gerado só não sabe disso
    p_tx_id: event.txId as string,
    p_gateway_payment_id: event.gatewayPaymentId as string,
    p_checkout_ref: event.checkoutRef as string,
    p_status: event.status,
    p_amount_cents: event.amountCents ?? undefined,
    p_method: event.method ?? undefined,
    p_paid_at: event.paidAt ?? undefined,
    p_raw: (event.raw ?? null) as never,
  });
  if (error) {
    console.error("[webhook] apply", provider, error.message);
    return deny(500, "apply failed");
  }
  return ok({ result: (data as { result?: string } | null)?.result ?? null });
}

export function GET() {
  return NextResponse.json({ ok: true });
}
