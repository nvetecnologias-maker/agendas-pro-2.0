"use server";

import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, type ActionResult } from "@/lib/db-errors";
import { isValidDay } from "@/lib/datetime";
import type { PublicAppointment, Slot } from "@/lib/public-booking/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Horários livres (o banco aplica expediente, antecedência, bloqueios e conflitos) */
export async function getPublicSlotsAction(input: {
  shopId: string;
  serviceId: string;
  day: string;
  professionalId: string | null;
}): Promise<ActionResult<Slot[]>> {
  if (!UUID.test(input.shopId) || !UUID.test(input.serviceId) || !isValidDay(input.day)) return { ok: false, error: "Dados inválidos." };
  if (input.professionalId && !UUID.test(input.professionalId)) return { ok: false, error: "Dados inválidos." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_barbershop_id: input.shopId,
    p_service_id: input.serviceId,
    p_day: input.day,
    ...(input.professionalId ? { p_professional_id: input.professionalId } : {}),
  });
  if (error) return { ok: false, error: dbErrorMessage(error, "Não foi possível carregar os horários.") };
  // "qualquer profissional": um horário aparece uma vez só
  const seen = new Set<string>();
  const slots = (data ?? []).filter((s) => (seen.has(s.starts_at) ? false : (seen.add(s.starts_at), true)));
  return { ok: true, data: slots };
}

export async function createBookingAction(input: {
  slug: string;
  serviceId: string;
  professionalId: string | null;
  startsAt: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}): Promise<ActionResult<PublicAppointment>> {
  const fieldErrors: Record<string, string> = {};
  const name = input.name.trim().replace(/\s+/g, " ");
  const phone = input.phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (name.length < 2) fieldErrors.name = "Informe seu nome.";
  if (!/^\d{10,11}$/.test(phone)) fieldErrors.phone = "Informe um celular válido com DDD.";
  if (input.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) fieldErrors.email = "E-mail inválido.";
  if ((input.notes ?? "").length > 500) fieldErrors.notes = "Máximo de 500 caracteres.";
  if (Object.keys(fieldErrors).length) return { ok: false, error: "Confira seus dados.", fieldErrors };
  if (!UUID.test(input.serviceId) || (input.professionalId && !UUID.test(input.professionalId)) || Number.isNaN(Date.parse(input.startsAt))) {
    return { ok: false, error: "Dados inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_public_booking", {
    p_slug: input.slug,
    p_service_id: input.serviceId,
    // null = qualquer profissional (o banco escolhe quem está livre)
    p_professional_id: input.professionalId as string,
    p_starts_at: input.startsAt,
    p_name: name,
    p_phone: phone,
    ...(input.email?.trim() ? { p_email: input.email.trim() } : {}),
    ...(input.notes?.trim() ? { p_notes: input.notes.trim() } : {}),
  });
  if (error || !data) return { ok: false, error: dbErrorMessage(error, "Não foi possível agendar. Tente novamente.") };
  return { ok: true, data: data as unknown as PublicAppointment };
}

export async function cancelBookingAction(token: string, reason?: string): Promise<ActionResult<PublicAppointment>> {
  if (!UUID.test(token)) return { ok: false, error: "Link inválido." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_public_appointment", {
    p_token: token,
    ...(reason?.trim() ? { p_reason: reason.trim().slice(0, 300) } : {}),
  });
  if (error || !data) return { ok: false, error: dbErrorMessage(error, "Não foi possível cancelar.") };
  return { ok: true, data: data as unknown as PublicAppointment, message: "Agendamento cancelado." };
}
