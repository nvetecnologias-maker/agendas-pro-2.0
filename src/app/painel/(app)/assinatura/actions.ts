"use server";

import type { ActionResult } from "@/lib/db-errors";
import { requirePanelAction } from "@/lib/panel/context";

/**
 * Checkout e cancelamento. A integração com o gateway (Mercado Pago/Asaas/Stripe)
 * é ligada na Fase 6; até lá a ação informa que o pagamento online não está ativo.
 */
export async function startCheckoutAction(planSlug: string, coupon?: string): Promise<ActionResult<{ url: string }>> {
  await requirePanelAction("subscription.manage");
  void planSlug; void coupon;
  return { ok: false, error: "O pagamento online ainda não foi configurado pela plataforma. Fale com o suporte." };
}

export async function cancelSubscriptionAction(): Promise<ActionResult> {
  await requirePanelAction("subscription.manage");
  return { ok: false, error: "Cancelamento online disponível em breve. Fale com o suporte." };
}
