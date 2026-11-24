import type { AppointmentStatus, PaymentMethod } from "@/types/database";

export const STATUS_META: Record<AppointmentStatus, { label: string; tone: "info" | "success" | "warning" | "danger" | "neutral" | "brand"; bar: string }> = {
  pending: { label: "Pendente", tone: "warning", bar: "bg-warning" },
  confirmed: { label: "Confirmado", tone: "info", bar: "bg-sky" },
  in_progress: { label: "Em atendimento", tone: "brand", bar: "bg-electric" },
  completed: { label: "Concluído", tone: "success", bar: "bg-success" },
  cancelled: { label: "Cancelado", tone: "neutral", bar: "bg-white/25" },
  no_show: { label: "Não compareceu", tone: "danger", bar: "bg-danger" },
};

export const ACTIVE_STATUSES: AppointmentStatus[] = ["pending", "confirmed", "in_progress"];

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  debit_card: "Cartão de débito",
  credit_card: "Cartão de crédito",
  other: "Outros",
};

export function formatPhone(phone: string | null | undefined) {
  const d = (phone ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone ?? "";
}

export function whatsappLink(phone: string | null | undefined, text?: string) {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}
