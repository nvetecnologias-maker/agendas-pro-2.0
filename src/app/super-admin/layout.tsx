import { requireSuperAdmin } from "@/lib/auth/session";

/** Toda a árvore /super-admin exige papel super_admin validado no servidor */
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  return children;
}
