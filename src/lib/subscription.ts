import type { SubscriptionStatus } from "@/types/database";

export const SUB_STATUS: Record<SubscriptionStatus, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  trial: { label: "Período de teste", tone: "info" },
  active: { label: "Ativa", tone: "success" },
  pending: { label: "Aguardando pagamento", tone: "warning" },
  past_due: { label: "Pagamento atrasado", tone: "warning" },
  canceled: { label: "Cancelada", tone: "neutral" },
  suspended: { label: "Suspensa", tone: "danger" },
  expired: { label: "Expirada", tone: "danger" },
};
