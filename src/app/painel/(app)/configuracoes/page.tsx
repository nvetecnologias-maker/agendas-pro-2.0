import type { Metadata } from "next";
import Link from "next/link";
import { requirePanelAction } from "@/lib/panel/context";
import { PageHeader } from "@/components/panel/page-header";
import { ShopProfileForm, BrandingForm, PreferencesForm, ShopHoursForm } from "@/components/panel/settings-forms";
import { BlocksManager } from "@/components/panel/blocks-manager";
import { rowsToWeek, DEFAULT_WEEK } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Configurações · Agendas Pro" };

const TABS = {
  dados: "Dados da barbearia",
  funcionamento: "Funcionamento",
  personalizacao: "Personalização",
  preferencias: "Preferências",
} as const;
type Tab = keyof typeof TABS;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const panel = await requirePanelAction("settings.manage");
  const { supabase, shop, tz } = panel;
  const raw = (await searchParams).aba;
  const tab: Tab = raw && raw in TABS ? (raw as Tab) : "dados";

  let content: React.ReactNode = null;
  if (tab === "dados") content = <ShopProfileForm shop={shop} />;
  if (tab === "personalizacao") content = <BrandingForm shop={shop} />;
  if (tab === "preferencias") content = <PreferencesForm shop={shop} />;
  if (tab === "funcionamento") {
    const [hours, blocks, pros] = await Promise.all([
      supabase.from("working_hours").select("weekday, starts_at, ends_at").eq("barbershop_id", shop.id).is("professional_id", null),
      supabase.from("time_blocks").select("id, professional_id, kind, starts_at, ends_at, reason").eq("barbershop_id", shop.id)
        .gte("ends_at", new Date().toISOString()).order("starts_at").limit(100),
      supabase.from("professionals").select("id, name").eq("barbershop_id", shop.id).eq("is_active", true).order("sort_order"),
    ]);
    content = (
      <div className="grid gap-8">
        <ShopHoursForm week={hours.data?.length ? rowsToWeek(hours.data) : DEFAULT_WEEK} configured={!!hours.data?.length} />
        <BlocksManager blocks={blocks.data ?? []} professionals={pros.data ?? []} tz={tz} />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <PageHeader title="Configurações" />
      <nav aria-label="Seções" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="inline-flex gap-1 rounded-xl bg-white/5 p-1">
          {(Object.keys(TABS) as Tab[]).map((k) => (
            <Link key={k} href={`?aba=${k}`} scroll={false} aria-current={tab === k ? "page" : undefined}
              className={cn("whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-medium", tab === k ? "bg-electric text-white" : "text-muted-foreground hover:text-halo")}>
              {TABS[k]}
            </Link>
          ))}
        </div>
      </nav>
      <div className="min-w-0 max-w-3xl">{content}</div>
    </div>
  );
}
