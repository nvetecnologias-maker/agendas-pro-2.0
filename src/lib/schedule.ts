export type DayRanges = { weekday: number; ranges: { start: string; end: string }[] };

/** Linhas de working_hours -> 7 dias com faixas */
export function rowsToWeek(rows: { weekday: number; starts_at: string; ends_at: string }[]): DayRanges[] {
  return Array.from({ length: 7 }, (_, wd) => ({
    weekday: wd,
    ranges: rows
      .filter((r) => r.weekday === wd)
      .map((r) => ({ start: r.starts_at.slice(0, 5), end: r.ends_at.slice(0, 5) }))
      .sort((a, b) => a.start.localeCompare(b.start)),
  }));
}

/** Valida faixas: término depois do início e sem sobreposição no mesmo dia */
export function validateWeek(week: DayRanges[]): string | null {
  for (const d of week) {
    const sorted = [...d.ranges].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      if (!/^\d{2}:\d{2}$/.test(r.start) || !/^\d{2}:\d{2}$/.test(r.end)) return "Horário inválido.";
      if (r.end <= r.start) return "O fim de cada faixa precisa ser depois do início.";
      if (i > 0 && r.start < sorted[i - 1].end) return "Há faixas sobrepostas no mesmo dia.";
    }
  }
  return null;
}

export const DEFAULT_WEEK: DayRanges[] = Array.from({ length: 7 }, (_, wd) => ({
  weekday: wd,
  ranges: wd === 0 ? [] : wd === 6 ? [{ start: "09:00", end: "17:00" }] : [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "19:00" }],
}));
