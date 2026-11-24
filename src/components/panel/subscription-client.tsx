"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { PERIOD_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Plan, SubscriptionStatus } from "@/types/database";
import { cancelSubscriptionAction, startCheckoutAction } from "@/app/painel/(app)/assinatura/actions";

export function SubscriptionClient({
  plans, currentPlanId, status, cancelScheduled, canManage,
}: {
  plans: (Plan & { features: string[] })[];
  currentPlanId: string | null;
  status: SubscriptionStatus | null;
  cancelScheduled: boolean;
  canManage: boolean;
}) {
  const [coupon, setCoupon] = React.useState("");
  const [pending, start] = React.useTransition();
  const [busyPlan, setBusyPlan] = React.useState<string | null>(null);
  const current = plans.find((p) => p.id === currentPlanId);

  const checkout = (slug: string) => {
    setBusyPlan(slug);
    start(async () => {
      const r = await startCheckoutAction(slug, coupon.trim() || undefined);
      setBusyPlan(null);
      if (r.ok && r.data?.url) window.location.href = r.data.url;
      else if (!r.ok) toast.error(r.error);
    });
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold text-halo">{status === "trial" || !current ? "Escolha seu plano" : "Planos"}</h2>
        {canManage && (
          <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
            Cupom
            <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} className="h-10 w-36 font-mono uppercase" placeholder="CÓDIGO" />
          </label>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = p.id === currentPlanId;
          const upgrade = current && p.price_cents > current.price_cents;
          return (
            <div key={p.id} className={cn("relative grid content-start gap-3 rounded-2xl border p-5", p.is_featured ? "border-sky/35 bg-electric/10" : "border-white/[0.07] bg-surface-1")}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-semibold text-halo">{p.name}</p>
                {isCurrent ? <Badge tone="success">Atual</Badge> : p.highlight_label ? <Badge tone="brand"><Sparkles className="size-3" /> {p.highlight_label}</Badge> : null}
              </div>
              <p className="font-mono text-2xl font-semibold text-white">{formatMoney(p.price_cents)}<span className="text-sm text-muted-foreground">{PERIOD_LABEL[p.billing_period].short}</span></p>
              <ul className="grid gap-1.5 text-sm text-muted-foreground">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-sky" /> {f}</li>)}
              </ul>
              {canManage && (
                <Button
                  variant={isCurrent ? "subtle" : upgrade || p.is_featured ? "primary" : "glass"}
                  loading={pending && busyPlan === p.slug}
                  disabled={pending}
                  onClick={() => checkout(p.slug)}
                  className="mt-1"
                >
                  {isCurrent ? (status === "trial" ? "Assinar este plano" : "Renovar") : upgrade ? "Fazer upgrade" : current ? "Mudar para este plano" : "Assinar"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {canManage && current && status && ["active", "past_due", "trial"].includes(status) && !cancelScheduled && (
        <button
          type="button"
          className="justify-self-start text-[13px] text-muted-foreground underline-offset-4 hover:text-danger hover:underline"
          onClick={() => {
            if (!confirm("Cancelar a assinatura? O acesso continua até o fim do período já pago e seus dados ficam preservados.")) return;
            start(async () => {
              const r = await cancelSubscriptionAction();
              if (r.ok) { toast.success(r.message ?? "Cancelamento agendado"); location.reload(); } else toast.error(r.error);
            });
          }}
        >
          Cancelar assinatura
        </button>
      )}
    </section>
  );
}
