"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePanel } from "@/lib/panel/context";
import { dbErrorMessage, type ActionResult } from "@/lib/db-errors";
import type { TablesUpdate } from "@/types/database";

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const url = z.string().trim().url("Link inválido").max(300).optional().or(z.literal("")).transform((v) => v || null);
const phone = z.string().optional().transform((v) => (v ?? "").replace(/\D/g, "") || null)
  .refine((v) => v === null || (v.length >= 10 && v.length <= 13), "Telefone inválido");

const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  description: opt(2000),
  phone,
  whatsapp: phone,
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")).transform((v) => v || null),
  address_street: opt(160), address_number: opt(20), address_complement: opt(80), address_district: opt(80),
  address_city: opt(80),
  address_state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "UF com 2 letras").optional().or(z.literal("")).transform((v) => v || null),
  address_zip: z.string().optional().transform((v) => (v ?? "").replace(/\D/g, "") || null),
  instagram: url, facebook: url, tiktok: url, youtube: url,
});

const brandingSchema = z.object({
  logo_url: z.string().url().nullable(),
  cover_url: z.string().url().nullable(),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  gallery: z.array(z.string().url()).max(8),
  show_professionals: z.boolean(),
  welcome: z.string().trim().max(160).optional(),
});

const prefsSchema = z.object({
  min_advance_minutes: z.coerce.number().int().min(0).max(10080),
  max_advance_days: z.coerce.number().int().min(1).max(365),
  buffer_minutes: z.coerce.number().int().min(0).max(240),
  slot_interval_minutes: z.coerce.number().refine((v) => [5, 10, 15, 20, 30, 60].includes(v), "Intervalo inválido"),
  cancellation_min_hours: z.coerce.number().int().min(0).max(168),
  cancellation_policy: opt(1000),
  auto_confirm: z.boolean(),
  new_booking_email: z.boolean(),
  reminder_whatsapp: z.boolean(),
  reminder_hours: z.coerce.number().int().min(1).max(72),
});

function fail(e: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const i of e.issues) fieldErrors[String(i.path[0])] ??= i.message;
  return { ok: false, error: "Confira os campos destacados.", fieldErrors };
}

async function update(row: TablesUpdate<"barbershops">): Promise<ActionResult> {
  const panel = await requirePanel({ allowOnboarding: true });
  if (!panel.can("settings.manage")) return { ok: false, error: "Sem permissão." };
  const { error } = await panel.supabase.from("barbershops").update(row).eq("id", panel.shop.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Alterações salvas" };
}

export async function saveShopProfileAction(raw: z.input<typeof profileSchema>) {
  const p = profileSchema.safeParse(raw);
  if (!p.success) return fail(p.error);
  const { instagram, facebook, tiktok, youtube, ...rest } = p.data;
  const social = Object.fromEntries(Object.entries({ instagram, facebook, tiktok, youtube }).filter(([, v]) => v));
  return update({ ...rest, social_links: social });
}

export async function saveBrandingAction(raw: z.input<typeof brandingSchema>) {
  const p = brandingSchema.safeParse(raw);
  if (!p.success) return fail(p.error);
  const { logo_url, cover_url, ...branding } = p.data;
  return update({ logo_url, cover_url, branding });
}

export async function savePreferencesAction(raw: z.input<typeof prefsSchema>) {
  const p = prefsSchema.safeParse(raw);
  if (!p.success) return fail(p.error);
  const { new_booking_email, reminder_whatsapp, reminder_hours, ...rest } = p.data;
  return update({ ...rest, notification_prefs: { new_booking_email, reminder_whatsapp, reminder_hours } });
}
