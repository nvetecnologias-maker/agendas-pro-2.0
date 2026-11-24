/**
 * Catálogo de funcionalidades/limites controlados por plano (tabela plan_features).
 * O Super Admin liga/desliga e define limites por plano no construtor de planos.
 */
export const FEATURES = {
  "professionals.max": { label: "Profissionais ativos", kind: "limit" },
  "services.max": { label: "Serviços cadastrados", kind: "limit" },
  public_page: { label: "Página pública de agendamento", kind: "flag" },
  customers: { label: "Cadastro de clientes", kind: "flag" },
  "finance.basic": { label: "Módulo financeiro", kind: "flag" },
  "reports.advanced": { label: "Relatórios avançados", kind: "flag" },
  "notifications.whatsapp": { label: "Notificações por WhatsApp", kind: "flag" },
} as const;

export type FeatureKey = keyof typeof FEATURES;
