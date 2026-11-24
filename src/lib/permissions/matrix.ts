import type { AccessLevel, ShopRole } from "@/types/database";

/**
 * MATRIZ CENTRAL DE PERMISSÕES
 * --------------------------------------------------------------
 * Fonte única de verdade para a interface (mostrar/esconder ações).
 * Ela espelha as políticas RLS do banco (migration 0006): mesmo que
 * a interface erre, o banco recusa. Mudou aqui? Mude a RLS também.
 */
export const ACTIONS = [
  "dashboard.view",
  "appointments.view",
  "appointments.manage_all",   // criar/editar agendamentos de qualquer profissional
  "appointments.manage_own",   // profissional: apenas os próprios
  "services.manage",
  "professionals.manage",
  "customers.view",
  "customers.manage",
  "finance.view",
  "finance.manage",
  "schedule.manage",           // horários de funcionamento, bloqueios, folgas
  "settings.manage",
  "public_page.manage",
  "members.manage_admins",
  "members.manage_professionals",
  "subscription.view",
  "subscription.manage",
  "audit.view",
] as const;

export type Action = (typeof ACTIONS)[number];

const OWNER: readonly Action[] = ACTIONS;

const ADMIN: readonly Action[] = ACTIONS.filter(
  (a) => !["members.manage_admins", "subscription.manage", "audit.view"].includes(a),
);

const PROFESSIONAL: readonly Action[] = [
  "dashboard.view",
  "appointments.view",
  "appointments.manage_own",
  "customers.view",
  "customers.manage",
];

export const ROLE_PERMISSIONS: Record<ShopRole, readonly Action[]> = {
  owner: OWNER,
  admin: ADMIN,
  professional: PROFESSIONAL,
};

/** Ações liberadas mesmo sem assinatura ativa (para poder regularizar) */
const BILLING_SAFE: readonly Action[] = ["subscription.view", "subscription.manage", "dashboard.view"];

/** Ações de leitura liberadas em billing_only (dados preservados, sem operar) */
const READ_ONLY: readonly Action[] = ["appointments.view", "customers.view", "finance.view", "audit.view"];

export function can(role: ShopRole | null | undefined, action: Action, access: AccessLevel = "full"): boolean {
  if (!role) return false;
  if (!ROLE_PERMISSIONS[role].includes(action)) return false;

  switch (access) {
    case "full":
    case "grace":
      return true;
    case "billing_only":
      return BILLING_SAFE.includes(action) || READ_ONLY.includes(action);
    case "blocked":
      return BILLING_SAFE.includes(action);
  }
}

export const ROLE_LABELS: Record<ShopRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  professional: "Profissional",
};

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  full: "Acesso completo",
  grace: "Pagamento pendente (período de tolerância)",
  billing_only: "Assinatura inativa",
  blocked: "Conta suspensa",
};
