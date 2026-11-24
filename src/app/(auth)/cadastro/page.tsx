import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "@/components/auth/auth-heading";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getPublicPlans } from "@/services/public-site";

export const metadata: Metadata = { title: "Criar conta · Agendas Pro" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  const { plano } = await searchParams;
  const { plans } = await getPublicPlans();
  const chosen = plano ? plans.find((p) => p.slug === plano.toLowerCase()) : undefined;
  const trialDays = (chosen ?? plans.find((p) => p.is_default_trial))?.trial_days ?? 14;

  return (
    <>
      <AuthHeading
        title="Crie sua conta"
        subtitle={<>{trialDays} dias grátis, sem cartão. Já tem conta? <Link href="/entrar" className="text-sky hover:underline">Entrar</Link></>}
      />
      <SignUpForm plan={chosen ? { slug: chosen.slug, name: chosen.name, trialDays: chosen.trial_days } : undefined} />
    </>
  );
}
