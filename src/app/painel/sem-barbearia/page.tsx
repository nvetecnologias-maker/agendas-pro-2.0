import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/navigation/sign-out-button";

export const metadata: Metadata = { title: "Conta sem barbearia · Agendas Pro" };

export default async function NoShopPage() {
  const ctx = await requireSession();
  if (ctx.current) redirect("/painel");
  return (
    <main className="mx-auto grid min-h-svh max-w-md content-center gap-5 p-6 text-center">
      <Logo className="mx-auto" />
      <h1 className="text-xl font-semibold text-halo">Sua conta ainda não está ligada a uma barbearia</h1>
      <p className="text-muted-foreground">
        Se você é profissional, peça ao responsável pela barbearia para adicionar seu e-mail na equipe.
      </p>
      <SignOutButton />
    </main>
  );
}
