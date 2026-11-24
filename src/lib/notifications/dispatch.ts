import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/supabase/env";
import type { Tables } from "@/types/database";

type Notification = Tables<"notifications">;
type Outcome = { status: "sent" | "failed" | "skipped_not_configured"; error?: string };

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Telefone brasileiro em formato internacional (55 + DDD + número) */
export function toE164BR(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  return null;
}

export function emailHtml(n: Pick<Notification, "title" | "body">, link: string | null, platform = "Agendas Pro") {
  return `<!doctype html><html><body style="margin:0;background:#030B20;font-family:Arial,Helvetica,sans-serif;color:#F7F3FF">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#06143a;border-radius:20px;border:1px solid #102a6b">
<tr><td style="padding:28px">
<p style="margin:0 0 18px;font-size:15px;font-weight:bold;color:#75B5FF">${escapeHtml(platform)}</p>
<h1 style="margin:0 0 10px;font-size:22px;color:#ffffff">${escapeHtml(n.title)}</h1>
${n.body ? `<p style="margin:0 0 22px;font-size:15px;line-height:1.5;color:#c9d6f5">${escapeHtml(n.body)}</p>` : ""}
${link ? `<a href="${escapeHtml(link)}" style="display:inline-block;background:#2467F2;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:15px">Abrir no painel</a>` : ""}
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#6b7ca8">Você recebe este e-mail porque é dono da barbearia. Ajuste em Configurações › Notificações.</p>
</td></tr></table></body></html>`;
}

async function sendEmail(n: Notification): Promise<Outcome> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { status: "skipped_not_configured" };
  if (!n.recipient) return { status: "failed", error: "sem destinatário" };
  const site = getSiteUrl();
  const link = n.event_type.startsWith("billing.") ? `${site}/painel/assinatura` : `${site}/painel/avisos`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": n.id },
    body: JSON.stringify({ from, to: [n.recipient], subject: n.title, html: emailHtml(n, link), text: `${n.title}\n\n${n.body ?? ""}\n\n${link}` }),
    signal: AbortSignal.timeout(15_000),
  });
  return res.ok ? { status: "sent" } : { status: "failed", error: `resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
}

/**
 * WhatsApp por um provedor HTTP genérico (Z-API, Evolution API, etc.):
 * POST {WHATSAPP_API_URL} com JSON { phone, message } e Bearer WHATSAPP_API_TOKEN.
 */
async function sendWhatsapp(n: Notification): Promise<Outcome> {
  const url = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;
  if (!url) return { status: "skipped_not_configured" };
  const phone = n.recipient ? toE164BR(n.recipient) : null;
  if (!phone) return { status: "failed", error: "telefone inválido" };
  const p = (n.payload ?? {}) as { slug?: string; token?: string };
  const manage = p.slug && p.token ? `\n\nVer ou cancelar: ${getSiteUrl()}/${p.slug}/agendamento/${p.token}` : "";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ phone, message: `${n.body ?? n.title}${manage}` }),
    signal: AbortSignal.timeout(15_000),
  });
  return res.ok ? { status: "sent" } : { status: "failed", error: `whatsapp ${res.status}` };
}

/** Processa um lote da fila de envios. Chamado pela tarefa agendada. */
export async function dispatchNotifications(limit = 50) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_notifications", { p_limit: limit });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Notification[];
  const summary = { sent: 0, failed: 0, skipped: 0 };
  for (const n of rows) {
    let out: Outcome;
    try {
      out = n.channel === "email" ? await sendEmail(n) : await sendWhatsapp(n);
    } catch (e) {
      out = { status: "failed", error: e instanceof Error ? e.message : "erro" };
    }
    await admin.rpc("finish_notification", { p_id: n.id, p_status: out.status, ...(out.error ? { p_error: out.error } : {}) });
    if (out.status === "sent") summary.sent++; else if (out.status === "failed") summary.failed++; else summary.skipped++;
  }
  return summary;
}
