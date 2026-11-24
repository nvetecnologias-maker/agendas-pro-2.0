import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageCircle, Phone } from "lucide-react";
import { requirePanelAction } from "@/lib/panel/context";
import { StatCard } from "@/components/panel/page-header";
import { CustomerHeaderActions } from "@/components/panel/customer-detail-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDayShort, toLocalDay, toLocalTime } from "@/lib/datetime";
import { STATUS_META, formatPhone, whatsappLink } from "@/lib/appointments/status";

export const metadata: Metadata = { title: "Cliente · Agendas Pro" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const panel = await requirePanelAction("customers.view");
  const { supabase, shop, tz } = panel;
  const [{ data: c }, { data: stats }, { data: appts }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).eq("barbershop_id", shop.id).maybeSingle(),
    supabase.from("customer_stats").select("*").eq("customer_id", id).maybeSingle(),
    supabase.from("appointments").select("id, starts_at, status, price_cents, service:services(name), professional:professionals(name)")
      .eq("customer_id", id).eq("barbershop_id", shop.id).order("starts_at", { ascending: false }).limit(50),
  ]);
  if (!c) notFound();

  return (
    <div className="grid gap-5">
      <Link href="/painel/clientes" className="flex items-center gap-1 text-[13px] text-sky"><ChevronLeft className="size-4" /> Clientes</Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={c.name} className="size-16 text-lg" />
        <div className="min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-0">
          <h1 className="truncate text-2xl font-semibold text-halo">{c.name}</h1>
          <p className="text-sm text-muted-foreground">{formatPhone(c.phone)}{c.email ? ` · ${c.email}` : ""}</p>
          <p className="text-[12px] text-subtle-foreground">Cliente desde {formatDate(c.created_at, tz)}</p>
        </div>
        {panel.can("customers.manage") && (
          <div className="w-full sm:w-auto">
            <CustomerHeaderActions customer={c} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="glass" asChild><a href={whatsappLink(c.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a></Button>
        <Button variant="glass" asChild><a href={`tel:+55${c.phone.replace(/\D/g, "")}`}><Phone /> Ligar</a></Button>
      </div>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Atendimentos" value={stats?.completed_appointments ?? 0} />
        <StatCard label="Agendamentos" value={stats?.total_appointments ?? 0} />
        <StatCard label="Último atendimento" value={stats?.last_visit_at ? formatDate(stats.last_visit_at, tz) : "—"} />
        {panel.can("finance.view") && <StatCard tone="brand" label="Total gasto" value={formatMoney(stats?.total_spent_cents ?? 0)} />}
      </section>
      {c.notes && (
        <Card padding="sm"><CardTitle className="mb-1 text-sm">Observações</CardTitle><p className="whitespace-pre-line text-sm text-muted-foreground">{c.notes}</p></Card>
      )}
      <Card padding="none" className="overflow-hidden">
        <CardTitle className="px-4 pb-2 pt-4">Histórico de agendamentos</CardTitle>
        {!appts?.length ? <p className="px-4 pb-4 text-sm text-subtle-foreground">Nenhum agendamento.</p> : (
          <ul className="divide-y divide-white/[0.05]">
            {appts.map((a) => (
              <li key={a.id}>
                <Link href={`/painel/agendamentos?dia=${toLocalDay(a.starts_at, tz)}&ag=${a.id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-20 shrink-0 font-mono text-[13px] text-muted-foreground">{formatDayShort(toLocalDay(a.starts_at, tz))} {toLocalTime(a.starts_at, tz)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-halo">{a.service?.name} <span className="text-muted-foreground">· {a.professional?.name}</span></span>
                  <Badge tone={STATUS_META[a.status].tone}>{STATUS_META[a.status].label}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
