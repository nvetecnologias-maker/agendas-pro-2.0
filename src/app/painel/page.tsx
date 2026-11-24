import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { ACCESS_LABELS, ROLE_LABELS } from "@/lib/permissions/matrix";
import { Logo } from "@/components/brand/logo";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/navigation/sign-out-button";
import { AccessBanner } from "@/components/dashboard/access-banner";

export const metadata: Metadata = { title: "Painel · Agendas Pro" };

/** Fase 1: casca protegida do painel. O painel completo é a Fase 3. */
export default async function PanelPage() {
  const ctx = await requireSession();
  if (!ctx.current) {
    if (ctx.isSuperAdmin) redirect("/super-admin");
    return (
      <main className="mx-auto grid max-w-xl gap-4 p-6 pt-20 text-center">
        <Logo className="mx-auto" />
        <p className="text-muted-foreground">Sua conta ainda não está vinculada a nenhuma barbearia.</p>
        <SignOutButton />
      </main>
    );
  }
  const { barbershop, role, access } = ctx.current;

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <Logo />
        <SignOutButton />
      </header>
      <AccessBanner access={access} />
      <Card variant="glass" padding="lg">
        <CardTitle className="text-2xl">Olá, {ctx.profile?.full_name?.split(" ")[0]}</CardTitle>
        <CardDescription className="mt-1">
          Você está em <strong className="text-halo">{barbershop.name}</strong>. O painel completo chega na Fase 3.
        </CardDescription>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge tone="brand">{ROLE_LABELS[role]}</Badge>
          <Badge tone={access === "full" ? "success" : "warning"} dot>{ACCESS_LABELS[access]}</Badge>
          <Badge tone="neutral">agendaspro.com.br/{barbershop.slug}</Badge>
        </div>
      </Card>
    </main>
  );
}
