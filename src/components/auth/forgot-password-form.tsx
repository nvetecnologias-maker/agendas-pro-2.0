"use client";

import { useActionState } from "react";
import { forgotPasswordAction, type FormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "./form-message";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, { status: "idle" });
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      {state.status !== "success" && (
        <>
          <Field id="email" label="E-mail da conta" error={state.fieldErrors?.email}>
            <Input name="email" type="email" autoComplete="email" placeholder="voce@barbearia.com" defaultValue={state.values?.email} required />
          </Field>
          <Button type="submit" size="lg" loading={pending} className="w-full">
            Enviar link de recuperação
          </Button>
        </>
      )}
    </form>
  );
}
