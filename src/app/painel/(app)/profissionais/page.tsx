import type { Metadata } from "next";
import { requirePanelAction } from "@/lib/panel/context";
import { ProfessionalsClient } from "@/components/panel/professionals-client";

export const metadata: Metadata = { title: "Profissionais · Agendas Pro" };

export default async function ProfessionalsPage() {
  const panel = await requirePanelAction("professionals.manage");
  const { supabase, shop } = panel;
  const [pros, services, links, limit] = await Promise.all([
    supabase.from("professionals").select("*").eq("barbershop_id", shop.id).order("sort_order").order("name"),
    supabase.from("services").select("id, name, is_active").eq("barbershop_id", shop.id).order("sort_order"),
    supabase.from("professional_services").select("professional_id, service_id").eq("barbershop_id", shop.id),
    supabase.rpc("plan_limit", { p_barbershop_id: shop.id, p_feature_key: "professionals.max" }),
  ]);
  return (
    <ProfessionalsClient
      shopId={shop.id}
      professionals={(pros.data ?? []).map((p) => ({ ...p, serviceIds: (links.data ?? []).filter((l) => l.professional_id === p.id).map((l) => l.service_id) }))}
      services={services.data ?? []}
      limit={limit.data ?? null}
    />
  );
}
