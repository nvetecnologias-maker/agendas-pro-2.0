"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft, CalendarCheck2, CalendarPlus, Check, ChevronRight, Clock, Eye, AtSign, Loader2, MapPin,
  MessageCircle, Navigation, Phone, Scissors, Share2, Sparkles, UserRound, Users,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/form-controls";
import { formatMoney } from "@/lib/money";
import { formatDuration, formatPhone, whatsappLink } from "@/lib/appointments/status";
import {
  addDays, formatDayLong, minutesOfDay, todayLocal, toLocalTime, weekday, WEEKDAYS, WEEKDAYS_SHORT,
} from "@/lib/datetime";
import { buildIcs, downloadIcs, googleCalendarLink } from "@/lib/ics";
import {
  brandColor, mapsLink, onBrand, shopAddress,
  type PublicAppointment, type PublicHour, type PublicPage, type PublicProfessional, type PublicService, type Slot,
} from "@/lib/public-booking/types";
import { createBookingAction, getPublicSlotsAction } from "@/app/[slug]/actions";

type Data = Extract<PublicPage, { status: "ok" }>;
type Step = "servico" | "profissional" | "horario" | "dados" | "feito";
const ANY = "any";
const STORE = "ap:cliente";

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Aberto agora? Calculado só no navegador (evita divergência de hidratação). */
function useOpenNow(hours: PublicHour[], tz: string) {
  const [state, setState] = React.useState<{ open: boolean; label: string } | null>(null);
  React.useEffect(() => {
    const today = todayLocal(tz);
    const wd = weekday(today);
    const now = minutesOfDay(new Date(), tz);
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const todays = hours.filter((h) => h.weekday === wd);
    const current = todays.find((h) => now >= toMin(h.starts_at) && now < toMin(h.ends_at));
    if (current) return setState({ open: true, label: `Aberto agora · até ${current.ends_at}` });
    const later = todays.find((h) => toMin(h.starts_at) > now);
    if (later) return setState({ open: false, label: `Fechado · abre às ${later.starts_at}` });
    for (let i = 1; i <= 7; i++) {
      const next = hours.filter((h) => h.weekday === (wd + i) % 7);
      if (next.length) return setState({ open: false, label: `Fechado · abre ${i === 1 ? "amanhã" : WEEKDAYS[(wd + i) % 7].toLowerCase()} às ${next[0].starts_at}` });
    }
    setState({ open: false, label: "Fechado" });
  }, [hours, tz]);
  return state;
}

export function BookingFlow({ data, preview }: { data: Data; preview: boolean }) {
  const { shop, services, professionals, hours, accepting } = data;
  const tz = shop.timezone;
  const brand = brandColor(shop.branding);
  const ink = onBrand(brand);
  const showPros = shop.branding?.show_professionals !== false;

  const [step, setStep] = React.useState<Step>("servico");
  const [service, setService] = React.useState<PublicService | null>(null);
  const [proId, setProId] = React.useState<string>(ANY);
  const [day, setDay] = React.useState<string | null>(null);
  const [slot, setSlot] = React.useState<Slot | null>(null);
  const [result, setResult] = React.useState<PublicAppointment | null>(null);
  const topRef = React.useRef<HTMLDivElement>(null);

  const prosForService = React.useMemo(
    () => (service ? professionals.filter((p) => service.professional_ids?.includes(p.id)) : []),
    [service, professionals],
  );
  const pro = professionals.find((p) => p.id === proId) ?? null;

  const go = (s: Step) => {
    setStep(s);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const pickService = (s: PublicService) => {
    setService(s);
    setSlot(null);
    const eligible = professionals.filter((p) => s.professional_ids?.includes(p.id));
    if (!eligible.some((p) => p.id === proId)) setProId(ANY);
    go(eligible.length > 1 && showPros ? "profissional" : "horario");
    if (eligible.length === 1) setProId(eligible[0].id);
  };

  const stepsOrder: Step[] = prosForService.length > 1 && showPros ? ["servico", "profissional", "horario", "dados"] : ["servico", "horario", "dados"];
  const stepIndex = stepsOrder.indexOf(step);
  const back = () => go(stepsOrder[Math.max(0, stepIndex - 1)]);

  return (
    <div
      className="min-h-svh bg-ink text-halo"
      style={{ "--brand": brand, "--on-brand": ink } as React.CSSProperties}
    >
      <Toaster theme="dark" position="top-center" richColors />
      {preview && (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-[#B98226] px-4 py-2 text-center text-[13px] font-medium text-ink">
          <Eye className="size-4 shrink-0" />
          {accepting ? "Pré-visualização da sua página" : "Pré-visualização: publique sua agenda para receber agendamentos"}
        </div>
      )}

      <Hero data={data} compact={step !== "servico"} />

      <main ref={topRef} className={cn("mx-auto w-full max-w-xl scroll-mt-4 px-4 pt-5", step === "horario" || step === "dados" ? "pb-40" : "pb-12")}>
        {step !== "servico" && step !== "feito" && (
          <div className="mb-5 flex items-center gap-3">
            <button type="button" onClick={back} aria-label="Voltar"
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-halo active:scale-95">
              <ArrowLeft className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-subtle-foreground">Passo {stepIndex + 1} de {stepsOrder.length}</p>
              <div className="mt-1.5 flex gap-1.5">
                {stepsOrder.map((s, i) => (
                  <span key={s} className="h-1 flex-1 rounded-full bg-white/10" style={i <= stepIndex ? { background: brand } : undefined} />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "servico" && (
          <ServiceStep services={services} onPick={pickService} brand={brand} welcome={shop.branding?.welcome} />
        )}
        {step === "profissional" && service && (
          <ProfessionalStep pros={prosForService} value={proId} brand={brand}
            onPick={(id) => { setProId(id); setSlot(null); go("horario"); }} />
        )}
        {step === "horario" && service && (
          <TimeStep
            shopId={shop.id} tz={tz} hours={hours} service={service} proId={proId === ANY ? null : proId}
            maxDays={Math.min(shop.max_advance_days, 60)} brand={brand} ink={ink}
            day={day} setDay={setDay} slot={slot}
            onPick={(s) => setSlot(s)}
            proName={pro?.name ?? null}
          />
        )}
        {step === "dados" && service && slot && (
          <DetailsStep
            slug={shop.slug} service={service} slot={slot} tz={tz} proName={pro?.name ?? professionals.find((p) => p.id === slot.professional_id)?.name ?? null}
            anyPro={proId === ANY} brand={brand} ink={ink} disabled={!accepting}
            policy={shop.cancellation_policy} cancelHours={shop.cancellation_min_hours}
            onDone={(r) => { setResult(r); go("feito"); }}
            onSlotTaken={() => { setSlot(null); go("horario"); }}
          />
        )}
        {step === "feito" && result && <Done result={result} shopAddress={shopAddress(shop).full} brand={brand} ink={ink} onAgain={() => { setService(null); setSlot(null); setResult(null); go("servico"); }} />}

        {step === "servico" && <ShopInfo data={data} showPros={showPros} />}
      </main>

      {step === "horario" && service && (
        <BottomBar brand={brand} ink={ink}
          summary={slot ? `${shortDay(toLocalDayFromIso(slot.starts_at, tz))} · ${toLocalTime(slot.starts_at, tz)}` : "Escolha um horário"}
          detail={`${service.name} · ${formatMoney(service.price_cents)}`}
          disabled={!slot} label="Continuar" onClick={() => go("dados")} />
      )}
      <p className="pb-8 text-center text-[12px] text-subtle-foreground">
        Agendamento online por <Link href="/" className="font-medium text-sky">Agendas Pro</Link>
      </p>
    </div>
  );
}

function shortDay(day: string) {
  return `${WEEKDAYS[weekday(day)]}, ${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

function toLocalDayFromIso(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
function Hero({ data, compact }: { data: Data; compact: boolean }) {
  const { shop, hours } = data;
  const status = useOpenNow(hours, shop.timezone);
  const addr = shopAddress(shop);
  const maps = mapsLink(shop);
  const share = async () => {
    const url = window.location.href.split("?")[0];
    try {
      if (navigator.share) await navigator.share({ title: shop.name, text: `Agende seu horário na ${shop.name}`, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
    } catch { /* cancelado */ }
  };

  return (
    <header className="relative">
      <div className={cn("relative overflow-hidden transition-[height] duration-300", compact ? "h-24" : "h-44 sm:h-56")}>
        {shop.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.cover_url} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(120% 140% at 15% 0%, var(--brand) 0%, #02006F 45%, #030B20 100%)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-ink" />
      </div>
      <div className={cn("relative z-10 mx-auto max-w-xl px-4", compact ? "-mt-10" : "-mt-12")}>
        <div className="flex items-end gap-3">
          <div className={cn("shrink-0 overflow-hidden rounded-2xl border-4 border-ink bg-surface-2 shadow-deep", compact ? "size-16" : "size-20")}>
            {shop.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.logo_url} alt={`Logo ${shop.name}`} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-xl font-semibold" style={{ background: "var(--brand)", color: "var(--on-brand)" }}>
                {shop.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </div>
            )}
          </div>
          {!compact && (
            <div className="ml-auto flex gap-2 pb-1">
              {shop.whatsapp && (
                <a href={whatsappLink(shop.whatsapp, `Olá, ${shop.name}!`)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                  className="grid size-11 place-items-center rounded-xl bg-white/[0.08] backdrop-blur active:scale-95"><MessageCircle className="size-5" /></a>
              )}
              {maps && (
                <a href={maps} target="_blank" rel="noopener noreferrer" aria-label="Como chegar"
                  className="grid size-11 place-items-center rounded-xl bg-white/[0.08] backdrop-blur active:scale-95"><Navigation className="size-5" /></a>
              )}
              <button type="button" onClick={share} aria-label="Compartilhar"
                className="grid size-11 place-items-center rounded-xl bg-white/[0.08] backdrop-blur active:scale-95"><Share2 className="size-5" /></button>
            </div>
          )}
        </div>
        <h1 className={cn("mt-3 font-semibold tracking-tight text-halo", compact ? "text-xl" : "text-[28px] leading-tight")}>{shop.name}</h1>
        {!compact && (
          <div className="mt-1.5 grid gap-1 text-[14px] text-muted-foreground">
            {addr.line2 && <p className="flex items-center gap-1.5"><MapPin className="size-4 shrink-0" /> {addr.line2}</p>}
            {status && (
              <p className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", status.open ? "bg-success" : "bg-white/30")} />
                <span className={status.open ? "text-success" : ""}>{status.label}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
function ServiceStep({ services, onPick, brand, welcome }: { services: PublicService[]; onPick: (s: PublicService) => void; brand: string; welcome?: string }) {
  return (
    <section aria-labelledby="servicos" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {welcome && <p className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-[14px] text-muted-foreground">{welcome}</p>}
      <h2 id="servicos" className="mb-3 text-lg font-semibold text-halo">Escolha o serviço</h2>
      {services.length === 0 ? (
        <p className="rounded-2xl border border-white/[0.07] bg-surface-1 p-6 text-center text-sm text-muted-foreground">
          Nenhum serviço disponível para agendamento online no momento.
        </p>
      ) : (
        <ul className="grid gap-2.5">
          {services.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onPick(s)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-3.5 text-left transition active:scale-[0.99] hover:border-white/15">
                {s.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image_url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-xl" style={{ background: `${brand}22`, color: brand }}>
                    <Scissors className="size-6" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-halo">{s.name}</span>
                  {s.description && <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted-foreground">{s.description}</span>}
                  <span className="mt-1 flex items-center gap-1.5 text-[13px] text-subtle-foreground"><Clock className="size-3.5" /> {formatDuration(s.duration_minutes)}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="font-mono text-[15px] text-halo">{formatMoney(s.price_cents)}</span>
                  <span className="inline-flex h-8 items-center gap-0.5 rounded-lg px-3 text-[13px] font-medium" style={{ background: "var(--brand)", color: "var(--on-brand)" }}>
                    Agendar <ChevronRight className="size-3.5" />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
function ProfessionalStep({ pros, value, onPick, brand }: { pros: PublicProfessional[]; value: string; onPick: (id: string) => void; brand: string }) {
  const Item = ({ id, name, sub, photo }: { id: string; name: string; sub: string; photo?: string | null }) => (
    <li>
      <button type="button" onClick={() => onPick(id)} aria-pressed={value === id}
        className={cn("flex w-full items-center gap-3 rounded-2xl border bg-surface-1 p-3.5 text-left transition active:scale-[0.99]",
          value === id ? "border-[color:var(--brand)]" : "border-white/[0.07]")}>
        {id === ANY ? (
          <span className="grid size-12 shrink-0 place-items-center rounded-full" style={{ background: `${brand}22`, color: brand }}><Users className="size-5" /></span>
        ) : (
          <Avatar name={name} src={photo} className="size-12" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-halo">{name}</span>
          <span className="block truncate text-[13px] text-muted-foreground">{sub}</span>
        </span>
        <ChevronRight className="size-5 text-subtle-foreground" />
      </button>
    </li>
  );
  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="mb-3 text-lg font-semibold text-halo">Com quem?</h2>
      <ul className="grid gap-2.5">
        <Item id={ANY} name="Sem preferência" sub="Mostra todos os horários livres" />
        {pros.map((p) => <Item key={p.id} id={p.id} name={p.name} sub={p.specialties.join(" · ") || "Profissional"} photo={p.photo_url} />)}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
function TimeStep({
  shopId, tz, hours, service, proId, proName, maxDays, brand, ink, day, setDay, slot, onPick,
}: {
  shopId: string; tz: string; hours: PublicHour[]; service: PublicService; proId: string | null; proName: string | null;
  maxDays: number; brand: string; ink: string; day: string | null; setDay: (d: string) => void; slot: Slot | null; onPick: (s: Slot) => void;
}) {
  const [today, setToday] = React.useState<string | null>(null);
  React.useEffect(() => setToday(todayLocal(tz)), [tz]);
  const openDays = React.useMemo(() => new Set(hours.map((h) => h.weekday)), [hours]);
  const days = React.useMemo(() => (today ? Array.from({ length: maxDays + 1 }, (_, i) => addDays(today, i)) : []), [today, maxDays]);
  const [cache, setCache] = React.useState<Record<string, Slot[] | "error">>({});
  const [loading, setLoading] = React.useState(false);
  const key = (d: string) => `${service.id}|${proId ?? ANY}|${d}`;
  const stripRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async (d: string) => {
    const r = await getPublicSlotsAction({ shopId, serviceId: service.id, day: d, professionalId: proId });
    const v = r.ok ? r.data ?? [] : ("error" as const);
    setCache((c) => ({ ...c, [key(d)]: v }));
    return v;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, service.id, proId]);

  // Primeiro dia: o primeiro com horário livre (até 14 dias à frente)
  React.useEffect(() => {
    if (!days.length) return;
    let cancelled = false;
    (async () => {
      if (day && cache[key(day)] !== undefined) return;
      setLoading(true);
      if (day) { await load(day); setLoading(false); return; }
      for (const d of days.slice(0, 14)) {
        if (!openDays.has(weekday(d)) && openDays.size) continue;
        const v = await load(d);
        if (cancelled) return;
        if (v !== "error" && v.length) { setDay(d); break; }
      }
      if (!cancelled && !day) setDay(days.find((d) => !openDays.size || openDays.has(weekday(d))) ?? days[0]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, day, proId, service.id]);

  React.useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-day="${day}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [day]);

  const slots = day ? cache[key(day)] : undefined;
  const groups = React.useMemo(() => {
    if (!Array.isArray(slots)) return [];
    const g: { label: string; items: Slot[] }[] = [{ label: "Manhã", items: [] }, { label: "Tarde", items: [] }, { label: "Noite", items: [] }];
    for (const s of slots) {
      const m = minutesOfDay(s.starts_at, tz);
      g[m < 12 * 60 ? 0 : m < 18 * 60 ? 1 : 2].items.push(s);
    }
    return g.filter((x) => x.items.length);
  }, [slots, tz]);

  const nextWithSlots = async () => {
    if (!day) return;
    setLoading(true);
    let i = days.indexOf(day) + 1;
    for (let n = 0; n < 21 && i < days.length; n++, i++) {
      const d = days[i];
      if (openDays.size && !openDays.has(weekday(d))) continue;
      const v = cache[key(d)] ?? (await load(d));
      if (v !== "error" && v.length) { setDay(d); setLoading(false); return; }
    }
    setLoading(false);
    toast.info("Sem horários livres nos próximos dias.");
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="text-lg font-semibold text-halo">Escolha o dia e o horário</h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{service.name} · {formatDuration(service.duration_minutes)}{proName ? ` · com ${proName}` : ""}</p>

      <div ref={stripRef} className="-mx-4 mt-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {days.map((d) => {
          const closed = openDays.size > 0 && !openDays.has(weekday(d));
          const active = d === day;
          const empty = Array.isArray(cache[key(d)]) && (cache[key(d)] as Slot[]).length === 0;
          return (
            <button key={d} type="button" data-day={d} disabled={closed} onClick={() => setDay(d)} aria-pressed={active}
              className={cn("grid h-[72px] w-[58px] shrink-0 snap-start place-items-center content-center gap-0.5 rounded-2xl border text-center transition active:scale-95",
                active ? "border-transparent" : "border-white/[0.07] bg-surface-1", closed && "opacity-35", empty && !active && "opacity-60")}
              style={active ? { background: brand, color: ink } : undefined}>
              <span className="text-[11px] uppercase tracking-wide opacity-80">{d === today ? "Hoje" : WEEKDAYS_SHORT[weekday(d)]}</span>
              <span className="font-mono text-lg font-semibold">{d.slice(8, 10)}</span>
              <span className="text-[10px] opacity-70">{["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(d.slice(5, 7)) - 1]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 min-h-48" aria-live="polite">
        {day && <p className="mb-3 text-[14px] font-medium text-halo">{formatDayLong(day)}</p>}
        {(slots === undefined || loading) && !groups.length ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }, (_, i) => <span key={i} className="h-11 animate-pulse rounded-xl bg-white/[0.05]" />)}
          </div>
        ) : slots === "error" ? (
          <p className="rounded-2xl bg-surface-1 p-5 text-center text-sm text-muted-foreground">Não foi possível carregar os horários. Tente outro dia.</p>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-surface-1 p-5 text-center">
            <p className="text-sm text-muted-foreground">Sem horários livres neste dia.</p>
            <button type="button" onClick={nextWithSlots} disabled={loading}
              className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium" style={{ background: brand, color: ink }}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Próximo dia com horário
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {groups.map((g) => (
              <div key={g.label}>
                <p className="mb-2 text-[12px] uppercase tracking-wide text-subtle-foreground">{g.label}</p>
                <div className="grid grid-cols-4 gap-2">
                  {g.items.map((s) => {
                    const sel = slot?.starts_at === s.starts_at;
                    return (
                      <button key={s.starts_at} type="button" onClick={() => onPick(s)} aria-pressed={sel}
                        className={cn("h-11 rounded-xl border font-mono text-[15px] transition active:scale-95", sel ? "border-transparent font-semibold" : "border-white/[0.08] bg-surface-1 text-halo")}
                        style={sel ? { background: brand, color: ink } : undefined}>
                        {toLocalTime(s.starts_at, tz)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
function DetailsStep({
  slug, service, slot, tz, proName, anyPro, brand, ink, disabled, policy, cancelHours, onDone, onSlotTaken,
}: {
  slug: string; service: PublicService; slot: Slot; tz: string; proName: string | null; anyPro: boolean; brand: string; ink: string;
  disabled: boolean; policy: string | null; cancelHours: number;
  onDone: (r: PublicAppointment) => void; onSlotTaken: () => void;
}) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as { name?: string; phone?: string } | null;
      if (saved?.name) setName(saved.name);
      if (saved?.phone) setPhone(maskPhone(saved.phone));
    } catch { /* sem armazenamento */ }
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await createBookingAction({
        slug, serviceId: service.id, professionalId: anyPro ? null : slot.professional_id, startsAt: slot.starts_at, name, phone, notes,
      });
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
        if (/ocupado/.test(r.error)) onSlotTaken();
        return;
      }
      try { localStorage.setItem(STORE, JSON.stringify({ name, phone: phone.replace(/\D/g, "") })); } catch { /* ok */ }
      onDone(r.data!);
    });
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="text-lg font-semibold text-halo">Seus dados</h2>
      <div className="mt-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-4">
        <p className="text-[15px] font-medium text-halo">{service.name}</p>
        <p className="mt-1 text-[14px] text-muted-foreground">{formatDayLong(toLocalDayFromIso(slot.starts_at, tz))} · {toLocalTime(slot.starts_at, tz)} às {toLocalTime(slot.ends_at, tz)}</p>
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[14px]">
          <span className="flex items-center gap-1.5 text-muted-foreground"><UserRound className="size-4" /> {anyPro ? "Profissional disponível" : proName}</span>
          <span className="font-mono text-halo">{formatMoney(service.price_cents)}</span>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-4" noValidate>
        <label className="grid gap-2">
          <span className="text-[13px] font-medium text-muted-foreground">Nome</span>
          <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como podemos te chamar?" aria-invalid={!!errors.name} maxLength={120} />
          {errors.name && <span className="text-[13px] text-danger">{errors.name}</span>}
        </label>
        <label className="grid gap-2">
          <span className="text-[13px] font-medium text-muted-foreground">Celular (WhatsApp)</span>
          <Input type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(11) 91234-5678" aria-invalid={!!errors.phone} />
          {errors.phone && <span className="text-[13px] text-danger">{errors.phone}</span>}
        </label>
        <label className="grid gap-2">
          <span className="text-[13px] font-medium text-muted-foreground">Observação <span className="text-subtle-foreground">(opcional)</span></span>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="Ex.: degradê baixo, barba desenhada" />
        </label>
        <p className="text-[12px] leading-relaxed text-subtle-foreground">
          {policy ? `${policy} ` : ""}Você pode cancelar pelo link do agendamento até {cancelHours}h antes. Seus dados são usados pela barbearia para este atendimento, conforme a{" "}
          <Link href="/politica-de-privacidade" target="_blank" className="underline underline-offset-2 hover:text-halo">Política de Privacidade</Link>.
        </p>
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-ink/90 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-xl">
          <div className="mx-auto max-w-xl">
            <button type="submit" disabled={pending || disabled}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold shadow-lg transition active:scale-[0.98] disabled:opacity-50"
              style={{ background: brand, color: ink }}>
              {pending ? <Loader2 className="size-5 animate-spin" /> : <CalendarCheck2 className="size-5" />}
              {disabled ? "Agenda não publicada" : "Confirmar agendamento"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
function Done({ result, shopAddress: address, brand, ink, onAgain }: { result: PublicAppointment; shopAddress: string; brand: string; ink: string; onAgain: () => void }) {
  const tz = result.shop.timezone;
  const day = toLocalDayFromIso(result.starts_at, tz);
  const confirmed = result.status === "confirmed";
  const manage = `/${result.shop.slug}/agendamento/${result.token}`;
  const ev = {
    title: `${result.service_name} · ${result.shop.name}`,
    start: result.starts_at,
    end: result.ends_at,
    location: address || undefined,
    description: `Com ${result.professional_name}. Gerenciar: ${typeof window !== "undefined" ? window.location.origin : ""}${manage}`,
  };
  const wa = result.shop.whatsapp
    ? whatsappLink(result.shop.whatsapp, `Olá! Acabei de agendar ${result.service_name} para ${formatDayLong(day)} às ${toLocalTime(result.starts_at, tz)} (${result.customer_name}).`)
    : null;

  return (
    <section className="animate-in fade-in zoom-in-95 duration-300 text-center">
      <div className="mx-auto grid size-20 place-items-center rounded-full" style={{ background: brand, color: ink, boxShadow: `0 0 0 10px ${brand}22, 0 20px 60px -10px ${brand}` }}>
        <Check className="size-10" strokeWidth={2.5} />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-halo">{confirmed ? "Horário confirmado!" : "Agendamento enviado!"}</h2>
      <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted-foreground">
        {confirmed ? "Está tudo certo. Te esperamos!" : "A barbearia vai confirmar seu horário. Você pode acompanhar pelo link abaixo."}
      </p>

      <div className="mt-6 rounded-2xl border border-white/[0.07] bg-surface-1 p-4 text-left">
        <p className="text-[15px] font-medium text-halo">{result.service_name}</p>
        <p className="mt-1 text-[14px] text-muted-foreground">{formatDayLong(day)} · {toLocalTime(result.starts_at, tz)} às {toLocalTime(result.ends_at, tz)}</p>
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[14px]">
          <span className="flex items-center gap-1.5 text-muted-foreground"><UserRound className="size-4" /> {result.professional_name}</span>
          <span className="font-mono text-halo">{formatMoney(result.price_cents)}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => downloadIcs("agendamento.ics", buildIcs({ uid: result.token, ...ev }))}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/[0.06] text-[14px] font-medium text-halo active:scale-[0.98]">
          <CalendarPlus className="size-4" /> Salvar na agenda
        </button>
        <a href={googleCalendarLink(ev)} target="_blank" rel="noopener noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/[0.06] text-[14px] font-medium text-halo active:scale-[0.98]">
          <CalendarPlus className="size-4" /> Google Agenda
        </a>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-[14px] font-semibold text-[#052e16] active:scale-[0.98]">
            <MessageCircle className="size-4" /> Avisar a barbearia no WhatsApp
          </a>
        )}
      </div>
      <Link href={manage} className="mt-5 inline-flex h-11 items-center gap-1 text-[14px] font-medium" style={{ color: brand }}>
        Ver ou cancelar meu agendamento <ChevronRight className="size-4" />
      </Link>
      <div>
        <button type="button" onClick={onAgain} className="mt-1 h-11 text-[14px] text-muted-foreground">Fazer outro agendamento</button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
function ShopInfo({ data, showPros }: { data: Data; showPros: boolean }) {
  const { shop, professionals, hours } = data;
  const gallery = shop.branding?.gallery ?? [];
  const addr = shopAddress(shop);
  const maps = mapsLink(shop);
  const byDay = [1, 2, 3, 4, 5, 6, 0].map((wd) => ({ wd, ranges: hours.filter((h) => h.weekday === wd) }));
  const instagram = shop.social_links?.instagram;

  return (
    <div className="mt-10 grid gap-8">
      {shop.description && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-halo">Sobre</h2>
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground">{shop.description}</p>
        </section>
      )}

      {gallery.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-halo">Fotos</h2>
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
            {gallery.map((g) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={g} src={g} alt="" loading="lazy" className="h-44 w-36 shrink-0 snap-start rounded-2xl object-cover" />
            ))}
          </div>
        </section>
      )}

      {showPros && professionals.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-halo">Equipe</h2>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 [scrollbar-width:none]">
            {professionals.map((p) => (
              <div key={p.id} className="w-28 shrink-0 snap-start text-center">
                <Avatar name={p.name} src={p.photo_url} className="mx-auto size-20 text-lg" />
                <p className="mt-2 truncate text-[14px] font-medium text-halo">{p.name}</p>
                {p.specialties.length > 0 && <p className="truncate text-[12px] text-subtle-foreground">{p.specialties.join(" · ")}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-halo">Horário de funcionamento</h2>
        <ul className="divide-y divide-white/[0.05] rounded-2xl border border-white/[0.07] bg-surface-1 px-4">
          {byDay.map(({ wd, ranges }) => (
            <li key={wd} className="flex items-center justify-between py-3 text-[14px]">
              <span className="text-muted-foreground">{WEEKDAYS[wd]}</span>
              <span className={cn("font-mono", ranges.length ? "text-halo" : "text-subtle-foreground")}>
                {ranges.length ? ranges.map((r) => `${r.starts_at} às ${r.ends_at}`).join(" · ") : "Fechado"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {(addr.full || shop.phone || shop.whatsapp || instagram) && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-halo">Contato e endereço</h2>
          <div className="grid gap-2">
            {addr.full && (
              <a href={maps ?? undefined} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-4">
                <MapPin className="size-5 shrink-0 text-sky" />
                <span className="min-w-0 flex-1 text-[14px]">
                  <span className="block text-halo">{addr.line1}</span>
                  <span className="block text-muted-foreground">{addr.line2}</span>
                </span>
                <ChevronRight className="size-4 text-subtle-foreground" />
              </a>
            )}
            <div className="grid grid-cols-2 gap-2">
              {shop.whatsapp && (
                <a href={whatsappLink(shop.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/[0.06] text-[14px] text-halo">
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              )}
              {(shop.phone || shop.whatsapp) && (
                <a href={`tel:+55${(shop.phone || shop.whatsapp || "").replace(/\D/g, "")}`} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/[0.06] text-[14px] text-halo">
                  <Phone className="size-4" /> {formatPhone(shop.phone || shop.whatsapp)}
                </a>
              )}
              {instagram && (
                <a href={instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                  className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-white/[0.06] text-[14px] text-halo">
                  <AtSign className="size-4" /> Instagram
                </a>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function BottomBar({ summary, detail, label, onClick, disabled, brand, ink }: {
  summary: string; detail: string; label: string; onClick: () => void; disabled?: boolean; brand: string; ink: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-ink/90 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-halo">{summary}</p>
          <p className="truncate text-[12px] text-muted-foreground">{detail}</p>
        </div>
        <button type="button" onClick={onClick} disabled={disabled}
          className="h-12 shrink-0 rounded-2xl px-6 text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-40"
          style={{ background: brand, color: ink }}>
          {label}
        </button>
      </div>
    </div>
  );
}
