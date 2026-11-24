import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "@/components/auth/auth-heading";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Entrar · Agendas Pro" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next, erro } = await searchParams;
  return (
    <>
      <AuthHeading
        title="Bem-vindo de volta"
        subtitle={<>Não tem conta? <Link href="/cadastro" className="text-sky hover:underline">Comece seu teste grátis</Link></>}
      />
      {erro === "link_invalido" && (
        <Alert tone="warning" className="mb-5">O link é inválido ou expirou. Entre novamente ou solicite outro.</Alert>
      )}
      <SignInForm next={next} />
    </>
  );
}
