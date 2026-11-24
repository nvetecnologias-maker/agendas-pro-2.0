import type { Metadata } from "next";
import { requirePanel } from "@/lib/panel/context";
import { addDays, endOfMonth, isValidDay, startOfMonth, startOfWeek, todayLocal, zonedToUtc } from "@/lib/datetime";
import { AgendaClient } from "@/components/agenda/agenda-client";
import type { AgendaAppointment, AgendaView } from "@/components/agenda/types";
import type { AppointmentStatus } from "@/types/database";

export const metadata: Metadata = { title: "Agendamentos · Agendas Pro" };

type SP = { view?: string; dia?: string; prof?: string; serv?: string; status?: string; novo?: string; ag?: string; cliente?: string };
const VIEWS: AgendaView[] = ["dia", "semana", "mes", "lista"];
const STATUSES: AppointmentStatus[] = ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"];

const SELECT =
  "id, starts_at, ends_at, status, source, price_cents, duration_minutes, notes, cancel_reason, customer:customers(id, name, phone), service:services(id, name), professional:professionals(id, name)";

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const panel = await requirePanel();
  const sp = await searchParams;
  const { supabase, shop, tz } = panel;

  const view: AgendaView = VIEWS.includes(sp.view as AgendaView) ? (sp.view as AgendaView) : "dia";
  const day = isValidDay(sp.dia) ? sp.dia : todayLocal(tz);
  const [from, to] =
    view === "dia" ? [day, day]
    : view === "semana" ? [startOfWeek(day), addDays(startOfWeek(day), 6)]
    : [startOfMonth(day), endOfMonth(day)];
  const fromUtc = zonedToUtc(from, "00:00", tz).toISOString();
  const toUtc = zonedToUtc(addDays(to, 1), "00:00", tz).toISOString();

  let apptQuery = supabase
    .from("appointments")
    .select(SELECT)
    .eq("barbershop_id", shop.id)
    .gte("starts_at", fromUtc)
    .lt("starts_at", toUtc)
    .order("starts_at");
  if (sp.prof) apptQuery = apptQuery.eq("professional_id", sp.prof);
  if (sp.serv) apptQuery = apptQuery.eq("service_id", sp.serv);
  if (sp.status && STATUSES.includes(sp.status as AppointmentStatus)) apptQuery = apptQuery.eq("status", sp.status as AppointmentStatus);

  const [pros, services, links, appts, blocks, hours, me] = await Promise.all([
    supabase.from("professionals").select("id, name, photo_url, is_active").eq("barbershop_id", shop.id).order("sort_order").order("name"),
    supabase.from("services").select("id, name, price_cents, duration_minutes, is_active").eq("barbershop_id", shop.id).order("sort_order").order("name"),
    supabase.from("professional_services").select("professional_id, service_id").eq("barbershop_id", shop.id),
    apptQuery,
    supabase.from("time_blocks").select("id, professional_id, starts_at, ends_at, kind, reason").eq("barbershop_id", shop.id)
      .lt("starts_at", toUtc).gt("ends_at", fromUtc),
    supabase.from("working_hours").select("weekday, starts_at, ends_at, professional_id").eq("barbershop_id", shop.id),
    supabase.from("professionals").select("id").eq("barbershop_id", shop.id).eq("user_id", panel.userId).maybeSingle(),
  ]);

  // agendamento aberto por link (ex.: vindo da visão geral) mesmo fora do período carregado
  let opened: AgendaAppointment | null = null;
  if (sp.ag && /^[0-9a-f-]{36}$/i.test(sp.ag)) {
    opened = ((appts.data ?? []) as AgendaAppointment[]).find((a) => a.id === sp.ag) ?? null;
    if (!opened) {
      const { data } = await supabase.from("appointments").select(SELECT).eq("id", sp.ag).maybeSingle();
      opened = (data as AgendaAppointment | null) ?? null;
    }
  }

  let presetCustomer: { id: string; name: string; phone: string } | null = null;
  if (sp.cliente && /^[0-9a-f-]{36}$/i.test(sp.cliente)) {
    const { data } = await supabase.from("customers").select("id, name, phone").eq("id", sp.cliente).eq("barbershop_id", shop.id).maybeSingle();
    presetCustomer = data ?? null;
  }

  const svc = (services.data ?? []).map((s) => ({
    ...s,
    professionalIds: (links.data ?? []).filter((l) => l.service_id === s.id).map((l) => l.professional_id),
  }));

  return (
    <AgendaClient
      key={`${view}-${day}`}
      view={view}
      day={day}
      range={{ from, to }}
      today={todayLocal(tz)}
      tz={tz}
      appointments={(appts.data ?? []) as AgendaAppointment[]}
      professionals={pros.data ?? []}
      services={svc}
      blocks={blocks.data ?? []}
      hours={hours.data ?? []}
      filters={{ prof: sp.prof ?? "", serv: sp.serv ?? "", status: sp.status ?? "" }}
      openNew={sp.novo === "1"}
      presetCustomer={presetCustomer}
      opened={opened}
      permissions={{
        manage: panel.can("appointments.manage_all") || panel.can("appointments.manage_own"),
        finance: panel.can("finance.manage"),
        ownProfessionalId: panel.role === "professional" ? (me.data?.id ?? null) : null,
      }}
      autoConfirm={shop.auto_confirm}
    />
  );
}
