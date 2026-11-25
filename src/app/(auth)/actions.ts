"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";
import { authErrorMessage } from "@/lib/auth/errors";
import { getSession, homePathFor, safeNextPath } from "@/lib/auth/session";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/validation/auth";

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

function pick(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

async function siteUrl() {
  // usa o host da requisição em desenvolvimento/preview; NEXT_PUBLIC_SITE_URL em produção
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return process.env.NEXT_PUBLIC_SITE_URL ? getSiteUrl() : host ? `${proto}://${host}` : getSiteUrl();
}

export async function signInAction(_: FormState, formData: FormData): Promise<FormState> {
  const raw = pick(formData, ["email", "password"]);
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), values: { email: raw.email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: "error", message: authErrorMessage(error.code), values: { email: raw.email } };
  }
  const next = String(formData.get("next") ?? "");
  if (next) redirect(safeNextPath(next));
  // Vai direto para a área certa (painel, configuração inicial ou Super Admin),
  // sem passar por uma rota intermediária que deixaria o endereço errado na barra.
  const ctx = await getSession();
  redirect(ctx ? homePathFor(ctx) : "/auth/redirecionar");
}

export async function signUpAction(_: FormState, formData: FormData): Promise<FormState> {
  const raw = pick(formData, ["fullName", "email", "phone", "barbershopName", "password", "confirmPassword"]);
  const acceptLegal = formData.get("acceptLegal") === "on" ? "on" : undefined;
  const values = { fullName: raw.fullName, email: raw.email, phone: raw.phone, barbershopName: raw.barbershopName, acceptLegal: acceptLegal ?? "" };
  const parsed = signUpSchema.safeParse({ ...raw, acceptLegal });
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error), values };

  const { fullName, email, phone, barbershopName, password } = parsed.data;
  // plano escolhido na vitrine (o banco valida se existe e está ativo)
  const desiredPlan = String(formData.get("desiredPlan") ?? "").trim().toLowerCase();
  const safePlan = /^[a-z0-9-]{2,60}$/.test(desiredPlan) ? desiredPlan : undefined;
  const supabase = await createClient();

  // Os metadados disparam, no banco, a criação do perfil + barbearia + vínculo
  // de proprietário + período de teste, tudo numa única transação.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // versão dos documentos aceitos; a data do aceite é registrada pelo banco
      data: {
        full_name: fullName,
        phone,
        barbershop_name: barbershopName,
        desired_plan: safePlan,
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
      },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding`,
    },
  });
  if (error) return { status: "error", message: authErrorMessage(error.code), values };

  // Confirmação de e-mail desativada no Supabase -> já entra logado
  if (data.session) redirect("/onboarding");

  return {
    status: "success",
    message: `Enviamos um link de confirmação para ${email}. Abra o e-mail para ativar sua conta.`,
  };
}

export async function forgotPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const raw = pick(formData, ["email"]);
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error), values: raw };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/redefinir-senha`,
  });
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { status: "error", message: authErrorMessage(error.code), values: raw };
  }
  // Mesma resposta exista ou não a conta (não revela e-mails cadastrados)
  return {
    status: "success",
    message: "Se existir uma conta com este e-mail, você receberá um link para criar uma nova senha.",
  };
}

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const raw = pick(formData, ["password", "confirmPassword"]);
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Seu link expirou. Solicite a recuperação de senha novamente." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error.code) };
  redirect("/auth/redirecionar");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
