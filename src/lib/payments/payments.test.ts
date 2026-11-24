import { describe, expect, it } from "vitest";
import { hmacHex, verifyAsaasToken, verifyMercadoPagoSignature, verifyStripeSignature } from "./signatures";
import { mapAsaasStatus, mapMercadoPagoStatus, stripe } from "./providers";
import { toE164BR, emailHtml } from "@/lib/notifications/dispatch";

describe("assinaturas de webhook", () => {
  it("Stripe: aceita assinatura válida e recusa adulterada ou antiga", () => {
    const body = '{"id":"evt_1"}';
    const t = 1_700_000_000;
    const sig = `t=${t},v1=${hmacHex("whsec_x", `${t}.${body}`)}`;
    expect(verifyStripeSignature(body, sig, "whsec_x", t + 10)).toBe(true);
    expect(verifyStripeSignature(body + " ", sig, "whsec_x", t + 10)).toBe(false);
    expect(verifyStripeSignature(body, sig, "outro", t + 10)).toBe(false);
    expect(verifyStripeSignature(body, sig, "whsec_x", t + 1000)).toBe(false);
    expect(verifyStripeSignature(body, null, "whsec_x", t)).toBe(false);
  });
  it("Mercado Pago: monta o manifesto oficial", () => {
    const ts = "1704908010";
    const v1 = hmacHex("seg", `id:123abc;request-id:req-1;ts:${ts};`);
    expect(verifyMercadoPagoSignature({ dataId: "123ABC", requestId: "req-1", header: `ts=${ts},v1=${v1}`, secret: "seg" })).toBe(true);
    expect(verifyMercadoPagoSignature({ dataId: "999", requestId: "req-1", header: `ts=${ts},v1=${v1}`, secret: "seg" })).toBe(false);
    expect(verifyMercadoPagoSignature({ dataId: "123abc", requestId: "req-1", header: null, secret: "seg" })).toBe(false);
  });
  it("Asaas: token exato", () => {
    expect(verifyAsaasToken("abc", "abc")).toBe(true);
    expect(verifyAsaasToken("abd", "abc")).toBe(false);
    expect(verifyAsaasToken(null, "abc")).toBe(false);
  });
});

describe("status dos gateways", () => {
  it("normaliza", () => {
    expect(mapMercadoPagoStatus("approved")).toBe("approved");
    expect(mapMercadoPagoStatus("rejected")).toBe("refused");
    expect(mapMercadoPagoStatus("in_process")).toBe("pending");
    expect(mapAsaasStatus("RECEIVED")).toBe("approved");
    expect(mapAsaasStatus("CONFIRMED")).toBe("approved");
    expect(mapAsaasStatus("REFUNDED")).toBe("refunded");
  });
  it("Stripe: sessão paga vira aprovada com nossa referência", () => {
    const tx = "6f1c2a1e-1b2c-4d3e-8f90-123456789abc";
    const e = stripe.parseEvent({ type: "checkout.session.completed", data: { object: { id: "cs_1", client_reference_id: tx, payment_status: "paid", payment_intent: "pi_1", amount_total: 9990 } } });
    expect(e).toMatchObject({ txId: tx, status: "approved", gatewayPaymentId: "pi_1", amountCents: 9990 });
    expect(stripe.parseEvent({ type: "customer.created", data: { object: {} } })).toBeNull();
    const bad = stripe.parseEvent({ type: "checkout.session.completed", data: { object: { id: "cs_2", client_reference_id: "x'; drop", payment_status: "paid" } } });
    expect(bad?.txId).toBeNull();
  });
});

describe("notificações", () => {
  it("telefone em formato internacional", () => {
    expect(toE164BR("(11) 98888-7777")).toBe("5511988887777");
    expect(toE164BR("5511988887777")).toBe("5511988887777");
    expect(toE164BR("123")).toBeNull();
  });
  it("e-mail escapa HTML", () => {
    expect(emailHtml({ title: "<b>x</b>", body: "a & b" }, null)).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
