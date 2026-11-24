import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { FeaturesBento } from "@/components/landing/features-bento";
import { Showcase } from "@/components/landing/showcase";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Benefits } from "@/components/landing/benefits";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { SiteFooter } from "@/components/landing/site-footer";
import { getPublicPlans, getPublicPlatformInfo } from "@/services/public-site";

export const metadata: Metadata = {
  title: "Agendas Pro · Agendamento online e gestão para barbearias",
  description:
    "Organize seus horários, gerencie seus profissionais e acompanhe seus resultados em uma única plataforma. Teste grátis.",
};

// planos e informações públicas são atualizados a cada 5 minutos
export const revalidate = 300;

export default async function HomePage() {
  const [{ plans, error }, info] = await Promise.all([getPublicPlans(), getPublicPlatformInfo()]);
  const trialDays = plans.find((p) => p.is_default_trial)?.trial_days ?? info.default_trial_days;

  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-electric focus:px-4 focus:py-2">
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo">
        <Hero trialDays={trialDays} />
        <FeaturesBento />
        <Showcase />
        <HowItWorks />
        <Benefits />
        <Pricing plans={plans} error={error} />
        <Faq trialDays={trialDays} supportEmail={info.support_email} />
        <FinalCta trialDays={trialDays} />
      </main>
      <SiteFooter info={info} />
    </>
  );
}
