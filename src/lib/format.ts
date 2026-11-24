import type { BillingPeriod } from "@/types/database";

export const PERIOD_LABEL: Record<BillingPeriod, { short: string; long: string; months: number }> = {
  monthly: { short: "/mês", long: "Mensal", months: 1 },
  quarterly: { short: "/trimestre", long: "Trimestral", months: 3 },
  semiannual: { short: "/semestre", long: "Semestral", months: 6 },
  annual: { short: "/ano", long: "Anual", months: 12 },
};

/** 4990 -> { int: "49", dec: "90" } */
export function splitPrice(cents: number) {
  const [int, dec] = (cents / 100).toFixed(2).split(".");
  return { int: Number(int).toLocaleString("pt-BR"), dec };
}
