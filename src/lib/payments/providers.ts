import type { Enums } from "@/types/database";

export type Provider = Enums<"payment_gateway">;
export type GatewayEnv = Enums<"gateway_environment">;
export type TxStatus = Enums<"transaction_status">;

export type CheckoutInput = {
  txId: string;
  title: string;
  amountCents: number;
  methods: string[];
  customer: { name: string; email?: string | null; phone?: string | null };
  successUrl: string;
  cancelUrl: string;
  webhookUrl: string;
};
export type CheckoutResult = { url: string; checkoutRef: string };

/** Evento já normalizado e confirmado na API do gateway */
export type PaymentEvent = {
  txId: string | null;
  gatewayPaymentId: string | null;
  checkoutRef: string | null;
  status: TxStatus;
  amountCents: number | null;
  method: string | null;
  paidAt: string | null;
  raw: unknown;
};

export class GatewayError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const asUuid = (v: unknown): string | null => (typeof v === "string" && UUID.test(v) ? v : null);
const cents = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) : null);

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000), cache: "no-store" });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = typeof body === "object" && body && "message" in body ? String((body as { message: unknown }).message)
      : typeof body === "object" && body && "errors" in body ? JSON.stringify((body as { errors: unknown }).errors).slice(0, 300)
      : `HTTP ${res.status}`;
    throw new GatewayError(msg, res.status);
  }
  return body as T;
}

// ---------------------------------------------------------------- status
export function mapMercadoPagoStatus(s: string | undefined): TxStatus {
  switch (s) {
    case "approved": return "approved";
    case "rejected": return "refused";
    case "refunded": case "charged_back": return "refunded";
    case "cancelled": return "canceled";
    default: return "pending";
  }
}
export function mapAsaasStatus(s: string | undefined): TxStatus {
  switch (s) {
    case "RECEIVED": case "CONFIRMED": case "RECEIVED_IN_CASH": return "approved";
    case "REFUNDED": case "REFUND_REQUESTED": case "CHARGEBACK_REQUESTED": case "CHARGEBACK_DISPUTE": return "refunded";
    case "OVERDUE": return "refused";
    default: return "pending";
  }
}
const MP_METHOD: Record<string, string> = { credit_card: "credit_card", debit_card: "credit_card", bank_transfer: "pix", ticket: "boleto" };
const ASAAS_METHOD: Record<string, string> = { PIX: "pix", CREDIT_CARD: "credit_card", BOLETO: "boleto", DEBIT_CARD: "credit_card" };

// ---------------------------------------------------------------- Mercado Pago
export const mercadoPago = {
  async createCheckout(token: string, env: GatewayEnv, i: CheckoutInput): Promise<CheckoutResult> {
    const excluded = [
      ...(i.methods.includes("credit_card") ? [] : [{ id: "credit_card" }, { id: "debit_card" }]),
      ...(i.methods.includes("boleto") ? [] : [{ id: "ticket" }]),
      ...(i.methods.includes("pix") ? [] : [{ id: "bank_transfer" }]),
    ];
    const pref = await call<{ id: string; init_point: string; sandbox_init_point?: string }>("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": i.txId },
      body: JSON.stringify({
        items: [{ id: i.txId, title: i.title, quantity: 1, unit_price: i.amountCents / 100, currency_id: "BRL" }],
        payer: { name: i.customer.name, email: i.customer.email ?? undefined },
        external_reference: i.txId,
        notification_url: i.webhookUrl,
        back_urls: { success: i.successUrl, failure: i.cancelUrl, pending: i.successUrl },
        auto_return: "approved",
        payment_methods: { excluded_payment_types: excluded, installments: 1 },
        statement_descriptor: "AGENDAS PRO",
      }),
    });
    const url = env === "sandbox" ? pref.sandbox_init_point ?? pref.init_point : pref.init_point;
    return { url, checkoutRef: pref.id };
  },
  async fetchPayment(token: string, paymentId: string): Promise<PaymentEvent> {
    const p = await call<Record<string, unknown>>(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      txId: asUuid(p.external_reference),
      gatewayPaymentId: String(p.id ?? paymentId),
      checkoutRef: null,
      status: mapMercadoPagoStatus(p.status as string),
      amountCents: cents(p.transaction_amount),
      method: MP_METHOD[String(p.payment_type_id)] ?? null,
      paidAt: (p.date_approved as string | null) ?? null,
      raw: { id: p.id, status: p.status, status_detail: p.status_detail, payment_type_id: p.payment_type_id },
    };
  },
};

// ---------------------------------------------------------------- Asaas
const asaasBase = (env: GatewayEnv) => (env === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3");
export const asaas = {
  async createCheckout(token: string, env: GatewayEnv, i: CheckoutInput): Promise<CheckoutResult> {
    const billingType = i.methods.length === 1 ? ({ pix: "PIX", credit_card: "CREDIT_CARD", boleto: "BOLETO" } as Record<string, string>)[i.methods[0]] : "UNDEFINED";
    const link = await call<{ id: string; url: string }>(`${asaasBase(env)}/paymentLinks`, {
      method: "POST",
      headers: { access_token: token, "Content-Type": "application/json", "User-Agent": "AgendasPro" },
      body: JSON.stringify({
        name: i.title.slice(0, 100),
        description: `Assinatura ${i.title}`.slice(0, 500),
        value: i.amountCents / 100,
        billingType,
        chargeType: "DETACHED",
        dueDateLimitDays: 3,
        maxInstallmentCount: 1,
        externalReference: i.txId,
        notificationEnabled: false,
        callback: { successUrl: i.successUrl, autoRedirect: true },
      }),
    });
    return { url: link.url, checkoutRef: link.id };
  },
  async fetchPayment(token: string, env: GatewayEnv, paymentId: string): Promise<PaymentEvent> {
    const p = await call<Record<string, unknown>>(`${asaasBase(env)}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { access_token: token, "User-Agent": "AgendasPro" },
    });
    return {
      txId: asUuid(p.externalReference),
      gatewayPaymentId: String(p.id ?? paymentId),
      checkoutRef: typeof p.paymentLink === "string" ? p.paymentLink : null,
      status: mapAsaasStatus(p.status as string),
      amountCents: cents(p.value),
      method: ASAAS_METHOD[String(p.billingType)] ?? null,
      paidAt: (p.clientPaymentDate as string | null) ?? (p.paymentDate as string | null) ?? null,
      raw: { id: p.id, status: p.status, billingType: p.billingType, paymentLink: p.paymentLink },
    };
  },
};

// ---------------------------------------------------------------- Stripe
function form(obj: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) u.append(k, String(v));
  return u.toString();
}
export const stripe = {
  async createCheckout(token: string, i: CheckoutInput): Promise<CheckoutResult> {
    const methods = i.methods.filter((m) => m === "credit_card" || m === "pix").map((m) => (m === "credit_card" ? "card" : "pix"));
    const body: Record<string, string | number | undefined> = {
      mode: "payment",
      success_url: i.successUrl,
      cancel_url: i.cancelUrl,
      client_reference_id: i.txId,
      "metadata[tx]": i.txId,
      "payment_intent_data[metadata][tx]": i.txId,
      customer_email: i.customer.email ?? undefined,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "brl",
      "line_items[0][price_data][unit_amount]": i.amountCents,
      "line_items[0][price_data][product_data][name]": i.title,
      locale: "pt-BR",
    };
    (methods.length ? methods : ["card"]).forEach((m, idx) => { body[`payment_method_types[${idx}]`] = m; });
    const s = await call<{ id: string; url: string }>("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": i.txId },
      body: form(body),
    });
    return { url: s.url, checkoutRef: s.id };
  },
  /** Converte um evento (já com assinatura verificada) em evento de pagamento */
  parseEvent(event: { type?: string; data?: { object?: Record<string, unknown> } }): PaymentEvent | null {
    const o = event.data?.object ?? {};
    const meta = (o.metadata ?? {}) as Record<string, unknown>;
    const base = {
      txId: asUuid(o.client_reference_id) ?? asUuid(meta.tx),
      amountCents: typeof o.amount_total === "number" ? o.amount_total : typeof o.amount === "number" ? o.amount : null,
      raw: { id: o.id, type: event.type, payment_status: o.payment_status },
    };
    const pi = typeof o.payment_intent === "string" ? o.payment_intent : null;
    switch (event.type) {
      case "checkout.session.completed":
        return { ...base, gatewayPaymentId: pi, checkoutRef: String(o.id), status: o.payment_status === "paid" ? "approved" : "pending",
          method: null, paidAt: o.payment_status === "paid" ? new Date().toISOString() : null };
      case "checkout.session.async_payment_succeeded":
        return { ...base, gatewayPaymentId: pi, checkoutRef: String(o.id), status: "approved", method: "pix", paidAt: new Date().toISOString() };
      case "checkout.session.async_payment_failed":
        return { ...base, gatewayPaymentId: pi, checkoutRef: String(o.id), status: "refused", method: null, paidAt: null };
      case "checkout.session.expired":
        return { ...base, gatewayPaymentId: pi, checkoutRef: String(o.id), status: "canceled", method: null, paidAt: null };
      case "charge.refunded":
        return { ...base, txId: asUuid(meta.tx), gatewayPaymentId: pi, checkoutRef: null, status: "refunded", method: null, paidAt: null };
      default:
        return null;
    }
  },
};
