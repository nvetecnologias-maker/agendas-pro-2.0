import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { title: { default: "Super Admin", template: "%s · Super Admin · Agendas Pro" }, robots: { index: false } };

/** Toda a árvore /super-admin exige papel super_admin validado no servidor */
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSuperAdmin();
  return (
    <AdminShell userName={s.profile?.full_name ?? s.email ?? "Admin"} hasShop={s.memberships.length > 0}>
      {children}
    </AdminShell>
  );
}
