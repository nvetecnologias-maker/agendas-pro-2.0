import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { requirePanel } from "@/lib/panel/context";
import { getSiteUrl } from "@/lib/supabase/env";
import { rowsToWeek, DEFAULT_WEEK } from "@/lib/schedule";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Configuração inicial · Agendas Pro" };

export default async function OnboardingPage() {
  const panel = await requirePanel();
  if (panel.role !== "owner" && panel.role !== "admin") redirect("/painel");
  const { supabase, shop } = panel;
  const [hours, services, pros, links] = await Promise.all([
    supabase.from("working_hours").select("weekday, starts_at, ends_at").eq("barbershop_id", shop.id).is("professional_id", null),
    supabase.from("services").select("id, name, price_cents, duration_minutes, is_active").eq("barbershop_id", shop.id).order("sort_order"),
    supabase.from("professionals").select("id, name, user_id, is_active").eq("barbershop_id", shop.id).order("sort_order"),
    supabase.from("professional_services").select("professional_id, service_id").eq("barbershop_id", shop.id),
  ]);
  return (
    <main className="min-h-svh bg-[radial-gradient(120%_60%_at_100%_0%,rgba(36,103,242,0.18),transparent_60%)] bg-navy">
      <OnboardingWizard
        shop={shop}
        userId={panel.userId}
        ownerName={panel.profile?.full_name ?? ""}
        week={hours.data?.length ? rowsToWeek(hours.data) : DEFAULT_WEEK}
        hoursConfigured={!!hours.data?.length}
        services={services.data ?? []}
        professionals={(pros.data ?? []).map((p) => ({ ...p, serviceIds: (links.data ?? []).filter((l) => l.professional_id === p.id).map((l) => l.service_id) }))}
        publicUrl={`${getSiteUrl()}/${shop.slug}`}
      />
      <Toaster theme="dark" position="top-center" richColors />
    </main>
  );
}
