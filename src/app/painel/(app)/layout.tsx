import { Toaster } from "sonner";
import { requirePanel } from "@/lib/panel/context";
import { roleHas, ROLE_LABELS } from "@/lib/permissions/matrix";
import { PanelShell } from "@/components/panel/panel-shell";
import { NAV_ITEMS } from "@/components/panel/nav-items";
import { AccessBanner } from "@/components/dashboard/access-banner";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const panel = await requirePanel({ allowOnboarding: false });
  const manager = panel.role === "owner" || panel.role === "admin";
  const unread = manager
    ? (await panel.supabase.from("notifications").select("id", { count: "exact", head: true })
        .eq("barbershop_id", panel.shop.id).eq("channel", "in_app").is("read_at", null)).count ?? 0
    : null;
  const items = NAV_ITEMS.filter((i) => roleHas(panel.role, i.action)).map(({ key, href, label }) => ({ key, href, label }));

  return (
    <PanelShell
      items={items}
      shopName={panel.shop.name}
      shopLogo={panel.shop.logo_url}
      planName={panel.subscription?.plan?.name ?? null}
      unread={unread}
      userName={panel.profile?.full_name ?? "Você"}
      roleLabel={ROLE_LABELS[panel.role]}
      canCreateAppointment={panel.can("appointments.manage_all") || panel.can("appointments.manage_own")}
    >
      {panel.access !== "full" && (
        <div className="mb-5">
          <AccessBanner access={panel.access} />
        </div>
      )}
      {children}
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </PanelShell>
  );
}
