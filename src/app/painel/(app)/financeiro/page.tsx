import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requirePanelAction } from "@/lib/panel/context";
import { PageHeader, StatCard } from "@/components/panel/page-header";
import { PeriodTabs, resolvePeriod } from "@/components/panel/period-tabs";
import { ColumnChart, BarList } from "@/components/charts/charts";
import { SERIES } from "@/lib/chart-colors";
import { FinancePayments } from "@/components/panel/finance-client";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { addDays, formatDayLong, formatDayShort, zonedToUtc } from "@/lib/datetime";
import { METHOD_LABEL } from "@/lib/appointments/status";
import type { PaymentMethod } from "@/types/database";

export const metadata: Metadata = { title: "Financeiro · Agendas Pro" };

type Finance = {
  day_cents: number; week_cents: number; month_cents: number; year_cents: number;
  period: { received_cents: number; payments: number; avg_ticket_cents: number };
  expected: { cents: number; services: number; open_cents: number };
  by_method: { method: PaymentMethod; cents: number }[];
  by_professional: { id: string; name: string; cents: number; count: number }[];
  by_day: { day: string; received: number; expected: number }[];
};

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const panel = await requirePanelAction("finance.view");
  const { supabase, shop, tz } = panel;
  const period = resolvePeriod((await searchParams).periodo, tz);

  const [{ data: raw }, { data: payments }, { data: services }, { data: pros }] = await Promise.all([
    supabase.rpc("finance_overview", { p_barbershop_id: shop.id, p_from: period.from, p_to: period.to }),
    supabase
      .from("payments")
      .select("id, amount_cents, method, status, paid_at, notes, customer:customers(name), service:services(name), professional:professionals(name)")
      .eq("barbershop_id", shop.id)
      .gte("paid_at", zonedToUtc(period.from, "00:00", tz).toISOString())
      .lt("paid_at", zonedToUtc(addDays(period.to, 1), "00:00", tz).toISOString())
      .order("paid_at", { ascending: false })
      .limit(100),
    supabase.from("services").select("id, name").eq("barbershop_id", shop.id).order("sort_order"),
    supabase.from("professionals").select("id, name").eq("barbershop_id", shop.id).order("sort_order"),
  ]);
  const f = raw as unknown as Finance | null;
  const days = f?.by_day ?? [];
  // períodos longos: agrega por mês para o gráfico continuar legível
  const chart = days.length > 62
    ? Object.values(days.reduce<Record<string, { label: string; fullLabel: string; values: number[] }>>((acc, d) => {
        const k = d.day.slice(0, 7);
        acc[k] ??= { label: k.slice(5) + "/" + k.slice(2, 4), fullLabel: k, values: [0, 0] };
        acc[k].values[0] += d.received;
        acc[k].values[1] += d.expected;
        return acc;
      }, {}))
    : days.map((d) => ({ label: formatDayShort(d.day), fullLabel: formatDayLong(d.day), values: [d.received, d.expected] }));

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Financeiro"
        description="Recebido é o que entrou de fato. Previsto é o valor dos agendamentos."
        actions={
          <Button variant="subtle" size="sm" asChild>
            <a href={`/painel/financeiro/exportar?de=${period.from}&ate=${period.to}`} download><Download /> Exportar CSV</a>
          </Button>
        }
      />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Recebido">
        <StatCard tone="brand" label="Hoje" value={formatMoney(f?.day_cents)} />
        <StatCard label="Esta semana" value={formatMoneyCompact(f?.week_cents)} />
        <StatCard label="Este mês" value={formatMoneyCompact(f?.month_cents)} />
        <StatCard label="Este ano" value={formatMoneyCompact(f?.year_cents)} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-halo">Período</h2>
        <PeriodTabs current={period.key} basePath="/painel/financeiro" />
      </div>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Recebido" value={formatMoneyCompact(f?.period.received_cents)} hint={`${f?.period.payments ?? 0} pagamento(s)`} />
        <StatCard label="Previsto" value={formatMoneyCompact(f?.expected.cents)} hint="agendamentos não cancelados" />
        <StatCard label="Ticket médio" value={formatMoney(f?.period.avg_ticket_cents)} />
        <StatCard label="Em aberto" value={formatMoneyCompact(f?.expected.open_cents)} hint={`${f?.expected.services ?? 0} serviço(s) concluído(s)`} />
      </section>

      <Card padding="sm" className="md:p-5">
        <CardTitle className="mb-4">Recebido x previsto</CardTitle>
        <ColumnChart
          ariaLabel="Recebido e previsto por dia"
          data={chart}
          series={[{ name: "Recebido", color: SERIES.primary }, { name: "Previsto", color: SERIES.secondary }]}
          format="moneyCompact"
          labelEvery={chart.length > 14 ? Math.ceil(chart.length / 7) : 1}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="sm" className="md:p-5">
          <CardTitle className="mb-4">Por forma de pagamento</CardTitle>
          <BarList items={(f?.by_method ?? []).map((m) => ({ label: METHOD_LABEL[m.method], value: m.cents }))} format="money" />
        </Card>
        <Card padding="sm" className="md:p-5">
          <CardTitle className="mb-4">Receita por profissional</CardTitle>
          <BarList items={(f?.by_professional ?? []).map((p) => ({ label: p.name, value: p.cents, hint: `${p.count}×` }))} format="money" />
        </Card>
      </div>

      <FinancePayments
        tz={tz}
        canManage={panel.can("finance.manage")}
        payments={(payments ?? []).map((p) => ({
          id: p.id, amount_cents: p.amount_cents, method: p.method, status: p.status, paid_at: p.paid_at, notes: p.notes,
          customer: p.customer?.name ?? null, service: p.service?.name ?? null, professional: p.professional?.name ?? null,
        }))}
        services={services ?? []}
        professionals={pros ?? []}
      />
    </div>
  );
}
