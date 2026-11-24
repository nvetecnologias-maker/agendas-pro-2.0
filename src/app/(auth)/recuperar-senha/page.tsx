import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar senha · Agendas Pro" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Recuperar senha"
        subtitle={<>Lembrou? <Link href="/entrar" className="text-sky hover:underline">Voltar para o login</Link></>}
      />
      <ForgotPasswordForm />
    </>
  );
}
