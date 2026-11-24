"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { signUpAction, type FormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "./password-input";
import { FormMessage } from "./form-message";

export function SignUpForm({ plan }: { plan?: { slug: string; name: string; trialDays: number } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signUpAction, { status: "idle" });

  if (state.status === "success") {
    return (
      <div className="glass grid gap-4 rounded-2xl p-6 text-center">
        <MailCheck className="mx-auto size-10 text-sky" aria-hidden />
        <h2 className="text-lg font-semibold">Confirme seu e-mail</h2>
        <p className="text-sm text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="desiredPlan" value={plan?.slug ?? ""} />
      {plan && (
        <div className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm">
          <span className="text-muted-foreground">Plano escolhido</span>
          <span className="font-medium text-halo">
            {plan.name}
            {plan.trialDays > 0 && <span className="text-sky"> · {plan.trialDays} dias grátis</span>}
          </span>
        </div>
      )}
      <FormMessage state={state} />
      <Field id="fullName" label="Nome completo" error={e.fullName}>
        <Input name="fullName" autoComplete="name" placeholder="João Silva" defaultValue={v.fullName} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="email" label="E-mail" error={e.email}>
          <Input name="email" type="email" autoComplete="email" placeholder="voce@email.com" defaultValue={v.email} required />
        </Field>
        <Field id="phone" label="Telefone / WhatsApp" error={e.phone}>
          <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 98888-7777" defaultValue={v.phone} required />
        </Field>
      </div>
      <Field id="barbershopName" label="Nome da barbearia" error={e.barbershopName} hint="Ele gera o link da sua agenda. Você pode mudar depois.">
        <Input name="barbershopName" autoComplete="organization" placeholder="Barbearia do João" defaultValue={v.barbershopName} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="password" label="Senha" error={e.password}>
          <PasswordInput name="password" autoComplete="new-password" placeholder="Mín. 8, letras e números" required />
        </Field>
        <Field id="confirmPassword" label="Confirmar senha" error={e.confirmPassword}>
          <PasswordInput name="confirmPassword" autoComplete="new-password" placeholder="Repita a senha" required />
        </Field>
      </div>
      <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
        Criar conta e começar teste grátis
      </Button>
      <p className="text-center text-xs text-subtle-foreground">
        Ao criar a conta você concorda com os{" "}
        <Link href="/termos" className="text-sky hover:underline">Termos de uso</Link> e a{" "}
        <Link href="/privacidade" className="text-sky hover:underline">Política de privacidade</Link>.
      </p>
    </form>
  );
}
