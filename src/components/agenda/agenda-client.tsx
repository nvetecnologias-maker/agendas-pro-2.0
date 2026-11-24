"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Segmented, Select } from "@/components/ui/form-controls";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { EmptyState } from "@/components/panel/page-header";
import { cn } from "@/lib/utils";
import {
  addDays, endOfMonth, formatDayLong, formatDayShort, formatMonthYear, formatWeekdayShort,
  minutesOfDay, startOfMonth, startOfWeek, toLocalDay, toLocalTime, weekday,
} from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { STATUS_META, formatDuration, formatPhone } from "@/lib/appointments/status";
import type { AppointmentStatus } from "@/types/database";
import type { AgendaAppointment, AgendaBlock, AgendaPermissions, AgendaProfessional, AgendaService, AgendaView } from "./types";
import { AppointmentDetail } from "./appointment-detail";
import { AppointmentForm, type FormDefaults } from "./appointment-form";

type Props = {
  view: AgendaView;
  day: string;
  range: { from: string; to: string };
  today: string;
  tz: string;
  appointments: AgendaAppointment[];
  professionals: AgendaProfessional[];
  services: AgendaService[];
  blocks: AgendaBlock[];
  hours: { weekday: number; starts_at: string; ends_at: string; professional_id: string | null }[];
  filters: { prof: string; serv: string; status: string };
  openNew: boolean;
  presetCustomer: { id: string; name: string; phone: string } | null;
  opened: AgendaAppointment | null;
  permissions: AgendaPermissions;
  autoConfirm: boolean;
};

const VIEW_OPTIONS: { value: AgendaView; label: string }[] = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "lista", label: "Lista" },
];

export function AgendaClient(props: Props) {
  const { view, day, today, tz, appointments, professionals, services, blocks, filters, permissions } = props;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [selected, setSelected] = React.useState<AgendaAppointment | null>(props.opened);
  const [form, setForm] = React.useState<FormDefaults | null>(props.openNew && permissions.manage ? { day: day < today ? today : day, customer: props.presetCustomer ?? undefined } : null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const go = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("novo");
      next.delete("cliente");
      next.delete("ag");
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const step = (dir: -1 | 1) => {
    if (view === "dia") go({ dia: addDays(day, dir) });
    else if (view === "semana") go({ dia: addDays(day, dir * 7) });
    else {
      const first = startOfMonth(day);
      go({ dia: dir === 1 ? addDays(endOfMonth(day), 1) : startOfMonth(addDays(first, -1)) });
    }
  };

  const title =
    view === "dia" ? (day === today ? "Hoje" : formatDayLong(day))
    : view === "semana" ? `${formatDayShort(props.range.from)} a ${formatDayShort(props.range.to)}`
    : formatMonthYear(day);

  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return appointments;
    const digits = q.replace(/\D/g, "");
    return appointments.filter(
      (a) => a.customer?.name.toLowerCase().includes(q) || (digits.length >= 3 && a.customer?.phone.includes(digits)),
    );
  }, [appointments, search]);

  const activeFilters = [filters.prof, filters.serv, filters.status].filter(Boolean).length;
  const lanes = professionals.filter((p) => (filters.prof ? p.id === filters.prof : p.is_active || appointments.some((a) => a.professional?.id === p.id)));

  const openNewAt = (d: FormDefaults) => permissions.manage && setForm(d);

  return (
    <div className="grid gap-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => step(-1)} aria-label="Anterior"><ChevronLeft className="size-5" /></Button>
          <h1 className="min-w-0 truncate px-1 text-xl font-semibold tracking-tight text-halo md:text-2xl">{title}</h1>
          <Button variant="ghost" size="icon" onClick={() => step(1)} aria-label="Próximo"><ChevronRight className="size-5" /></Button>
        </div>
        <div className="flex items-center gap-2">
          {day !== today && <Button variant="subtle" size="sm" onClick={() => go({ dia: null })}>Hoje</Button>}
          <label className="relative">
            <span className="sr-only">Ir para data</span>
            <input
              type="date"
              value={day}
              onChange={(e) => e.target.value && go({ dia: e.target.value })}
              className="h-9 w-10 cursor-pointer rounded-xl bg-white/5 text-transparent [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full [&::-webkit-calendar-picker-indicator]:opacity-0"
            />
            <CalendarDays className="pointer-events-none absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-halo" />
          </label>
          {permissions.manage && (
            <Button size="sm" className="max-lg:hidden" onClick={() => openNewAt({ day: day < today ? today : day })}>
              <Plus /> Novo agendamento
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented ariaLabel="Visualização" value={view} onChange={(v) => go({ view: v === "dia" ? null : v })} options={VIEW_OPTIONS} className="w-full sm:w-auto" />
        <Button variant="subtle" size="sm" onClick={() => setFiltersOpen(true)} className="relative">
          <Filter /> Filtros
          {activeFilters > 0 && <span className="grid size-5 place-items-center rounded-full bg-electric text-[11px] text-white">{activeFilters}</span>}
        </Button>
        <div className="relative min-w-0 flex-1 sm:max-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente"
            aria-label="Buscar cliente por nome ou telefone"
            className="h-9 w-full rounded-xl bg-white/5 pl-9 pr-3 text-sm text-halo placeholder:text-subtle-foreground outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>

      {/* Faixa de dias (visão diária) */}
      {view === "dia" && <DayStrip day={day} today={today} onPick={(d) => go({ dia: d })} />}

      {/* Chips de profissional */}
      {professionals.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" role="group" aria-label="Profissional">
          <Chip active={!filters.prof} onClick={() => go({ prof: null })}>Todos</Chip>
          {professionals.filter((p) => p.is_active).map((p) => (
            <Chip key={p.id} active={filters.prof === p.id} onClick={() => go({ prof: p.id })}>{p.name}</Chip>
          ))}
        </div>
      )}

      {view === "dia" && (
        <DayTimeline
          day={day}
          today={today}
          tz={tz}
          lanes={lanes}
          appointments={visible}
          blocks={blocks}
          hours={props.hours}
          onOpen={setSelected}
          onCreate={permissions.manage ? (time, professionalId) => openNewAt({ day, time, professionalId }) : undefined}
        />
      )}
      {view === "semana" && (
        <WeekView from={props.range.from} today={today} tz={tz} appointments={visible} onOpen={setSelected} onPickDay={(d) => go({ view: null, dia: d })} />
      )}
      {view === "mes" && (
        <MonthView day={day} today={today} tz={tz} appointments={visible} onPickDay={(d) => go({ view: null, dia: d })} />
      )}
      {view === "lista" && <ListView tz={tz} appointments={visible} onOpen={setSelected} />}

      {/* Filtros */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent title="Filtros">
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm text-halo">Profissional
              <Select value={filters.prof} onChange={(e) => go({ prof: e.target.value })}>
                <option value="">Todos</option>
                {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </label>
            <label className="grid gap-2 text-sm text-halo">Serviço
              <Select value={filters.serv} onChange={(e) => go({ serv: e.target.value })}>
                <option value="">Todos</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </label>
            <label className="grid gap-2 text-sm text-halo">Status
              <Select value={filters.status} onChange={(e) => go({ status: e.target.value })}>
                <option value="">Todos</option>
                {(Object.keys(STATUS_META) as AppointmentStatus[]).map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
              </Select>
            </label>
            <Button variant="subtle" onClick={() => { go({ prof: null, serv: null, status: null }); setFiltersOpen(false); }}>Limpar filtros</Button>
          </div>
        </SheetContent>
      </Sheet>

      <AppointmentDetail
        appointment={selected}
        tz={tz}
        permissions={permissions}
        onClose={() => setSelected(null)}
        onEdit={(a) => {
          setSelected(null);
          setForm({
            id: a.id,
            day: toLocalDay(a.starts_at, tz),
            time: toLocalTime(a.starts_at, tz),
            professionalId: a.professional?.id,
            serviceId: a.service?.id,
            customer: a.customer ?? undefined,
            notes: a.notes ?? "",
            priceCents: a.price_cents,
          });
        }}
      />

      <AppointmentForm
        defaults={form}
        onClose={() => setForm(null)}
        services={services}
        professionals={professionals.filter((p) => p.is_active)}
        tz={tz}
        today={today}
        lockedProfessionalId={permissions.ownProfessionalId}
        canEditPrice={permissions.finance}
        autoConfirm={props.autoConfirm}
      />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 rounded-lg border px-4 text-[13px] font-medium transition-colors",
        active ? "border-sky/40 bg-electric/25 text-halo" : "border-white/10 bg-white/[0.03] text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function DayStrip({ day, today, onPick }: { day: string; today: string; onPick: (d: string) => void }) {
  const start = startOfWeek(day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Dias da semana">
      {days.map((d) => {
        const active = d === day;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onPick(d)}
            aria-pressed={active}
            aria-label={formatDayLong(d)}
            className={cn(
              "grid justify-items-center gap-0.5 rounded-2xl py-2 transition-colors",
              active ? "bg-electric text-white shadow-[0_10px_24px_-10px_rgba(36,103,242,0.9)]" : "bg-white/[0.03] text-muted-foreground",
            )}
          >
            <span className="text-[11px] uppercase">{formatWeekdayShort(d)}</span>
            <span className={cn("font-mono text-lg font-semibold", !active && "text-halo")}>{Number(d.slice(8))}</span>
            <span className={cn("size-1 rounded-full", d === today ? (active ? "bg-white" : "bg-sky") : "bg-transparent")} />
          </button>
        );
      })}
    </div>
  );
}

const PX = 1.4; // pixels por minuto (84px por hora)

function DayTimeline({
  day, today, tz, lanes, appointments, blocks, hours, onOpen, onCreate,
}: {
  day: string;
  today: string;
  tz: string;
  lanes: AgendaProfessional[];
  appointments: AgendaAppointment[];
  blocks: AgendaBlock[];
  hours: Props["hours"];
  onOpen: (a: AgendaAppointment) => void;
  onCreate?: (time: string, professionalId: string) => void;
}) {
  const wd = weekday(day);
  const todays = hours.filter((h) => h.weekday === wd);
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  let start = todays.length ? Math.min(...todays.map((h) => toMin(h.starts_at))) : 8 * 60;
  let end = todays.length ? Math.max(...todays.map((h) => toMin(h.ends_at))) : 20 * 60;
  for (const a of appointments) {
    start = Math.min(start, minutesOfDay(a.starts_at, tz));
    end = Math.max(end, minutesOfDay(a.starts_at, tz) + a.duration_minutes);
  }
  start = Math.floor(start / 60) * 60;
  end = Math.min(24 * 60, Math.ceil(end / 60) * 60);
  const height = (end - start) * PX;
  const hoursList = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60);

  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (day !== today) return;
    const tick = () => setNow(minutesOfDay(new Date(), tz));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [day, today, tz]);

  const scroller = React.useRef<HTMLDivElement>(null);
  // Posiciona a linha do tempo uma vez por dia aberto: no "agora" se estiver no expediente,
  // senão no primeiro atendimento do dia. Não rola de novo a cada minuto.
  const firstAppt = appointments.length ? Math.min(...appointments.map((a) => minutesOfDay(a.starts_at, tz))) : null;
  const positioned = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!scroller.current || positioned.current === day) return;
    if (day === today && now === null) return; // espera o relógio
    const nowInside = now !== null && now >= start && now <= end;
    const target = nowInside ? now : firstAppt;
    if (target !== null) scroller.current.scrollTop = Math.max(0, (target - start) * PX - 120);
    positioned.current = day;
  }, [day, today, now, start, end, firstAppt]);

  if (!lanes.length) {
    return <EmptyState icon={CalendarDays} title="Nenhum profissional ativo" description="Cadastre um profissional para começar a agendar." />;
  }

  const shopClosed = todays.filter((h) => !h.professional_id).length === 0 && hours.some((h) => !h.professional_id);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-surface-1">
      {shopClosed && <p className="border-b border-white/5 bg-warning/10 px-4 py-2 text-[13px] text-warning">A barbearia não abre neste dia.</p>}
      <div ref={scroller} className="max-h-[calc(100svh-330px)] min-h-[420px] overflow-auto overscroll-contain">
        <div className="flex min-w-full" style={{ width: lanes.length > 2 ? `${56 + lanes.length * 168}px` : undefined }}>
          {/* coluna de horas */}
          <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-white/5 bg-surface-1">
            <div className="sticky top-0 z-10 h-11 border-b border-white/5 bg-surface-1" />
            <div className="relative" style={{ height }}>
              {hoursList.map((m) => (
                <span key={m} className="absolute right-2 -translate-y-1/2 font-mono text-[11px] text-subtle-foreground" style={{ top: (m - start) * PX }}>
                  {m < 24 * 60 ? `${String(m / 60).padStart(2, "0")}h` : ""}
                </span>
              ))}
            </div>
          </div>

          {lanes.map((lane) => {
            const laneAppts = appointments.filter((a) => a.professional?.id === lane.id);
            const laneBlocks = blocks.filter((b) => !b.professional_id || b.professional_id === lane.id);
            return (
              <div key={lane.id} className="relative min-w-[168px] flex-1 border-r border-white/5 last:border-r-0">
                <div className="sticky top-0 z-10 flex h-11 items-center justify-center border-b border-white/5 bg-surface-1/95 px-2 text-[13px] font-medium text-halo backdrop-blur">
                  <span className="truncate">{lane.name}</span>
                </div>
                <div
                  className="relative"
                  style={{ height }}
                  onClick={(e) => {
                    if (!onCreate || e.target !== e.currentTarget) return;
                    const y = e.nativeEvent.offsetY;
                    const m = Math.floor((start + y / PX) / 15) * 15;
                    onCreate(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`, lane.id);
                  }}
                >
                  {hoursList.map((m) => (
                    <div key={m} className="pointer-events-none absolute inset-x-0 border-t border-white/[0.05]" style={{ top: (m - start) * PX }} />
                  ))}
                  {laneBlocks.map((b) => {
                    const bs = Math.max(start, toLocalDay(b.starts_at, tz) < day ? 0 : minutesOfDay(b.starts_at, tz));
                    const be = Math.min(end, toLocalDay(b.ends_at, tz) > day ? 24 * 60 : minutesOfDay(b.ends_at, tz));
                    if (be <= bs) return null;
                    return (
                      <div
                        key={b.id}
                        className="pointer-events-none absolute inset-x-1 rounded-lg border border-white/5 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.05)_0_6px,transparent_6px_12px)] p-1.5 text-[11px] text-subtle-foreground"
                        style={{ top: (bs - start) * PX, height: (be - bs) * PX }}
                      >
                        {b.kind === "holiday" ? "Feriado" : b.kind === "day_off" ? "Folga" : "Bloqueado"}{b.reason ? ` · ${b.reason}` : ""}
                      </div>
                    );
                  })}
                  {laneAppts.map((a) => {
                    const s = minutesOfDay(a.starts_at, tz);
                    const meta = STATUS_META[a.status];
                    const h = Math.max(30, a.duration_minutes * PX - 2);
                    const faded = a.status === "cancelled" || a.status === "no_show";
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onOpen(a)}
                        className={cn(
                          "absolute inset-x-1 overflow-hidden rounded-xl border px-2.5 py-1.5 text-left shadow-[0_8px_20px_-12px_rgba(0,0,0,0.9)] transition-transform active:scale-[0.98]",
                          faded ? "border-white/5 bg-white/[0.04] opacity-60" : "border-sky/20 bg-[linear-gradient(160deg,#1a4fd6,#0e2f8f)]",
                        )}
                        style={{ top: (s - start) * PX + 1, height: h }}
                      >
                        <span className={cn("absolute inset-y-1.5 left-1 w-[3px] rounded-full", meta.bar)} aria-hidden />
                        <span className="block truncate pl-1.5 text-[13px] font-medium text-white">
                          <span className="font-mono text-[12px] text-sky">{toLocalTime(a.starts_at, tz)}</span> {a.customer?.name}
                        </span>
                        {h > 44 && <span className="block truncate pl-1.5 text-[12px] text-white/70">{a.service?.name}</span>}
                        <span className="sr-only">{meta.label}</span>
                      </button>
                    );
                  })}
                  {now !== null && now >= start && now <= end && (
                    <div className="pointer-events-none absolute inset-x-0 z-[5] border-t-2 border-danger" style={{ top: (now - start) * PX }}>
                      <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-danger" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {onCreate && <p className="border-t border-white/5 px-4 py-2 text-[12px] text-subtle-foreground">Toque num horário vazio para agendar.</p>}
    </div>
  );
}

function ApptRow({ a, tz, onOpen, showDate }: { a: AgendaAppointment; tz: string; onOpen: (a: AgendaAppointment) => void; showDate?: boolean }) {
  const meta = STATUS_META[a.status];
  return (
    <button type="button" onClick={() => onOpen(a)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/5">
      <div className="w-12 shrink-0 text-center">
        <p className="font-mono text-[15px] font-semibold text-halo">{toLocalTime(a.starts_at, tz)}</p>
        <p className="text-[11px] text-subtle-foreground">{showDate ? formatDayShort(toLocalDay(a.starts_at, tz)) : formatDuration(a.duration_minutes)}</p>
      </div>
      <span className={cn("h-10 w-1 shrink-0 rounded-full", meta.bar)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px] font-medium text-halo", a.status === "cancelled" && "line-through opacity-60")}>{a.customer?.name}</p>
        <p className="truncate text-[13px] text-muted-foreground">{a.service?.name} · {a.professional?.name}</p>
      </div>
      <div className="grid shrink-0 justify-items-end gap-1">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className="font-mono text-[12px] text-subtle-foreground">{formatMoney(a.price_cents)}</span>
      </div>
    </button>
  );
}

function WeekView({ from, today, tz, appointments, onOpen, onPickDay }: {
  from: string; today: string; tz: string; appointments: AgendaAppointment[];
  onOpen: (a: AgendaAppointment) => void; onPickDay: (d: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  return (
    <div className="grid gap-3 lg:grid-cols-7 lg:gap-2">
      {days.map((d) => {
        const list = appointments.filter((a) => toLocalDay(a.starts_at, tz) === d);
        return (
          <section key={d} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-surface-1">
            <button type="button" onClick={() => onPickDay(d)} className={cn("flex w-full items-center justify-between px-4 py-2.5 lg:px-3", d === today && "bg-electric/15")}>
              <span className="text-sm font-medium capitalize text-halo">
                {formatWeekdayShort(d)} <span className="font-mono text-muted-foreground">{formatDayShort(d)}</span>
              </span>
              <span className="text-xs text-subtle-foreground">{list.length || ""}</span>
            </button>
            {list.length ? (
              <ul className="divide-y divide-white/[0.05] border-t border-white/5">
                {list.map((a) => (
                  <li key={a.id} className="lg:hidden"><ApptRow a={a} tz={tz} onOpen={onOpen} /></li>
                ))}
                {list.map((a) => (
                  <li key={`c-${a.id}`} className="hidden lg:block">
                    <button type="button" onClick={() => onOpen(a)} className="w-full px-3 py-2 text-left hover:bg-white/5">
                      <p className="flex items-center gap-1.5 text-[12px]">
                        <span className={cn("size-1.5 rounded-full", STATUS_META[a.status].bar)} />
                        <span className="font-mono text-sky">{toLocalTime(a.starts_at, tz)}</span>
                      </p>
                      <p className="truncate text-[13px] text-halo">{a.customer?.name}</p>
                      <p className="truncate text-[11px] text-subtle-foreground">{a.service?.name}</p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border-t border-white/5 px-4 py-3 text-[13px] text-subtle-foreground lg:px-3">Livre</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function MonthView({ day, today, tz, appointments, onPickDay }: {
  day: string; today: string; tz: string; appointments: AgendaAppointment[]; onPickDay: (d: string) => void;
}) {
  const first = startOfMonth(day);
  const gridStart = startOfWeek(first);
  const last = endOfMonth(day);
  const cells: string[] = [];
  for (let d = gridStart; d <= last || cells.length % 7 !== 0; d = addDays(d, 1)) cells.push(d);
  const counts = new Map<string, number>();
  for (const a of appointments) {
    if (a.status === "cancelled") continue;
    const k = toLocalDay(a.starts_at, tz);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-surface-1">
      <div className="grid grid-cols-7 border-b border-white/5 text-center text-[11px] uppercase text-subtle-foreground">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((w) => <span key={w} className="py-2">{w}</span>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const n = counts.get(d) ?? 0;
          const out = d.slice(0, 7) !== day.slice(0, 7);
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPickDay(d)}
              aria-label={`${formatDayLong(d)}: ${n} agendamento(s)`}
              className={cn("flex min-h-[62px] flex-col items-center justify-start gap-1 border-b border-r border-white/[0.04] p-1 pt-2 sm:min-h-[88px]", out && "opacity-35")}
            >
              <span className={cn("grid size-7 place-items-center rounded-full font-mono text-[13px]", d === today ? "bg-electric text-white" : "text-halo")}>
                {Number(d.slice(8))}
              </span>
              {n > 0 && <span className="rounded-md bg-sky/15 px-1.5 text-[11px] font-medium text-sky">{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ tz, appointments, onOpen }: { tz: string; appointments: AgendaAppointment[]; onOpen: (a: AgendaAppointment) => void }) {
  if (!appointments.length) {
    return <EmptyState icon={CalendarDays} title="Nenhum agendamento" description="Nada encontrado com os filtros atuais neste mês." />;
  }
  const groups = new Map<string, AgendaAppointment[]>();
  for (const a of appointments) {
    const k = toLocalDay(a.starts_at, tz);
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  return (
    <div className="grid gap-3">
      {[...groups.entries()].map(([d, list]) => (
        <section key={d} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-surface-1">
          <h2 className="border-b border-white/5 px-4 py-2.5 text-sm font-medium text-halo">{formatDayLong(d)}</h2>
          <ul className="divide-y divide-white/[0.05]">
            {list.map((a) => (
              <li key={a.id}>
                <ApptRow a={a} tz={tz} onOpen={onOpen} />
                <p className="-mt-2 px-4 pb-2 pl-[76px] text-[12px] text-subtle-foreground">{formatPhone(a.customer?.phone)}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
