import Link from "next/link";
import { Check, Minus, RefreshCw } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PERIOD_LABEL, splitPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicPlan } from "@/services/public-site";
import { SectionHeading } from "./section-heading";

/** Vitrine de planos: tudo vem do banco (cadastrado no Super Admin) */
export function Pricing({ plans, error }: { plans: PublicPlan[]; error: boolean }) {
  return (
    <section id="planos" aria-labelledby="planos-title" className="relative scroll-mt-24 py-28">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(50%_60%_at_50%_0%,rgba(8,61,169,0.35),transparent)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          id="planos-title"
          eyebrow="Planos"
          title="Um plano para cada fase da sua barbearia"
          subtitle="Comece com o período de teste grátis. Troque de plano quando quiser."
        />

        {error ? (
          <div className="mx-auto mt-14 grid max-w-md justify-items-center gap-3 rounded-3xl border border-border bg-surface-1 p-8 text-center">
            <RefreshCw className="size-6 text-sky" aria-hidden />
            <p className="font-medium">Não foi possível carregar os planos agora.</p>
            <p className="text-sm text-muted-foreground">Atualize a página em instantes. Você também pode começar o teste grátis agora mesmo.</p>
            <Button asChild className="mt-2"><Link href="/cadastro">Começar teste grátis</Link></Button>
          </div>
        ) : plans.length === 0 ? (
          <p className="mt-14 text-center text-muted-foreground">Novos planos em breve.</p>
        ) : (
          <div className={cn("mx-auto mt-16 grid gap-5", plans.length >= 3 ? "lg:grid-cols-3" : "max-w-4xl md:grid-cols-2")}>
            {plans.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 0.08} className="h-full">
                <PlanCard plan={plan} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: PublicPlan }) {
  const price = splitPrice(plan.price_cents);
  const period = PERIOD_LABEL[plan.billing_period];
  const hasPromo = plan.compare_at_cents != null && plan.compare_at_cents > plan.price_cents;
  const featured = plan.is_featured;

  return (
    <article
      aria-labelledby={`plan-${plan.slug}`}
      className={cn(
        "relative flex h-full flex-col rounded-[28px] p-7 sm:p-8",
        featured
          ? "glass-strong border-beam shadow-[0_40px_100px_-30px_rgba(36,103,242,0.6)] lg:-translate-y-3"
          : "border border-border bg-surface-1/80",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id={`plan-${plan.slug}`} className="text-xl font-semibold tracking-tight">{plan.name}</h3>
        {plan.highlight_label && <Badge tone="brand">{plan.highlight_label}</Badge>}
      </div>
      {plan.description && <p className="mt-2 min-h-[48px] text-[15px] text-muted-foreground">{plan.description}</p>}

      <div className="mt-6">
        {hasPromo && (
          <p className="text-sm text-subtle-foreground line-through">
            R$ {splitPrice(plan.compare_at_cents!).int},{splitPrice(plan.compare_at_cents!).dec}
          </p>
        )}
        <p className="flex items-baseline gap-1">
          <span className="text-lg text-muted-foreground">R$</span>
          <span className="font-mono text-5xl font-semibold tracking-tight text-halo">{price.int}</span>
          <span className="font-mono text-xl text-halo">,{price.dec}</span>
          <span className="ml-1 text-muted-foreground">{period.short}</span>
        </p>
        <p className="mt-1 text-[13px] text-subtle-foreground">
          Cobrança {period.long.toLowerCase()}
          {plan.trial_days > 0 && ` · ${plan.trial_days} dias grátis`}
        </p>
      </div>

      <Button asChild size="lg" variant={featured ? "primary" : "outline"} className="mt-7 w-full">
        <Link href={`/cadastro?plano=${encodeURIComponent(plan.slug)}`}>
          {plan.trial_days > 0 ? "Começar teste grátis" : "Assinar agora"}
        </Link>
      </Button>

      <ul className="mt-8 grid gap-3 border-t border-border pt-7 text-[15px]">
        {plan.features.filter((f) => f.label).map((f) => (
          <li key={f.feature_key} className={cn("flex items-start gap-3", !f.enabled && "text-subtle-foreground")}>
            {f.enabled ? (
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-electric/20 text-sky"><Check className="size-3.5" aria-hidden /></span>
            ) : (
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/5"><Minus className="size-3.5" aria-hidden /></span>
            )}
            <span>
              {f.label}
              {!f.enabled && <span className="sr-only"> (não incluso)</span>}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
