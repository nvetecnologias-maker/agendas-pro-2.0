import Link from "next/link";
import { cn } from "@/lib/utils";
import { addDays, startOfMonth, endOfMonth, todayLocal } from "@/lib/datetime";

export const PERIODS = {
  "7d": "7 dias",
  "30d": "30 dias",
  mes: "Este mês",
  ano: "12 meses",
} as const;
export type PeriodKey = keyof typeof PERIODS;

export function resolvePeriod(raw: string | undefined, tz: string): { key: PeriodKey; from: string; to: string } {
  const key = (raw && raw in PERIODS ? raw : "30d") as PeriodKey;
  const today = todayLocal(tz);
  switch (key) {
    case "7d":
      return { key, from: addDays(today, -6), to: today };
    case "mes":
      return { key, from: startOfMonth(today), to: endOfMonth(today) };
    case "ano":
      return { key, from: startOfMonth(addDays(startOfMonth(today), -335)), to: today };
    default:
      return { key, from: addDays(today, -29), to: today };
  }
}

/** Filtro de período por link (funciona sem JavaScript e mantém a URL compartilhável) */
export function PeriodTabs({ current, basePath }: { current: PeriodKey; basePath: string }) {
  return (
    <nav aria-label="Período" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <div className="inline-flex rounded-xl bg-white/5 p-1">
        {(Object.keys(PERIODS) as PeriodKey[]).map((k) => (
          <Link
            key={k}
            href={`${basePath}?periodo=${k}`}
            scroll={false}
            aria-current={current === k ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-medium",
              current === k ? "bg-electric text-white" : "text-muted-foreground hover:text-halo",
            )}
          >
            {PERIODS[k]}
          </Link>
        ))}
      </div>
    </nav>
  );
}
