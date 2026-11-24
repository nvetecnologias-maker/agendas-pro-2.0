"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type FormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "./password-input";
import { FormMessage } from "./form-message";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, { status: "idle" });
  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage state={state} />
      <Field id="email" label="E-mail" error={state.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" placeholder="voce@barbearia.com" defaultValue={state.values?.email} required />
      </Field>
      <div className="grid gap-2">
        <Field id="password" label="Senha" error={state.fieldErrors?.password}>
          <PasswordInput name="password" autoComplete="current-password" placeholder="Sua senha" required />
        </Field>
        <Link href="/recuperar-senha" className="justify-self-end text-[13px] text-sky hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <Button type="submit" size="lg" loading={pending} className="mt-1 w-full">
        Entrar
      </Button>
    </form>
  );
}
