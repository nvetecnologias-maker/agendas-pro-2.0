import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "@/components/auth/auth-heading";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Criar conta · Agendas Pro" };

export default function SignUpPage() {
  return (
    <>
      <AuthHeading
        title="Crie sua conta"
        subtitle={<>14 dias grátis, sem cartão. Já tem conta? <Link href="/entrar" className="text-sky hover:underline">Entrar</Link></>}
      />
      <SignUpForm />
    </>
  );
}
