"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Sparkles, Ticket, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LEGAL_ROUTES } from "@/lib/legal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
import { PERIOD_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Plan, SubscriptionStatus } from "@/types/database";
import {
  cancelSubscriptionAction, quoteCheckoutAction, resumeSubscriptionAction, startCheckoutAction,
} from "@/app/painel/(app)/assinatura/actions";

type Applied = { code: string; byPlan: Record<string, { amount: number; discount: number } | { error: string }> };

export function SubscriptionClient({
  plans, currentPlanId, status, cancelScheduled, canManage,
}: {
  plans: (Plan & { features: string[] })[];
  currentPlanId: string | null;
  status: SubscriptionStatus | null;
  cancelScheduled: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [applied, setApplied] = React.useState<Applied | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [pending, start] = React.useTransition();
  const [busyPlan, setBusyPlan] = React.useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const current = plans.find((p) => p.id === currentPlanId);

  const applyCoupon = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setChecking(true);
    const results = await Promise.all(plans.map(async (p) => [p.id, await quoteCheckoutAction(p.slug, c)] as const));
    setChecking(false);
    const byPlan: Applied["byPlan"] = {};
    for (const [id, r] of results) byPlan[id] = r.ok && r.data ? { amount: r.data.amount, discount: r.data.discount } : { error: r.ok ? "" : r.error };
    const okAny = Object.values(byPlan).some((v) => "discount" in v);
    if (!okAny) {
      const first = Object.values(byPlan)[0];
      toast.error(first && "error" in first ? first.error : "Cupom inválido.");
      setApplied(null);
      return;
    }
    setApplied({ code: c, byPlan });
    toast.success("Cupom aplicado.");
  };

  const checkout = (slug: string) => {
    setBusyPlan(slug);
    start(async () => {
      const r = await startCheckoutAction(slug, applied?.code);
      if (r.ok && r.data?.url) { window.location.href = r.data.url; return; }
      setBusyPlan(null);
      if (!r.ok) toast.error(r.error);
    });
  };

  return (
    <section className="grid gap-4">
      <h2 className="text-lg font-semibold text-halo">{status === "trial" || !current ? "Escolha seu plano" : "Planos"}</h2>

      {canManage && (
        applied ? (
          <div className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success/[0.07] p-3">
            <Ticket className="size-5 shrink-0 text-success" />
            <p className="min-w-0 flex-1 text-sm text-halo">Cupom <b className="font-mono">{applied.code}</b> aplicado</p>
            <button type="button" onClick={() => { setApplied(null); setCode(""); }} className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-white/5" aria-label="Remover cupom">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void applyCoupon(); }}>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} maxLength={40}
              className="min-w-0 flex-1 font-mono uppercase" placeholder="Tem um cupom?" aria-label="Código do cupom" autoCapitalize="characters" />
            <Button type="submit" variant="subtle" loading={checking} disabled={!code.trim()}>Aplicar</Button>
          </form>
        )
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = p.id === currentPlanId;
          const upgrade = current && p.price_cents > current.price_cents;
          const q = applied?.byPlan[p.id];
          const discounted = q && "discount" in q && q.discount > 0 ? q : null;
          return (
            <div key={p.id} className={cn("relative grid content-start gap-3 rounded-2xl border p-5", p.is_featured ? "border-sky/35 bg-electric/10" : "border-white/[0.07] bg-surface-1")}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-semibold text-halo">{p.name}</p>
                {isCurrent ? <Badge tone="success">Atual</Badge> : p.highlight_label ? <Badge tone="brand"><Sparkles className="size-3" /> {p.highlight_label}</Badge> : null}
              </div>
              <div>
                {discounted && <p className="font-mono text-sm text-muted-foreground line-through">{formatMoney(p.price_cents)}</p>}
                <p className="font-mono text-2xl font-semibold text-white">
                  {formatMoney(discounted ? discounted.amount : p.price_cents)}
                  <span className="text-sm text-muted-foreground">{discounted ? " no 1º pagamento" : PERIOD_LABEL[p.billing_period].short}</span>
                </p>
                {q && "error" in q && <p className="mt-1 text-[12px] text-subtle-foreground">Cupom não vale para este plano</p>}
              </div>
              <ul className="grid gap-1.5 text-sm text-muted-foreground">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-sky" /> {f}</li>)}
              </ul>
              {canManage && (
                <Button
                  size="lg"
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
      {canManage && (
        <p className="text-center text-[12px] leading-relaxed text-subtle-foreground">
          O pagamento é feito no ambiente do provedor de pagamento. A troca de plano vale a partir da confirmação.
          Ao continuar, você concorda com os{" "}
          <Link href={LEGAL_ROUTES.terms} target="_blank" className="text-sky underline-offset-2 hover:underline">Termos de Uso</Link> e a{" "}
          <Link href={LEGAL_ROUTES.privacy} target="_blank" className="text-sky underline-offset-2 hover:underline">Política de Privacidade</Link>.
        </p>
      )}

      {canManage && cancelScheduled && (
        <Button variant="subtle" className="justify-self-start" loading={pending} onClick={() => start(async () => {
          const r = await resumeSubscriptionAction();
          if (r.ok) { toast.success(r.message ?? "Feito"); router.refresh(); } else toast.error(r.error);
        })}>Manter minha assinatura</Button>
      )}
      {canManage && current && status && ["active", "past_due", "trial", "pending"].includes(status) && !cancelScheduled && (
        <button type="button" onClick={() => setCancelOpen(true)}
          className="justify-self-start py-2 text-[13px] text-muted-foreground underline-offset-4 hover:text-danger hover:underline">
          Cancelar assinatura
        </button>
      )}

      <Sheet open={cancelOpen} onOpenChange={setCancelOpen}>
        <SheetContent title="Cancelar assinatura" description="O acesso continua até o fim do período já pago. Seus dados, clientes e histórico ficam guardados.">
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-[13px] text-muted-foreground">Pode contar o motivo? (opcional)
              <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Ex.: preço, faltou recurso..." />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="subtle" size="lg" onClick={() => setCancelOpen(false)}>Voltar</Button>
              <Button variant="destructive" size="lg" loading={pending} onClick={() => start(async () => {
                const r = await cancelSubscriptionAction(reason);
                if (r.ok) { toast.success(r.message ?? "Cancelamento agendado"); setCancelOpen(false); router.refresh(); } else toast.error(r.error);
              })}>Cancelar</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
