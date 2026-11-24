import type { Metadata } from "next";
import { requirePanelAction } from "@/lib/panel/context";
import { ServicesClient } from "@/components/panel/services-client";

export const metadata: Metadata = { title: "Serviços · Agendas Pro" };

export default async function ServicesPage() {
  const panel = await requirePanelAction("services.manage");
  const { supabase, shop } = panel;
  const [services, pros, links] = await Promise.all([
    supabase.from("services").select("*").eq("barbershop_id", shop.id).order("sort_order").order("name"),
    supabase.from("professionals").select("id, name, is_active").eq("barbershop_id", shop.id).order("sort_order").order("name"),
    supabase.from("professional_services").select("professional_id, service_id").eq("barbershop_id", shop.id),
  ]);
  return (
    <ServicesClient
      shopId={shop.id}
      services={(services.data ?? []).map((s) => ({
        ...s,
        professionalIds: (links.data ?? []).filter((l) => l.service_id === s.id).map((l) => l.professional_id),
      }))}
      professionals={pros.data ?? []}
      canEdit={panel.can("services.manage")}
    />
  );
}
