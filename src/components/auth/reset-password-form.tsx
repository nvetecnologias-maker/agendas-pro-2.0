"use client";

import { useActionState } from "react";
import { resetPasswordAction, type FormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "./password-input";
import { FormMessage } from "./form-message";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, { status: "idle" });
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <Field id="password" label="Nova senha" error={state.fieldErrors?.password}>
        <PasswordInput name="password" autoComplete="new-password" placeholder="Mín. 8, letras e números" required />
      </Field>
      <Field id="confirmPassword" label="Confirmar nova senha" error={state.fieldErrors?.confirmPassword}>
        <PasswordInput name="confirmPassword" autoComplete="new-password" required />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="w-full">
        Salvar nova senha
      </Button>
    </form>
  );
}
