import type { Metadata } from "next";
import { requirePanelAction } from "@/lib/panel/context";
import { PageHeader, StatCard } from "@/components/panel/page-header";
import { SubscriptionClient } from "@/components/panel/subscription-client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { PERIOD_LABEL } from "@/lib/format";
import { SUB_STATUS } from "@/lib/subscription";

export const metadata: Metadata = { title: "Minha assinatura · Agendas Pro" };


const EVENT_LABEL: Record<string, string> = {
  created: "Assinatura criada", plan_changed: "Plano alterado", renewed: "Renovada", days_granted: "Dias concedidos",
  suspended: "Suspensa", reactivated: "Reativada", canceled: "Cancelada", expired: "Expirada", payment_failed: "Falha no pagamento",
  payment_approved: "Pagamento aprovado", cancel_scheduled: "Cancelamento agendado",
};

export default async function SubscriptionPage() {
  const panel = await requirePanelAction("subscription.view");
  const { supabase, shop, tz, subscription: sub } = panel;
  const [plans, features, events, tx] = await Promise.all([
    supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("plan_features").select("*").order("sort_order"),
    sub ? supabase.from("subscription_events").select("*").eq("subscription_id", sub.id).order("created_at", { ascending: false }).limit(20) : { data: [] },
    supabase.from("payment_transactions").select("*").eq("barbershop_id", shop.id).order("created_at", { ascending: false }).limit(20),
  ]);

  const end = sub ? new Date(sub.current_period_end) : null;
  const daysLeft = end ? Math.ceil((end.getTime() - Date.now()) / 86_400_000) : 0;
  const st = sub ? SUB_STATUS[sub.status] : null;

  return (
    <div className="grid gap-5">
      <PageHeader title="Minha assinatura" />
      {sub && daysLeft <= 5 && ["trial", "active", "past_due"].includes(sub.status) && (
        <Alert tone={daysLeft <= 0 ? "danger" : "warning"} title={daysLeft <= 0 ? "Sua assinatura venceu" : `Faltam ${daysLeft} dia(s) para o vencimento`}>
          {sub.status === "trial" ? "Escolha um plano para continuar usando sem interrupção." : "Renove para manter o acesso completo."}
        </Alert>
      )}
      {sub?.cancel_at_period_end && <Alert tone="info" title="Cancelamento agendado">O acesso continua até {formatDate(sub.current_period_end, tz)}. Seus dados ficam preservados.</Alert>}

      {sub && st ? (
        <section className="relative overflow-hidden rounded-[28px] border border-sky/20 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(36,103,242,0.4),rgba(2,0,111,0.5)_50%,rgba(3,11,32,0.9))] p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={st.tone} dot>{st.label}</Badge>
          </div>
          <p className="mt-3 text-[13px] text-halo/70">Plano atual</p>
          <p className="text-3xl font-semibold text-white">{sub.plan?.name ?? "—"}</p>
          <p className="mt-1 font-mono text-halo/80">{formatMoney(sub.amount_cents)}{PERIOD_LABEL[sub.billing_period].short}</p>
        </section>
      ) : (
        <Alert tone="warning" title="Nenhuma assinatura ativa">Escolha um plano abaixo para voltar a operar. Seus dados estão preservados.</Alert>
      )}

      {sub && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Contratado em" value={formatDate(sub.started_at, tz)} />
          <StatCard label={sub.status === "trial" ? "Teste termina em" : "Vencimento"} value={formatDate(sub.current_period_end, tz)} />
          <StatCard label="Próxima cobrança" value={sub.next_billing_at ? formatDate(sub.next_billing_at, tz) : "—"} />
          <StatCard tone="brand" label="Dias restantes" value={Math.max(0, daysLeft)} />
        </section>
      )}

      <SubscriptionClient
        currentPlanId={sub?.plan_id ?? null}
        status={sub?.status ?? null}
        cancelScheduled={!!sub?.cancel_at_period_end}
        canManage={panel.can("subscription.manage")}
        plans={(plans.data ?? []).map((p) => ({
          ...p,
          features: (features.data ?? []).filter((f) => f.plan_id === p.id && f.enabled && f.label).map((f) => f.label as string),
        }))}
      />

      <Card padding="none" className="overflow-hidden">
        <CardTitle className="px-4 pb-2 pt-4">Histórico de pagamentos</CardTitle>
        {!tx.data?.length ? <p className="px-4 pb-4 text-sm text-subtle-foreground">Nenhum pagamento ainda.</p> : (
          <ul className="divide-y divide-white/[0.05]">
            {tx.data.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-halo">{formatDateTime(t.paid_at ?? t.created_at, tz)} <span className="text-muted-foreground">· {t.method ?? t.gateway}</span></span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-halo">{formatMoney(t.amount_cents)}</span>
                  <Badge tone={t.status === "approved" ? "success" : t.status === "pending" ? "warning" : "neutral"}>
                    {{ approved: "Aprovado", pending: "Pendente", refused: "Recusado", refunded: "Estornado", canceled: "Cancelado" }[t.status]}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {!!events.data?.length && (
        <Card padding="sm">
          <CardTitle className="mb-3">Movimentações da assinatura</CardTitle>
          <ol className="grid gap-2 border-l border-white/10 pl-4">
            {events.data.map((e) => (
              <li key={e.id} className="relative text-[13px]">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-sky" aria-hidden />
                <p className="text-halo">{EVENT_LABEL[e.event_type] ?? e.event_type}</p>
                <p className="text-subtle-foreground">{formatDateTime(e.created_at, tz)}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
