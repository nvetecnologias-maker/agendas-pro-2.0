import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { Logo } from "@/components/brand/logo";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/navigation/sign-out-button";

export const metadata: Metadata = { title: "Configuração inicial · Agendas Pro" };

const STEPS = [
  "Informações da barbearia",
  "Endereço e contato",
  "Horários de funcionamento",
  "Cadastro dos serviços",
  "Cadastro dos profissionais",
  "Personalização da página pública",
  "Publicação da agenda",
];

/** Fase 1: rota protegida e etapa salva no banco. O fluxo completo vem na Fase 2/3. */
export default async function OnboardingPage() {
  const ctx = await requireSession();
  if (!ctx.current) redirect("/painel");
  const step = ctx.current.barbershop.onboarding_step;
  const pct = Math.round(((step - 1) / STEPS.length) * 100);

  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <Logo />
        <SignOutButton />
      </header>
      <Card variant="glass" padding="lg">
        <CardTitle className="text-2xl">Vamos configurar {ctx.current.barbershop.name}</CardTitle>
        <CardDescription className="mt-1">{pct}% concluído · etapa {step} de {STEPS.length}</CardDescription>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-sky to-electric" style={{ width: `${pct}%` }} />
        </div>
        <ol className="mt-6 grid gap-2 text-sm">
          {STEPS.map((s, i) => (
            <li key={s} className={i + 1 === step ? "text-halo" : "text-subtle-foreground"}>
              {i + 1}. {s}
            </li>
          ))}
        </ol>
      </Card>
    </main>
  );
}
