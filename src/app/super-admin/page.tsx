import Link from "next/link";
import { AlertTriangle, Building2, CalendarCheck2, ChevronRight, Hourglass, TrendingUp, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard } from "@/components/panel/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ColumnChart, BarList } from "@/components/charts/charts";
import { SERIES } from "@/lib/chart-colors";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { formatDate, formatDayShort, formatDayLong } from "@/lib/datetime";
import { SUB_STATUS_LABEL } from "@/lib/admin/labels";
import type { Enums } from "@/types/database";

type Overview = {
  shops: { total: number; active: number; suspended: number; published: number; new_30d: number };
  subscriptions: Partial<Record<Enums<"subscription_status">, number>>;
  mrr_cents: number;
  trials_expiring_7d: number;
  churn_30d: number;
  users: number;
  appointments_30d: number;
  public_bookings_30d: number;
  revenue_by_month: { month: string; cents: number }[];
  signups_by_day: { day: string; count: number }[];
  plans: { name: string; count: number }[];
  expiring: { id: string; name: string; slug: string; status: Enums<"subscription_status">; current_period_end: string; plan_name: string }[];
};

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_overview");
  const o = data as unknown as Overview | null;
  if (!o) return <p className="text-muted-foreground">Não foi possível carregar a visão geral.</p>;
  const subs = o.subscriptions;
  const paying = (subs.active ?? 0);

  return (
    <div className="grid gap-6">
      <PageHeader title="Visão geral" description="Saúde da plataforma em tempo real" />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard tone="brand" label="Receita recorrente (MRR)" value={formatMoneyCompact(o.mrr_cents)} hint={`${paying} assinatura(s) paga(s)`} icon={TrendingUp} />
        <StatCard label="Barbearias" value={o.shops.total} hint={`+${o.shops.new_30d} em 30 dias`} icon={Building2} />
        <StatCard label="Em teste" value={subs.trial ?? 0} hint={`${o.trials_expiring_7d} vencem em 7 dias`} icon={Hourglass} />
        <StatCard label="Agendamentos 30d" value={o.appointments_30d} hint={`${o.public_bookings_30d} pela página pública`} icon={CalendarCheck2} />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(["active", "trial", "pending", "past_due", "suspended", "canceled"] as const).map((k) => (
          <Link key={k} href={`/super-admin/barbearias?assinatura=${k}`}
            className="rounded-2xl border border-white/[0.07] bg-surface-1 p-3 transition hover:border-white/15">
            <p className="text-[12px] text-muted-foreground">{SUB_STATUS_LABEL[k].label}</p>
            <p className="mt-1 font-mono text-xl font-semibold text-halo">{subs[k] ?? 0}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">Novas barbearias por dia</CardTitle>
          <ColumnChart ariaLabel="Novas barbearias nos últimos 30 dias"
            data={o.signups_by_day.map((d) => ({ label: formatDayShort(d.day), fullLabel: formatDayLong(d.day), values: [d.count] }))}
            series={[{ name: "Cadastros", color: SERIES.primary }]} format="int" labelEvery={6} />
        </Card>
        <Card>
          <CardTitle className="mb-4">Receita de assinaturas por mês</CardTitle>
          <ColumnChart ariaLabel="Receita de assinaturas nos últimos 12 meses"
            data={o.revenue_by_month.map((m) => {
              const [y, mm] = m.month.split("-").map(Number);
              return { label: MONTHS[mm - 1], fullLabel: `${MONTHS[mm - 1]}/${y}`, values: [m.cents] };
            })}
            series={[{ name: "Recebido", color: SERIES.primary }]} format="moneyCompact" labelEvery={2} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardTitle className="mb-4">Barbearias por plano</CardTitle>
          <BarList items={o.plans.map((p) => ({ label: p.name, value: p.count }))} format="int" emptyText="Nenhuma assinatura vigente" />
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4 text-center">
            <div><p className="font-mono text-lg text-halo">{o.users}</p><p className="text-[12px] text-muted-foreground">usuários</p></div>
            <div><p className="font-mono text-lg text-halo">{o.shops.published}</p><p className="text-[12px] text-muted-foreground">agendas publicadas</p></div>
            <div><p className="font-mono text-lg text-halo">{o.churn_30d}</p><p className="text-[12px] text-muted-foreground">cancelamentos 30d</p></div>
          </div>
        </Card>
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center gap-2 px-4 pb-2 pt-4">
            <AlertTriangle className="size-4 text-warning" />
            <CardTitle>Vencendo nos próximos 7 dias</CardTitle>
          </div>
          {o.expiring.length === 0 ? (
            <p className="px-4 pb-5 text-sm text-subtle-foreground">Nenhuma assinatura vencendo.</p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {o.expiring.map((e) => (
                <li key={e.id}>
                  <Link href={`/super-admin/barbearias/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-halo">{e.name}</p>
                      <p className="text-[12px] text-subtle-foreground">{e.plan_name} · vence {formatDate(e.current_period_end)}</p>
                    </div>
                    <Badge tone={SUB_STATUS_LABEL[e.status].tone}>{SUB_STATUS_LABEL[e.status].label}</Badge>
                    <ChevronRight className="size-4 text-subtle-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <p className="flex items-center gap-1.5 text-[12px] text-subtle-foreground"><Users className="size-3.5" /> MRR considera assinaturas ativas, com valor mensal equivalente. Total recebido: {formatMoney(o.revenue_by_month.reduce((s, m) => s + m.cents, 0))} em 12 meses.</p>
    </div>
  );
}
