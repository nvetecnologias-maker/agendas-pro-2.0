import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchNotifications } from "@/lib/notifications/dispatch";
import { hasServiceRole } from "@/lib/payments/server";
import { safeEqual } from "@/lib/payments/signatures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tarefa agendada (Vercel Cron ou qualquer agendador): manutenção das
 * assinaturas, lembretes de horário e envio da fila de e-mail/WhatsApp.
 * Protegida por `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasServiceRole()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY ausente" }, { status: 503 });

  const admin = createAdminClient();
  const [maintenance, reminders] = await Promise.all([
    admin.rpc("run_subscription_maintenance"),
    admin.rpc("enqueue_appointment_reminders"),
  ]);
  const sent = await dispatchNotifications(80).catch((e: Error) => ({ error: e.message }));
  return NextResponse.json({
    maintenance: maintenance.error ? { error: maintenance.error.message } : maintenance.data,
    reminders: reminders.error ? { error: reminders.error.message } : reminders.data,
    notifications: sent,
  });
}
