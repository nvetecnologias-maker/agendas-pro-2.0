import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requirePanelAction } from "@/lib/panel/context";
import { StatCard } from "@/components/panel/page-header";
import { ProfessionalDetailClient } from "@/components/panel/professional-detail-client";
import { BlocksManager } from "@/components/panel/blocks-manager";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatDayShort, toLocalDay, toLocalTime, todayLocal, startOfMonth, zonedToUtc } from "@/lib/datetime";
import { STATUS_META } from "@/lib/appointments/status";
import { rowsToWeek } from "@/lib/schedule";

export const metadata: Metadata = { title: "Profissional · Agendas Pro" };

export default async function ProfessionalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const panel = await requirePanelAction("professionals.manage");
  const { supabase, shop, tz } = panel;

  const monthStart = zonedToUtc(startOfMonth(todayLocal(tz)), "00:00", tz).toISOString();
  const [{ data: pro }, services, links, hours, blocks, recent, monthAppts, monthPay] = await Promise.all([
    supabase.from("professionals").select("*").eq("id", id).eq("barbershop_id", shop.id).maybeSingle(),
    supabase.from("services").select("id, name, is_active").eq("barbershop_id", shop.id).order("sort_order"),
    supabase.from("professional_services").select("service_id").eq("professional_id", id),
    supabase.from("working_hours").select("weekday, starts_at, ends_at").eq("barbershop_id", shop.id).eq("professional_id", id),
    supabase.from("time_blocks").select("id, professional_id, kind, starts_at, ends_at, reason").eq("barbershop_id", shop.id).eq("professional_id", id)
      .gte("ends_at", new Date().toISOString()).order("starts_at"),
    supabase.from("appointments").select("id, starts_at, status, price_cents, customer:customers(name), service:services(name)")
      .eq("professional_id", id).order("starts_at", { ascending: false }).limit(15),
    supabase.from("appointments").select("status, price_cents").eq("professional_id", id).gte("starts_at", monthStart),
    supabase.from("payments").select("amount_cents").eq("professional_id", id).eq("status", "received").gte("paid_at", monthStart),
  ]);
  if (!pro) notFound();

  const m = monthAppts.data ?? [];
  const completed = m.filter((a) => a.status === "completed").length;
  const received = (monthPay.data ?? []).reduce((s, p) => s + p.amount_cents, 0);

  return (
    <div className="grid gap-5">
      <Link href="/painel/profissionais" className="flex items-center gap-1 text-[13px] text-sky"><ChevronLeft className="size-4" /> Profissionais</Link>
      <ProfessionalDetailClient
        shopId={shop.id}
        pro={{ ...pro, serviceIds: (links.data ?? []).map((l) => l.service_id) }}
        services={services.data ?? []}
        week={hours.data?.length ? rowsToWeek(hours.data) : null}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Este mês">
        <StatCard label="Agendados no mês" value={m.filter((a) => a.status !== "cancelled").length} />
        <StatCard label="Concluídos no mês" value={completed} />
        <StatCard label="Não compareceram" value={m.filter((a) => a.status === "no_show").length} />
        <StatCard tone="brand" label="Receita recebida no mês" value={formatMoney(received)} />
      </section>

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <CardTitle>Histórico de atendimentos</CardTitle>
          <Link href={`/painel/agendamentos?view=lista&prof=${pro.id}`} className="text-[13px] text-sky">Ver agenda</Link>
        </div>
        {(recent.data ?? []).length === 0 ? (
          <p className="px-4 pb-4 text-sm text-subtle-foreground">Nenhum atendimento ainda.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {recent.data!.map((a) => (
              <li key={a.id}>
                <Link href={`/painel/agendamentos?dia=${toLocalDay(a.starts_at, tz)}&ag=${a.id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-16 shrink-0 font-mono text-[13px] text-muted-foreground">{formatDayShort(toLocalDay(a.starts_at, tz))} {toLocalTime(a.starts_at, tz)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-halo">{a.customer?.name} <span className="text-muted-foreground">· {a.service?.name}</span></span>
                  <Badge tone={STATUS_META[a.status].tone}>{STATUS_META[a.status].label}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <BlocksManager blocks={blocks.data ?? []} professionals={[{ id: pro.id, name: pro.name }]} tz={tz} fixedProfessionalId={pro.id} title="Folgas e bloqueios deste profissional" />
    </div>
  );
}
