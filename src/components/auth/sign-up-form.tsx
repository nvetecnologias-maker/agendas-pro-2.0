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
import { LEGAL_ROUTES } from "@/lib/legal";

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
      <div className="grid gap-1.5">
        <label
          htmlFor="acceptLegal"
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-[13px] leading-relaxed text-muted-foreground has-[:checked]:border-sky/40"
        >
          <input
            id="acceptLegal"
            name="acceptLegal"
            type="checkbox"
            required
            defaultChecked={v.acceptLegal === "on"}
            aria-invalid={e.acceptLegal ? true : undefined}
            aria-describedby={e.acceptLegal ? "acceptLegal-error" : undefined}
            className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-[#2467F2]"
          />
          <span>
            Li e aceito os{" "}
            <Link href={LEGAL_ROUTES.terms} target="_blank" className="font-medium text-sky underline-offset-2 hover:underline">Termos de Uso</Link> e a{" "}
            <Link href={LEGAL_ROUTES.privacy} target="_blank" className="font-medium text-sky underline-offset-2 hover:underline">Política de Privacidade</Link>{" "}
            do Agendas Pro.
          </span>
        </label>
        {e.acceptLegal && (
          <p id="acceptLegal-error" role="alert" className="text-[13px] text-danger">{e.acceptLegal}</p>
        )}
      </div>
      <Button type="submit" size="lg" loading={pending} className="mt-1 w-full">
        Criar conta e começar teste grátis
      </Button>
    </form>
  );
}
