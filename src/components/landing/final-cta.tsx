import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RibbonField } from "@/components/animations/ribbon-field";
import { Reveal } from "@/components/animations/reveal";
import { Button } from "@/components/ui/button";

export function FinalCta({ trialDays }: { trialDays: number }) {
  return (
    <section aria-labelledby="cta-title" className="mx-auto max-w-7xl px-4 pb-28 sm:px-6">
      <Reveal>
        <RibbonField still quality={0.6} className="rounded-3xl border border-white/10">
          <div className="grid justify-items-center gap-6 px-6 py-20 text-center sm:py-24">
            <h2 id="cta-title" className="max-w-2xl text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
              Comece a receber agendamentos pelo seu link
            </h2>
            <p className="max-w-lg text-lg text-halo/75">
              Crie sua conta, configure serviços e horários e compartilhe o link com seus clientes. Teste por {trialDays} dias, sem cartão de crédito.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/cadastro">Começar agora <ArrowRight /></Link>
              </Button>
              <Button size="lg" variant="glass" asChild>
                <a href="#planos">Ver planos</a>
              </Button>
            </div>
          </div>
        </RibbonField>
      </Reveal>
    </section>
  );
}
