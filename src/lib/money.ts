const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** 4990 -> "R$ 49,90" */
export function formatMoney(cents: number | null | undefined): string {
  return brl.format((cents ?? 0) / 100);
}

/** 499000 -> "R$ 4.990" (para gráficos e indicadores) */
export function formatMoneyCompact(cents: number | null | undefined): string {
  return brlCompact.format(Math.round((cents ?? 0) / 100));
}

/** "49,90" | "49.90" | "R$ 1.234,50" -> 123450 (centavos) ou null */
export function parseMoney(input: string | null | undefined): number | null {
  if (!input) return null;
  let s = String(input).replace(/[^\d.,-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** 4990 -> "49,90" (valor inicial de campos) */
export function centsToInput(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toFixed(2).replace(".", ",");
}
