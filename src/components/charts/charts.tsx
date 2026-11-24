"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

/**
 * Gráficos leves em SVG/HTML (sem biblioteca).
 * Paleta validada no fundo escuro (#061230): série principal #4F8BFF; segunda série #B98226.
 * Marcas finas, cantos de 4px só na ponta, grade discreta, tooltip ao tocar/passar o mouse
 * e tabela acessível para leitores de tela.
 */
import { SERIES } from "@/lib/chart-colors";
export { SERIES };

/** Formatos serializáveis (Server → Client Components não aceitam funções). */
export type ValueFormat = "int" | "money" | "moneyCompact" | "times" | "completed";
const FORMATTERS: Record<ValueFormat, (n: number) => string> = {
  int: (n) => String(Math.round(n)),
  money: formatMoney,
  moneyCompact: formatMoneyCompact,
  times: (n) => `${n}×`,
  completed: (n) => `${n} concluídos`,
};

type Datum = { label: string; fullLabel?: string; values: number[] };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * exp;
}

export function ColumnChart({
  data,
  series,
  format,
  height = 180,
  labelEvery = 1,
  ariaLabel,
  className,
}: {
  data: Datum[];
  series: { name: string; color: string }[];
  format: ValueFormat;
  height?: number;
  labelEvery?: number;
  ariaLabel: string;
  className?: string;
}) {
  const fmt = FORMATTERS[format];
  const [hover, setHover] = React.useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.flatMap((d) => d.values)));
  const ticks = [0, max / 2, max];
  const empty = data.every((d) => d.values.every((v) => v === 0));

  return (
    <figure className={cn("relative", className)} aria-label={ariaLabel}>
      {series.length > 1 && (
        <figcaption className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <div className="flex gap-2" aria-hidden>
        <div className="flex w-12 shrink-0 flex-col justify-between text-right text-[10px] text-subtle-foreground tabular-nums" style={{ height }}>
          {[...ticks].reverse().map((t) => <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{fmt(t)}</span>)}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-0 flex flex-col justify-between" style={{ height }}>
            {ticks.map((t) => <div key={t} className="border-t border-white/[0.06]" />)}
          </div>
          <div className="relative flex items-end gap-[2px]" style={{ height }} onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onClick={() => setHover(hover === i ? null : i)}
                className="group flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] rounded-md px-[1px] outline-none"
                style={{ background: hover === i ? "rgba(255,255,255,0.04)" : undefined }}
              >
                {d.values.map((v, j) => (
                  <span
                    key={j}
                    className="block w-full max-w-7 rounded-t-[4px] transition-opacity"
                    style={{
                      height: `${max ? (v / max) * 100 : 0}%`,
                      minHeight: v > 0 ? 2 : 0,
                      background: series[j]?.color,
                      opacity: hover === null || hover === i ? 1 : 0.45,
                    }}
                  />
                ))}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-[2px] text-[10px] text-subtle-foreground">
            {data.map((d, i) => (
              <span key={i} className="flex min-w-0 flex-1 justify-center whitespace-nowrap">{i % labelEvery === 0 ? d.label : ""}</span>
            ))}
          </div>
          {hover !== null && data[hover] && (
            <div
              className="pointer-events-none absolute top-0 z-10 min-w-32 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0b1d52] px-3 py-2 text-xs shadow-xl"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
            >
              <p className="mb-1 font-medium text-halo">{data[hover].fullLabel ?? data[hover].label}</p>
              {series.map((s, j) => (
                <p key={s.name} className="flex items-center justify-between gap-3 text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-sm" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <span className="font-mono text-halo tabular-nums">{fmt(data[hover].values[j] ?? 0)}</span>
                </p>
              ))}
            </div>
          )}
          {empty && (
            <p className="absolute inset-x-0 top-1/3 text-center text-sm text-subtle-foreground">Sem dados no período</p>
          )}
        </div>
      </div>
      <div className="sr-only">
        <table>
          <caption>{ariaLabel}</caption>
          <thead><tr><th>Período</th>{series.map((s) => <th key={s.name}>{s.name}</th>)}</tr></thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}><td>{d.fullLabel ?? d.label}</td>{d.values.map((v, j) => <td key={j}>{fmt(v)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** Ranking em barras horizontais (serviços mais vendidos, profissionais) */
export function BarList({
  items,
  format,
  emptyText = "Sem dados no período",
}: {
  items: { label: string; value: number; hint?: string }[];
  format: ValueFormat;
  emptyText?: string;
}) {
  const fmt = FORMATTERS[format];
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length || items.every((i) => i.value === 0)) {
    return <p className="py-6 text-center text-sm text-subtle-foreground">{emptyText}</p>;
  }
  return (
    <ul className="grid gap-3">
      {items.map((it) => (
        <li key={it.label} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-halo">{it.label}</span>
            <span className="shrink-0 font-mono text-[13px] text-muted-foreground tabular-nums">
              {fmt(it.value)}
              {it.hint && <span className="ml-1.5 text-subtle-foreground">{it.hint}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.05]">
            <div className="h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, background: SERIES.primary }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
