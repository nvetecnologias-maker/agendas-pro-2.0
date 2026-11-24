"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarPlus, CalendarX2, ChevronLeft, Clock, Loader2, MapPin, MessageCircle, UserRound } from "lucide-react";
import { toast, Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { formatDayLong, toLocalTime } from "@/lib/datetime";
import { whatsappLink } from "@/lib/appointments/status";
import { buildIcs, downloadIcs, googleCalendarLink } from "@/lib/ics";
import { brandColor, mapsLink, onBrand, shopAddress, type PublicAppointment } from "@/lib/public-booking/types";
import { cancelBookingAction } from "@/app/[slug]/actions";

const STATUS: Record<PublicAppointment["status"], { label: string; cls: string }> = {
  pending: { label: "Aguardando confirmação", cls: "bg-warning/15 text-warning" },
  confirmed: { label: "Confirmado", cls: "bg-success/15 text-success" },
  in_progress: { label: "Em atendimento", cls: "bg-sky/15 text-sky" },
  completed: { label: "Concluído", cls: "bg-white/10 text-halo" },
  cancelled: { label: "Cancelado", cls: "bg-danger/15 text-danger" },
  no_show: { label: "Não compareceu", cls: "bg-white/10 text-muted-foreground" },
};

export function ManageBooking({ initial }: { initial: PublicAppointment }) {
  const [appt, setAppt] = React.useState(initial);
  const [confirming, setConfirming] = React.useState(false);
  const [pending, start] = React.useTransition();
  const tz = appt.shop.timezone;
  const brand = brandColor(appt.shop.branding);
  const ink = onBrand(brand);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(appt.starts_at));
  const addr = shopAddress(appt.shop);
  const maps = mapsLink(appt.shop);
  const st = STATUS[appt.status];
  const active = appt.status === "pending" || appt.status === "confirmed";
  const ev = { title: `${appt.service_name} · ${appt.shop.name}`, start: appt.starts_at, end: appt.ends_at, location: addr.full || undefined, description: `Com ${appt.professional_name}` };

  const cancel = () =>
    start(async () => {
      const r = await cancelBookingAction(appt.token);
      if (!r.ok) return void toast.error(r.error);
      setAppt(r.data!);
      setConfirming(false);
      toast.success("Agendamento cancelado.");
    });

  return (
    <main className="min-h-svh bg-ink px-4 pb-16 pt-6 text-halo">
      <Toaster theme="dark" position="top-center" richColors />
      <div className="mx-auto max-w-md">
        <Link href={`/${appt.shop.slug}`} className="inline-flex h-11 items-center gap-1 text-[14px] text-muted-foreground">
          <ChevronLeft className="size-4" /> {appt.shop.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Meu agendamento</h1>
        <span className={cn("mt-3 inline-flex h-7 items-center rounded-full px-3 text-[13px] font-medium", st.cls)}>{st.label}</span>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-surface-1">
          <div className="p-4" style={{ background: `linear-gradient(135deg, ${brand}33, transparent 70%)` }}>
            <p className="text-lg font-semibold">{appt.service_name}</p>
            <p className="mt-1 text-[15px] text-halo">{formatDayLong(day)}</p>
            <p className="flex items-center gap-1.5 text-[14px] text-muted-foreground"><Clock className="size-4" /> {toLocalTime(appt.starts_at, tz)}–{toLocalTime(appt.ends_at, tz)}</p>
          </div>
          <dl className="divide-y divide-white/[0.06] px-4 text-[14px]">
            <div className="flex items-center justify-between py-3"><dt className="flex items-center gap-1.5 text-muted-foreground"><UserRound className="size-4" /> Profissional</dt><dd>{appt.professional_name}</dd></div>
            <div className="flex items-center justify-between py-3"><dt className="text-muted-foreground">Valor</dt><dd className="font-mono">{formatMoney(appt.price_cents)}</dd></div>
            <div className="flex items-center justify-between py-3"><dt className="text-muted-foreground">Cliente</dt><dd>{appt.customer_name}</dd></div>
          </dl>
        </div>

        {addr.full && (
          <a href={maps ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-4 text-[14px]">
            <MapPin className="size-5 shrink-0 text-sky" />
            <span><span className="block">{addr.line1}</span><span className="block text-muted-foreground">{addr.line2}</span></span>
          </a>
        )}

        {active && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => downloadIcs("agendamento.ics", buildIcs({ uid: appt.token, ...ev }))}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/[0.06] text-[14px] font-medium">
              <CalendarPlus className="size-4" /> Salvar na agenda
            </button>
            <a href={googleCalendarLink(ev)} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/[0.06] text-[14px] font-medium">
              <CalendarPlus className="size-4" /> Google Agenda
            </a>
          </div>
        )}
        {appt.shop.whatsapp && (
          <a href={whatsappLink(appt.shop.whatsapp, `Olá! Sobre meu agendamento de ${formatDayLong(day)} às ${toLocalTime(appt.starts_at, tz)} (${appt.customer_name}).`)}
            target="_blank" rel="noopener noreferrer"
            className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-[14px] font-semibold text-[#052e16]">
            <MessageCircle className="size-4" /> Falar com a barbearia
          </a>
        )}

        {active && (
          <div className="mt-8 rounded-2xl border border-white/[0.07] p-4">
            {appt.can_cancel ? (
              confirming ? (
                <div>
                  <p className="text-[14px] text-halo">Cancelar este horário? Ele ficará livre para outra pessoa.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setConfirming(false)} className="h-12 rounded-xl bg-white/[0.06] text-[14px]">Manter</button>
                    <button type="button" onClick={cancel} disabled={pending} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-danger text-[14px] font-semibold text-white">
                      {pending && <Loader2 className="size-4 animate-spin" />} Sim, cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className="flex h-11 w-full items-center justify-center gap-2 text-[14px] font-medium text-danger">
                  <CalendarX2 className="size-4" /> Cancelar agendamento
                </button>
              )
            ) : (
              <p className="text-center text-[13px] text-muted-foreground">
                O cancelamento pelo link vale até {appt.shop.cancellation_min_hours}h antes. Para mudanças, fale com a barbearia.
              </p>
            )}
          </div>
        )}

        {!active && (
          <Link href={`/${appt.shop.slug}`} className="mt-6 flex h-14 items-center justify-center rounded-2xl text-[16px] font-semibold" style={{ background: brand, color: ink }}>
            Agendar novo horário
          </Link>
        )}
      </div>
    </main>
  );
}
