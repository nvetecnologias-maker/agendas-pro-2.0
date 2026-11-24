"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Ban, CalendarClock, CheckCircle2, Clock, MessageCircle, Pencil, Phone, Play, Scissors, ThumbsUp, User, UserX, Wallet,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/form-controls";
import { formatDateTime, formatDayLong, todayLocal, toLocalDay, toLocalTime } from "@/lib/datetime";
import { centsToInput, formatMoney } from "@/lib/money";
import { METHOD_LABEL, STATUS_META, formatDuration, formatPhone, whatsappLink } from "@/lib/appointments/status";
import { cn } from "@/lib/utils";
import type { AppointmentStatus, PaymentMethod } from "@/types/database";
import { getHistoryAction, setStatusAction } from "@/app/painel/(app)/agendamentos/actions";
import { recordPaymentAction } from "@/app/painel/(app)/financeiro/actions";
import type { AgendaAppointment, AgendaPermissions } from "./types";

type History = Awaited<ReturnType<typeof getHistoryAction>>;

export function AppointmentDetail({
  appointment: a,
  tz,
  permissions,
  onClose,
  onEdit,
}: {
  appointment: AgendaAppointment | null;
  tz: string;
  permissions: AgendaPermissions;
  onClose: () => void;
  onEdit: (a: AgendaAppointment) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [history, setHistory] = React.useState<History | null>(null);
  const [cancelMode, setCancelMode] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [payOpen, setPayOpen] = React.useState(false);

  React.useEffect(() => {
    setHistory(null);
    setCancelMode(false);
    setPayOpen(false);
    setReason("");
    if (a) getHistoryAction(a.id).then(setHistory).catch(() => setHistory({ events: [], payments: [] }));
  }, [a]);

  if (!a) return <Sheet open={false} />;

  const meta = STATUS_META[a.status];
  const canManage = permissions.manage && (!permissions.ownProfessionalId || permissions.ownProfessionalId === a.professional?.id);
  const paid = (history?.payments ?? []).filter((p) => p.status === "received").reduce((s, p) => s + p.amount_cents, 0);

  const change = (status: AppointmentStatus, msg: string) =>
    startTransition(async () => {
      const r = await setStatusAction(a.id, status, status === "cancelled" ? reason : undefined);
      if (r.ok) {
        toast.success(msg);
        onClose();
        router.refresh();
      } else toast.error(r.error);
    });

  const actions: { status: AppointmentStatus; label: string; icon: React.ComponentType<{ className?: string }>; variant: "primary" | "subtle" }[] = [];
  if (a.status === "pending") actions.push({ status: "confirmed", label: "Confirmar", icon: ThumbsUp, variant: "primary" });
  if (a.status === "pending" || a.status === "confirmed") actions.push({ status: "in_progress", label: "Iniciar atendimento", icon: Play, variant: a.status === "confirmed" ? "primary" : "subtle" });
  if (a.status === "in_progress" || a.status === "confirmed" || a.status === "pending")
    actions.push({ status: "completed", label: "Concluir", icon: CheckCircle2, variant: a.status === "in_progress" ? "primary" : "subtle" });
  if (a.status === "cancelled" || a.status === "no_show") actions.push({ status: "confirmed", label: "Reativar", icon: ThumbsUp, variant: "subtle" });

  const isPast = new Date(a.starts_at) < new Date();
  const msgText = `Olá, ${a.customer?.name?.split(" ")[0]}! Passando para lembrar do seu horário: ${a.service?.name} em ${formatDayLong(toLocalDay(a.starts_at, tz))} às ${toLocalTime(a.starts_at, tz)}.`;

  return (
    <Sheet open={!!a} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={a.customer?.name ?? "Agendamento"}
        description={`${a.service?.name} · ${toLocalTime(a.starts_at, tz)}`}
        footer={
          canManage ? (
            cancelMode ? (
              <div className="grid gap-2">
                <Textarea placeholder="Motivo do cancelamento (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-16" />
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="subtle" onClick={() => setCancelMode(false)}>Voltar</Button>
                  <Button variant="destructive" loading={pending} onClick={() => change("cancelled", "Agendamento cancelado")}>Cancelar agendamento</Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                {actions.length > 0 && (
                  <div className={cn("grid gap-2", actions.length > 1 && "grid-cols-2")}>
                    {actions.map((x) => (
                      <Button key={x.status + x.label} variant={x.variant} size="lg" loading={pending} onClick={() => change(x.status, `Status: ${STATUS_META[x.status].label.toLowerCase()}`)} className="h-12 text-[15px]">
                        <x.icon /> {x.label}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="subtle" onClick={() => onEdit(a)} disabled={a.status === "completed"}><Pencil /> Remarcar</Button>
                  <Button variant="subtle" disabled={!["pending", "confirmed"].includes(a.status) || !isPast} onClick={() => change("no_show", "Marcado como não compareceu")}>
                    <UserX /> Faltou
                  </Button>
                  <Button variant="subtle" className="text-danger" disabled={!["pending", "confirmed", "in_progress"].includes(a.status)} onClick={() => setCancelMode(true)}>
                    <Ban /> Cancelar
                  </Button>
                </div>
              </div>
            )
          ) : undefined
        }
      >
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone} dot>{meta.label}</Badge>
            {a.source === "public_page" && <Badge tone="info">Agendado pelo link</Badge>}
          </div>

          <dl className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.05]">
            <Row icon={CalendarClock} label="Data e horário" value={<span>{formatDayLong(toLocalDay(a.starts_at, tz))}, {toLocalTime(a.starts_at, tz)} às {toLocalTime(a.ends_at, tz)}</span>} />
            <Row icon={Scissors} label="Serviço" value={a.service?.name} />
            <Row icon={User} label="Profissional" value={a.professional?.name} />
            <Row icon={Clock} label="Duração" value={formatDuration(a.duration_minutes)} />
            <Row icon={Wallet} label="Preço" value={<span className="font-mono">{formatMoney(a.price_cents)}</span>} />
            <Row icon={Phone} label="Telefone" value={formatPhone(a.customer?.phone)} />
          </dl>

          {a.customer?.phone && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="glass" asChild>
                <a href={whatsappLink(a.customer.phone, msgText)} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a>
              </Button>
              <Button variant="glass" asChild>
                <a href={`tel:+55${a.customer.phone.replace(/\D/g, "")}`}><Phone /> Ligar</a>
              </Button>
            </div>
          )}

          {a.notes && <p className="rounded-xl bg-white/[0.04] p-3 text-sm text-muted-foreground">{a.notes}</p>}
          {a.cancel_reason && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">Motivo: {a.cancel_reason}</p>}

          {/* Pagamento */}
          {permissions.finance && (
            <section className="grid gap-2 rounded-2xl border border-white/[0.07] p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-halo">Pagamento</p>
                {history && (
                  <span className={cn("text-[13px]", paid >= a.price_cents ? "text-success" : "text-muted-foreground")}>
                    {paid > 0 ? `Recebido ${formatMoney(paid)}` : "Nada recebido ainda"}
                  </span>
                )}
              </div>
              {!payOpen ? (
                a.status !== "cancelled" && (
                  <Button variant="subtle" onClick={() => setPayOpen(true)}><Wallet /> Registrar pagamento</Button>
                )
              ) : (
                <PaymentInline
                  appointmentId={a.id}
                  defaultCents={Math.max(0, a.price_cents - paid)}
                  tz={tz}
                  onDone={() => {
                    setPayOpen(false);
                    getHistoryAction(a.id).then(setHistory);
                    router.refresh();
                  }}
                />
              )}
              <p className="text-[12px] text-subtle-foreground">Agendamentos não viram receita sozinhos: registre o que foi realmente recebido.</p>
            </section>
          )}

          {/* Histórico */}
          <section className="grid gap-2">
            <p className="text-sm font-medium text-halo">Histórico</p>
            {!history ? (
              <p className="text-[13px] text-subtle-foreground">Carregando…</p>
            ) : (
              <ol className="grid gap-2 border-l border-white/10 pl-4">
                {history.events.map((e) => (
                  <li key={e.id} className="relative text-[13px]">
                    <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-sky" aria-hidden />
                    <p className="text-halo">{eventLabel(e.kind, e.to_status as AppointmentStatus | null, e.details as Record<string, string>, tz)}</p>
                    <p className="text-subtle-foreground">{formatDateTime(e.created_at, tz)}</p>
                  </li>
                ))}
                {history.payments.map((p) => (
                  <li key={p.id} className="relative text-[13px]">
                    <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-success" aria-hidden />
                    <p className="text-halo">
                      {p.status === "refunded" ? "Pagamento estornado" : "Pagamento recebido"}: {formatMoney(p.amount_cents)} ({METHOD_LABEL[p.method as PaymentMethod]})
                    </p>
                    <p className="text-subtle-foreground">{formatDateTime(p.paid_at, tz)}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function eventLabel(kind: string, to: AppointmentStatus | null, details: Record<string, string>, tz: string) {
  if (kind === "created") return details?.source === "public_page" ? "Agendado pelo cliente (link)" : "Agendamento criado";
  if (kind === "rescheduled") return `Remarcado para ${details?.to ? `${formatDayLong(toLocalDay(details.to, tz))}, ${toLocalTime(details.to, tz)}` : "outro horário"}`;
  if (kind === "status_changed" && to) return `Status alterado para ${STATUS_META[to].label.toLowerCase()}${details?.reason ? ` (${details.reason})` : ""}`;
  return "Dados atualizados";
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-surface-1 px-3.5 py-3">
      <Icon className="size-4 shrink-0 text-sky" aria-hidden />
      <dt className="w-24 shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-right text-[14px] text-halo">{value}</dd>
    </div>
  );
}

const METHODS: PaymentMethod[] = ["pix", "cash", "debit_card", "credit_card", "other"];

export function PaymentInline({ appointmentId, defaultCents, tz, onDone }: { appointmentId?: string; defaultCents: number; tz: string; onDone: () => void }) {
  const [amount, setAmount] = React.useState(centsToInput(defaultCents));
  const [method, setMethod] = React.useState<PaymentMethod>("pix");
  const [pending, start] = React.useTransition();
  return (
    <div className="grid gap-3">
      <label className="grid gap-1.5 text-[13px] text-muted-foreground">
        Valor recebido (R$)
        <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 font-mono text-lg" />
      </label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Forma de pagamento">
        {METHODS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={method === m}
            onClick={() => setMethod(m)}
            className={cn("h-10 rounded-lg border px-3.5 text-[13px]", method === m ? "border-sky/40 bg-electric/25 text-halo" : "border-white/10 text-muted-foreground")}
          >
            {METHOD_LABEL[m]}
          </button>
        ))}
      </div>
      <Button
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await recordPaymentAction({ appointmentId, amount, method, day: todayLocal(tz), time: toLocalTime(new Date(), tz) });
            if (r.ok) {
              toast.success("Pagamento registrado");
              onDone();
            } else toast.error(r.error);
          })
        }
      >
        <CheckCircle2 /> Confirmar recebimento
      </Button>
    </div>
  );
}
