"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePanel } from "@/lib/panel/context";
import { dbErrorMessage, type ActionResult } from "@/lib/db-errors";
import { validateWeek, type DayRanges } from "@/lib/schedule";
import { isValidDay, zonedToUtc, addDays } from "@/lib/datetime";

const weekSchema = z
  .array(z.object({ weekday: z.number().int().min(0).max(6), ranges: z.array(z.object({ start: z.string(), end: z.string() })).max(6) }))
  .length(7);

/** Salva o expediente semanal (professionalId nulo = horário da barbearia; [] = usar o da barbearia) */
export async function saveWeekAction(professionalId: string | null, week: DayRanges[] | null): Promise<ActionResult> {
  const panel = await requirePanel({ allowOnboarding: true });
  if (!panel.can("schedule.manage")) return { ok: false, error: "Sem permissão." };
  if (professionalId && !z.string().uuid().safeParse(professionalId).success) return { ok: false, error: "Profissional inválido." };
  if (week) {
    const parsed = weekSchema.safeParse(week);
    if (!parsed.success) return { ok: false, error: "Horários inválidos." };
    const err = validateWeek(parsed.data);
    if (err) return { ok: false, error: err };
  }

  const sb = panel.supabase;
  let del = sb.from("working_hours").delete().eq("barbershop_id", panel.shop.id);
  del = professionalId ? del.eq("professional_id", professionalId) : del.is("professional_id", null);
  const { error: delErr } = await del;
  if (delErr) return { ok: false, error: dbErrorMessage(delErr) };

  const rows = (week ?? []).flatMap((d) =>
    d.ranges.map((r) => ({ barbershop_id: panel.shop.id, professional_id: professionalId, weekday: d.weekday, starts_at: r.start, ends_at: r.end })),
  );
  if (rows.length) {
    const { error } = await sb.from("working_hours").insert(rows);
    if (error) return { ok: false, error: dbErrorMessage(error) };
  }
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Horários salvos" };
}

const blockSchema = z.object({
  professionalId: z.string().uuid().nullable(),
  kind: z.enum(["block", "day_off", "holiday"]),
  fromDay: z.string().refine(isValidDay, "Data inválida"),
  toDay: z.string().refine(isValidDay, "Data inválida"),
  allDay: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.string().trim().max(200).optional(),
});

/** Bloqueios, folgas e feriados (o banco impede agendamentos nesses períodos) */
export async function addBlockAction(raw: z.input<typeof blockSchema>): Promise<ActionResult> {
  const panel = await requirePanel({ allowOnboarding: true });
  const parsed = blockSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const v = parsed.data;
  if (v.toDay < v.fromDay) return { ok: false, error: "A data final precisa ser igual ou depois da inicial." };

  const startsAt = v.allDay ? zonedToUtc(v.fromDay, "00:00", panel.tz) : zonedToUtc(v.fromDay, v.startTime ?? "00:00", panel.tz);
  const endsAt = v.allDay ? zonedToUtc(addDays(v.toDay, 1), "00:00", panel.tz) : zonedToUtc(v.toDay, v.endTime ?? "23:59", panel.tz);
  if (endsAt <= startsAt) return { ok: false, error: "O fim precisa ser depois do início." };

  const { error } = await panel.supabase.from("time_blocks").insert({
    barbershop_id: panel.shop.id,
    professional_id: v.professionalId,
    kind: v.kind,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    reason: v.reason || null,
    created_by: panel.userId,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Bloqueio adicionado" };
}

export async function deleteBlockAction(id: string): Promise<ActionResult> {
  const panel = await requirePanel({ allowOnboarding: true });
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Inválido." };
  const { error } = await panel.supabase.from("time_blocks").delete().eq("id", id).eq("barbershop_id", panel.shop.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Bloqueio removido" };
}
