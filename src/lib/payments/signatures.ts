import { createHmac, timingSafeEqual } from "node:crypto";

/** Comparação em tempo constante de duas strings (hex ou texto) */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/**
 * Stripe: cabeçalho `Stripe-Signature: t=...,v1=...`. Assina `${t}.${corpo}`
 * com o signing secret (whsec_...). Rejeita assinaturas com mais de 5 minutos.
 */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!t || !/^\d+$/.test(t) || sigs.length === 0) return false;
  if (Math.abs(nowSec - Number(t)) > toleranceSec) return false;
  const expected = hmacHex(secret, `${t}.${rawBody}`);
  return sigs.some((s) => safeEqual(s, expected));
}

/**
 * Mercado Pago: cabeçalho `x-signature: ts=...,v1=...` e `x-request-id`.
 * Manifesto: `id:{data.id};request-id:{x-request-id};ts:{ts};` (data.id em minúsculas
 * quando alfanumérico), HMAC-SHA256 com a "assinatura secreta" do painel.
 */
export function verifyMercadoPagoSignature(opts: { dataId: string | null; requestId: string | null; header: string | null; secret: string }): boolean {
  const { dataId, requestId, header, secret } = opts;
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=").map((x) => x.trim()) as [string, string]));
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  let manifest = "";
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  return safeEqual(v1, hmacHex(secret, manifest));
}

/** Asaas: token fixo configurado no webhook, enviado em `asaas-access-token` */
export function verifyAsaasToken(header: string | null, secret: string): boolean {
  return !!header && !!secret && safeEqual(header, secret);
}
