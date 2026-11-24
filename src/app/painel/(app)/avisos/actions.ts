"use server";

import { revalidatePath } from "next/cache";
import { requirePanel } from "@/lib/panel/context";
import { dbErrorMessage, type ActionResult } from "@/lib/db-errors";

export async function markNoticesReadAction(shopId: string): Promise<ActionResult> {
  const panel = await requirePanel();
  if (panel.shop.id !== shopId) return { ok: false, error: "Barbearia inválida." };
  const { error } = await panel.supabase.rpc("mark_notifications_read", { p_barbershop_id: shopId });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/painel", "layout");
  return { ok: true };
}
