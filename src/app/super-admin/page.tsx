import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/navigation/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Super Admin · Agendas Pro" };

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const { count } = await supabase.from("barbershops").select("id", { count: "exact", head: true });

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Logo /><Badge tone="brand">Super Admin</Badge></div>
        <SignOutButton />
      </header>
      <Card variant="glass" padding="lg">
        <CardTitle className="text-2xl">Painel da plataforma</CardTitle>
        <CardDescription className="mt-1">
          {count ?? 0} barbearia(s) cadastrada(s). O painel administrativo completo é a Fase 5.
        </CardDescription>
      </Card>
    </main>
  );
}
