import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bell, CalendarCheck2, CalendarX2, CreditCard, TriangleAlert } from "lucide-react";
import { requirePanel } from "@/lib/panel/context";
import { PageHeader, EmptyState } from "@/components/panel/page-header";
import { MarkAllRead } from "@/components/panel/mark-all-read";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Avisos · Agendas Pro" };

const ICON: Record<string, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  "appointment.created": { icon: CalendarCheck2, tone: "text-sky bg-electric/15" },
  "appointment.cancelled": { icon: CalendarX2, tone: "text-warning bg-warning/10" },
  "billing.payment_approved": { icon: CreditCard, tone: "text-success bg-success/10" },
  "billing.payment_failed": { icon: TriangleAlert, tone: "text-danger bg-danger/10" },
};

function linkFor(eventType: string, payload: unknown): string | null {
  const p = (payload ?? {}) as Record<string, unknown>;
  if (eventType.startsWith("appointment.") && typeof p.appointment_id === "string") return `/painel/agendamentos?ag=${p.appointment_id}`;
  if (eventType.startsWith("billing.")) return "/painel/assinatura";
  return null;
}

export default async function NoticesPage() {
  const panel = await requirePanel();
  if (panel.role !== "owner" && panel.role !== "admin") notFound();
  const { data } = await panel.supabase.from("notifications")
    .select("id, event_type, title, body, payload, read_at, created_at")
    .eq("barbershop_id", panel.shop.id).eq("channel", "in_app")
    .order("created_at", { ascending: false }).limit(60);
  const rows = data ?? [];
  const unread = rows.filter((r) => !r.read_at).length;

  return (
    <div className="grid gap-5">
      <PageHeader title="Avisos" description={unread ? `${unread} não lido(s)` : "Tudo em dia"}
        actions={unread ? <MarkAllRead shopId={panel.shop.id} /> : null} />
      {rows.length === 0 ? (
        <EmptyState icon={Bell} title="Nenhum aviso ainda" description="Novas reservas pela sua página, cancelamentos e pagamentos aparecem aqui." />
      ) : (
        <ul className="grid gap-2">
          {rows.map((n) => {
            const meta = ICON[n.event_type] ?? { icon: Bell, tone: "text-halo bg-white/[0.06]" };
            const href = linkFor(n.event_type, n.payload);
            const body = (
              <div className={cn("flex items-start gap-3 rounded-2xl border p-3.5", n.read_at ? "border-white/[0.06] bg-surface-1/60" : "border-sky/20 bg-surface-1")}>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", meta.tone)}><meta.icon className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[15px] font-medium text-halo">
                    {n.title}
                    {!n.read_at && <span className="size-2 rounded-full bg-sky" aria-label="Não lido" />}
                  </p>
                  {n.body && <p className="text-[13px] text-muted-foreground">{n.body}</p>}
                  <p className="mt-0.5 text-[12px] text-subtle-foreground">{formatDateTime(n.created_at, panel.tz)}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{href ? <Link href={href}>{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
