/**
 * Datas no fuso da barbearia. O banco guarda tudo em UTC (timestamptz);
 * a interface sempre mostra e recebe horários no fuso da barbearia.
 */
export const DEFAULT_TZ = "America/Sao_Paulo";

const pad = (n: number) => String(n).padStart(2, "0");

function parts(date: Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute"), s: get("second") };
}

/** Diferença (min) entre o fuso e UTC num instante */
function offsetMinutes(date: Date, tz: string) {
  const p = parts(date, tz);
  return (Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - date.getTime()) / 60000;
}

/** "2026-11-24" + "14:30" no fuso -> Date (UTC) */
export function zonedToUtc(day: string, time: string, tz = DEFAULT_TZ): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const off = offsetMinutes(new Date(guess), tz);
  const first = guess - off * 60000;
  // ajuste para mudanças de horário de verão (raro no Brasil hoje)
  const off2 = offsetMinutes(new Date(first), tz);
  return new Date(guess - off2 * 60000);
}

/** Date -> "YYYY-MM-DD" no fuso */
export function toLocalDay(date: Date | string, tz = DEFAULT_TZ): string {
  const p = parts(new Date(date), tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** Date -> "HH:MM" no fuso */
export function toLocalTime(date: Date | string, tz = DEFAULT_TZ): string {
  const p = parts(new Date(date), tz);
  return `${pad(p.h)}:${pad(p.mi)}`;
}

/** Minutos desde 00:00 no fuso (útil para posicionar blocos na agenda) */
export function minutesOfDay(date: Date | string, tz = DEFAULT_TZ): number {
  const p = parts(new Date(date), tz);
  return p.h * 60 + p.mi;
}

export function todayLocal(tz = DEFAULT_TZ): string {
  return toLocalDay(new Date(), tz);
}

/** Aritmética de datas sobre "YYYY-MM-DD" (sem fuso) */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function weekday(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Segunda-feira da semana do dia */
export function startOfWeek(day: string): string {
  const wd = weekday(day);
  return addDays(day, wd === 0 ? -6 : 1 - wd);
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function endOfMonth(day: string): string {
  const [y, m] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m, 0));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function isValidDay(day: string | undefined | null): day is string {
  return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`));
}

const dayFmt = (opts: Intl.DateTimeFormatOptions) => (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...opts }).format(new Date(Date.UTC(y, m - 1, d)));
};

/** "terça, 24 de novembro" */
const sentence = (f: (day: string) => string) => (day: string) => {
  const s = f(day);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
/** "Terça-feira, 24 de novembro" */
export const formatDayLong = sentence(dayFmt({ weekday: "long", day: "numeric", month: "long" }));
/** "24/11" */
export const formatDayShort = dayFmt({ day: "2-digit", month: "2-digit" });
/** "ter" */
export const formatWeekdayShort = (day: string) => dayFmt({ weekday: "short" })(day).replace(".", "");
/** "novembro de 2026" */
export const formatMonthYear = sentence(dayFmt({ month: "long", year: "numeric" }));

export function formatDateTime(date: Date | string, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDate(date: Date | string, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
