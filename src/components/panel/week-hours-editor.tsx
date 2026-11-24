"use client";

import * as React from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/form-controls";
import { WEEKDAYS } from "@/lib/datetime";
import type { DayRanges } from "@/lib/schedule";

/** Editor de expediente semanal (com intervalos), pensado para toque */
export function WeekHoursEditor({ value, onChange }: { value: DayRanges[]; onChange: (v: DayRanges[]) => void }) {
  // exibe segunda a domingo
  const order = [1, 2, 3, 4, 5, 6, 0];
  const set = (wd: number, ranges: DayRanges["ranges"]) => onChange(value.map((d) => (d.weekday === wd ? { ...d, ranges } : d)));

  return (
    <div className="grid gap-2">
      {order.map((wd) => {
        const d = value.find((x) => x.weekday === wd)!;
        const open = d.ranges.length > 0;
        return (
          <div key={wd} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3 py-1">
            <Switch
              label={WEEKDAYS[wd]}
              description={open ? d.ranges.map((r) => `${r.start} às ${r.end}`).join(" · ") : "Fechado"}
              checked={open}
              onCheckedChange={(v) => set(wd, v ? [{ start: "09:00", end: "18:00" }] : [])}
            />
            {open && (
              <div className="grid gap-2 pb-3">
                {d.ranges.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="time" aria-label={`${WEEKDAYS[wd]}: início da faixa ${i + 1}`} value={r.start}
                      onChange={(e) => set(wd, d.ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                      className="h-11 w-0 min-w-0 flex-1 rounded-xl border border-input bg-surface-2 px-2.5 font-mono text-halo [color-scheme:dark]" />
                    <span className="text-muted-foreground">até</span>
                    <input type="time" aria-label={`${WEEKDAYS[wd]}: fim da faixa ${i + 1}`} value={r.end}
                      onChange={(e) => set(wd, d.ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                      className="h-11 w-0 min-w-0 flex-1 rounded-xl border border-input bg-surface-2 px-2.5 font-mono text-halo [color-scheme:dark]" />
                    <button type="button" onClick={() => set(wd, d.ranges.filter((_, j) => j !== i))} className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/5 text-muted-foreground" aria-label="Remover faixa">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => {
                    const last = d.ranges[d.ranges.length - 1];
                    const start = last ? last.end : "09:00";
                    set(wd, [...d.ranges, { start, end: start < "20:00" ? "20:00" : "23:00" }]);
                  }} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/5 px-3 text-[13px] text-sky">
                    <Plus className="size-4" /> Adicionar faixa (intervalo)
                  </button>
                  <button type="button" onClick={() => onChange(value.map((x) => (x.weekday === 0 || x.weekday === wd ? x : { ...x, ranges: d.ranges.map((r) => ({ ...r })) })))}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/5 px-3 text-[13px] text-muted-foreground">
                    <Copy className="size-4" /> Copiar para seg a sáb
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
