import type { Metadata } from "next";
import Link from "next/link";
import {
  Ban, CalendarCheck2, CalendarClock, CheckCircle2, ChevronRight, Clock, History, Plus, TrendingUp, UserPlus, Users, Wallet,
} from "lucide-react";
import { requirePanel } from "@/lib/panel/context";
import { PageHeader, StatCard, EmptyState } from "@/components/panel/page-header";
import { PeriodTabs, resolvePeriod } from "@/components/panel/period-tabs";
import { ColumnChart, BarList } from "@/components/charts/charts";
import { SERIES } from "@/lib/chart-colors";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { formatDayLong, formatDayShort, formatDateTime, todayLocal, toLocalTime, toLocalDay } from "@/lib/datetime";
import { STATUS_META } from "@/lib/appointments/status";
import type { AppointmentStatus } from "@/types/database";

export const metadata: Metadata = { title: "Visão geral · Agendas Pro" };

type Overview = {
  today: { appointments: number; completed: number; upcoming: number; revenue_cents: number };
  month_revenue_cents: number;
  period: { appointments: number; completed: number; cancelled: number; no_show: number; expected_cents: number };
  period_revenue_cents: number;
  customers: { total: number; new: number };
  revenue_by_month: { month: string; cents: number }[];
  appointments_by_day: { day: string; count: number }[];
  top_services: { name: string; count: number; cents: number }[];
  professionals: { id: string; name: string; completed: number; booked: number; revenue_cents: number }[];
};

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const panel = await requirePanel();
  const { supabase, shop, tz } = panel;
  const period = resolvePeriod((await searchParams).periodo, tz);
  const showMoney = panel.can("finance.view");

  const [{ data: raw }, { data: upcoming }, { data: events }] = await Promise.all([
    supabase.rpc("dashboard_overview", { p_barbershop_id: shop.id, p_from: period.from, p_to: period.to }),
    supabase
      .from("appointments")
      .select("id, starts_at, status, customer:customers(name), service:services(name), professional:professionals(name)")
      .eq("barbershop_id", shop.id)
      .in("status", ["pending", "confirmed", "in_progress"])
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(6),
    supabase
      .from("appointment_events")
      .select("id, kind, to_status, created_at, appointment:appointments(id, starts_at, customer:customers(name), service:services(name))")
      .eq("barbershop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const o = raw as unknown as Overview | null;
  const firstName = panel.profile?.full_name?.split(" ")[0] ?? "";
  const today = todayLocal(tz);

  const days = o?.appointments_by_day ?? [];
  const labelEvery = days.length > 14 ? Math.ceil(days.length / 7) : 1;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Olá${firstName ? `, ${firstName}` : ""}`}
        description={<span>{formatDayLong(today)}</span>}
        actions={
          (panel.can("appointments.manage_all") || panel.can("appointments.manage_own")) && (
            <Button asChild className="max-lg:hidden">
              <Link href="/painel/agendamentos?novo=1"><Plus /> Novo agendamento</Link>
            </Button>
          )
        }
      />

      {/* Hoje */}
      <section aria-label="Hoje" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard tone="brand" label="Agendamentos hoje" value={o?.today.appointments ?? 0} icon={CalendarCheck2}
          hint={`${o?.today.upcoming ?? 0} ainda por vir`} />
        <StatCard label="Concluídos hoje" value={o?.today.completed ?? 0} icon={CheckCircle2} />
        {showMoney ? (
          <>
            <StatCard label="Recebido hoje" value={formatMoney(o?.today.revenue_cents)} icon={Wallet} />
            <StatCard label="Recebido no mês" value={formatMoneyCompact(o?.month_revenue_cents)} icon={TrendingUp} />
          </>
        ) : (
          <>
            <StatCard label="Clientes" value={o?.customers.total ?? 0} icon={Users} />
            <StatCard label="Cancelamentos" value={o?.period.cancelled ?? 0} icon={Ban} hint="no período" />
          </>
        )}
      </section>

      {/* Próximos */}
      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between px-4 pb-2 pt-4 md:px-5">
          <CardTitle className="flex items-center gap-2"><CalendarClock className="size-4 text-sky" /> Próximos atendimentos</CardTitle>
          <Link href="/painel/agendamentos" className="flex items-center text-[13px] text-sky">Agenda <ChevronRight className="size-4" /></Link>
        </div>
        {upcoming && upcoming.length > 0 ? (
          <ul className="divide-y divide-white/[0.05]">
            {upcoming.map((a) => {
              const day = toLocalDay(a.starts_at, tz);
              const meta = STATUS_META[a.status as AppointmentStatus];
              return (
                <li key={a.id}>
                  <Link href={`/painel/agendamentos?dia=${day}&ag=${a.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-white/5 md:px-5">
                    <div className="w-14 shrink-0 text-center">
                      <p className="font-mono text-[15px] font-semibold text-halo">{toLocalTime(a.starts_at, tz)}</p>
                      <p className="text-[11px] text-subtle-foreground">{day === today ? "hoje" : formatDayShort(day)}</p>
                    </div>
                    <span className={`h-10 w-1 shrink-0 rounded-full ${meta.bar}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-halo">{a.customer?.name}</p>
                      <p className="truncate text-[13px] text-muted-foreground">{a.service?.name} · {a.professional?.name}</p>
                    </div>
                    <Badge tone={meta.tone} className="max-sm:hidden">{meta.label}</Badge>
                    <ChevronRight className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 pb-5 md:px-5">
            <EmptyState icon={Clock} title="Nenhum atendimento pela frente" description="Compartilhe o link da sua agenda para receber agendamentos online." action={
              <Button asChild variant="glass" size="sm"><Link href="/painel/minha-agenda">Compartilhar minha agenda</Link></Button>
            } />
          </div>
        )}
      </Card>

      {/* Período */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-halo">Desempenho</h2>
        <PeriodTabs current={period.key} basePath="/painel" />
      </div>

      <section aria-label="Indicadores do período" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Agendamentos" value={o?.period.appointments ?? 0} />
        <StatCard label="Concluídos" value={o?.period.completed ?? 0} />
        <StatCard label="Cancelados" value={o?.period.cancelled ?? 0} hint={`${o?.period.no_show ?? 0} não compareceram`} />
        {showMoney ? (
          <StatCard label="Recebido" value={formatMoneyCompact(o?.period_revenue_cents)} hint={`previsto ${formatMoneyCompact(o?.period.expected_cents)}`} />
        ) : (
          <StatCard label="Novos clientes" value={o?.customers.new ?? 0} icon={UserPlus} />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="sm" className="md:p-5">
          <CardTitle className="mb-4">Agendamentos por dia</CardTitle>
          <ColumnChart
            ariaLabel="Agendamentos por dia"
            data={days.map((d) => ({ label: formatDayShort(d.day), fullLabel: formatDayLong(d.day), values: [d.count] }))}
            series={[{ name: "Agendamentos", color: SERIES.primary }]}
            format="int"
            labelEvery={labelEvery}
          />
        </Card>
        {showMoney && (
          <Card padding="sm" className="md:p-5">
            <CardTitle className="mb-4">Receita recebida por mês</CardTitle>
            <ColumnChart
              ariaLabel="Receita recebida nos últimos 12 meses"
              data={(o?.revenue_by_month ?? []).map((m) => {
                const [y, mm] = m.month.split("-").map(Number);
                return { label: MONTHS[mm - 1], fullLabel: `${MONTHS[mm - 1]}/${y}`, values: [m.cents] };
              })}
              series={[{ name: "Recebido", color: SERIES.primary }]}
              format="moneyCompact"
              labelEvery={2}
            />
          </Card>
        )}
        <Card padding="sm" className="md:p-5">
          <CardTitle className="mb-4">Serviços mais vendidos</CardTitle>
          <BarList
            items={(o?.top_services ?? []).map((s) => ({ label: s.name, value: s.count, hint: showMoney ? formatMoneyCompact(s.cents) : undefined }))}
            format="times"
          />
        </Card>
        <Card padding="sm" className="md:p-5">
          <CardTitle className="mb-4">Desempenho dos profissionais</CardTitle>
          <BarList
            items={(o?.professionals ?? []).map((p) => ({
              label: p.name,
              value: p.completed,
              hint: showMoney ? formatMoneyCompact(p.revenue_cents) : `${p.booked} agendados`,
            }))}
            format="completed"
          />
        </Card>
      </div>

      {/* Atividade */}
      <Card padding="sm" className="md:p-5">
        <CardTitle className="mb-3 flex items-center gap-2"><History className="size-4 text-sky" /> Atividade recente</CardTitle>
        {events && events.length > 0 ? (
          <ul className="grid gap-3">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-sky" aria-hidden />
                <div className="min-w-0">
                  <p className="text-halo">
                    {eventText(e.kind, e.to_status as AppointmentStatus | null)}{" "}
                    <span className="text-muted-foreground">· {e.appointment?.customer?.name} · {e.appointment?.service?.name}</span>
                  </p>
                  <p className="text-xs text-subtle-foreground">{formatDateTime(e.created_at, tz)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-subtle-foreground">As movimentações da agenda aparecem aqui.</p>
        )}
      </Card>
    </div>
  );
}

function eventText(kind: string, to: AppointmentStatus | null) {
  if (kind === "created") return "Novo agendamento";
  if (kind === "rescheduled") return "Agendamento remarcado";
  if (kind === "status_changed" && to) return `Status: ${STATUS_META[to].label.toLowerCase()}`;
  return "Agendamento atualizado";
}
