import type { Enums } from "@/types/database";

export const SUB_STATUS_LABEL: Record<Enums<"subscription_status">, { label: string; tone: "success" | "info" | "warning" | "danger" | "neutral" }> = {
  trial: { label: "Teste", tone: "info" },
  active: { label: "Ativa", tone: "success" },
  pending: { label: "Pendente", tone: "warning" },
  past_due: { label: "Atrasada", tone: "warning" },
  canceled: { label: "Cancelada", tone: "neutral" },
  suspended: { label: "Suspensa", tone: "danger" },
  expired: { label: "Expirada", tone: "neutral" },
};
export const PERIOD_LABEL: Record<Enums<"billing_period">, string> = {
  monthly: "Mensal", quarterly: "Trimestral", semiannual: "Semestral", annual: "Anual",
};
export const PERIOD_SUFFIX: Record<Enums<"billing_period">, string> = {
  monthly: "/mês", quarterly: "/trimestre", semiannual: "/semestre", annual: "/ano",
};
export const GATEWAY_LABEL: Record<Enums<"payment_gateway">, string> = {
  mercado_pago: "Mercado Pago", asaas: "Asaas", stripe: "Stripe",
};
export const TX_STATUS_LABEL: Record<Enums<"transaction_status">, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  pending: { label: "Pendente", tone: "warning" },
  approved: { label: "Aprovado", tone: "success" },
  refused: { label: "Recusado", tone: "danger" },
  refunded: { label: "Estornado", tone: "neutral" },
  canceled: { label: "Cancelado", tone: "neutral" },
};
export const EVENT_LABEL: Record<string, string> = {
  created: "Assinatura criada", plan_changed: "Plano alterado", renewed: "Renovada", days_granted: "Dias concedidos",
  suspended: "Suspensa", reactivated: "Reativada", activated: "Ativada", canceled: "Cancelada", expired: "Expirada",
  payment_failed: "Pagamento recusado", status_changed: "Status alterado",
};
export const AUDIT_LABEL: Record<string, string> = {
  "account.created": "Conta criada",
  "barbershop.suspended": "Barbearia suspensa",
  "barbershop.reactivated": "Barbearia reativada",
  "subscription.insert": "Assinatura criada",
  "subscription.update": "Assinatura alterada",
  "subscription.delete": "Assinatura removida",
  "plan.insert": "Plano criado",
  "plan.update": "Plano alterado",
  "plan.delete": "Plano removido",
  "coupon.insert": "Cupom criado",
  "coupon.update": "Cupom alterado",
  "coupon.delete": "Cupom removido",
  "payment_gateway.insert": "Gateway criado",
  "payment_gateway.update": "Gateway alterado",
  "platform_settings.update": "Configurações alteradas",
  "barbershop.update": "Barbearia alterada",
  "member.insert": "Membro adicionado",
  "member.update": "Membro alterado",
  "member.delete": "Membro removido",
};
