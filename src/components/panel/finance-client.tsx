"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Undo2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/form-controls";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Card, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { formatDateTime, todayLocal, toLocalTime } from "@/lib/datetime";
import { METHOD_LABEL } from "@/lib/appointments/status";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/database";
import { recordPaymentAction, refundPaymentAction } from "@/app/painel/(app)/financeiro/actions";

type Pay = { id: string; amount_cents: number; method: PaymentMethod; status: string; paid_at: string; notes: string | null; customer: string | null; service: string | null; professional: string | null };

export function FinancePayments({ payments, tz, canManage, services, professionals }: {
  payments: Pay[]; tz: string; canManage: boolean; services: { id: string; name: string }[]; professionals: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const [shown, setShown] = React.useState(15);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
        <CardTitle>Pagamentos recebidos</CardTitle>
        {canManage && <Button size="sm" onClick={() => setOpen(true)}><Plus /> Registrar</Button>}
      </div>
      {payments.length === 0 ? (
        <p className="flex items-center gap-2 px-4 pb-5 text-sm text-subtle-foreground"><Wallet className="size-4" /> Nenhum pagamento no período.</p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {payments.slice(0, shown).map((p) => (
            <li key={p.id} className={cn("flex items-center gap-3 px-4 py-3", p.status === "refunded" && "opacity-55")}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-halo">{p.customer ?? "Pagamento avulso"}{p.service ? <span className="text-muted-foreground"> · {p.service}</span> : null}</p>
                <p className="text-[12px] text-subtle-foreground">{formatDateTime(p.paid_at, tz)} · {METHOD_LABEL[p.method]}{p.professional ? ` · ${p.professional}` : ""}</p>
              </div>
              <div className="grid shrink-0 justify-items-end gap-1">
                <span className={cn("font-mono text-sm text-halo", p.status === "refunded" && "line-through")}>{formatMoney(p.amount_cents)}</span>
                {p.status === "refunded" ? <Badge tone="neutral">Estornado</Badge> : canManage && (
                  <button type="button" disabled={pending} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-danger"
                    onClick={() => { if (confirm("Marcar este pagamento como estornado?")) start(async () => { const r = await refundPaymentAction(p.id); if (r.ok) { toast.success(r.message!); router.refresh(); } else toast.error(r.error); }); }}>
                    <Undo2 className="size-3.5" /> Estornar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {payments.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + 30)} className="w-full border-t border-white/[0.05] py-3.5 text-sm font-medium text-sky">
          Ver mais ({payments.length - shown})
        </button>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        {open && <StandalonePayment tz={tz} services={services} professionals={professionals} onDone={() => { setOpen(false); router.refresh(); }} />}
      </Sheet>
    </Card>
  );
}

const METHODS: PaymentMethod[] = ["pix", "cash", "debit_card", "credit_card", "other"];

function StandalonePayment({ tz, services, professionals, onDone }: { tz: string; services: { id: string; name: string }[]; professionals: { id: string; name: string }[]; onDone: () => void }) {
  const [f, setF] = React.useState({ amount: "", method: "pix" as PaymentMethod, day: todayLocal(tz), time: toLocalTime(new Date(), tz), serviceId: "", professionalId: "", notes: "" });
  const [pending, start] = React.useTransition();
  return (
    <SheetContent title="Registrar pagamento" description="Pagamento recebido fora de um agendamento (ex.: produto, avulso)."
      footer={<Button size="lg" className="w-full" loading={pending} onClick={() => start(async () => {
        const r = await recordPaymentAction(f);
        if (r.ok) { toast.success(r.message!); onDone(); } else toast.error(r.error);
      })}>Salvar</Button>}>
      <div className="grid gap-4">
        <Field id="fp-amount" label="Valor (R$)"><Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className="h-12 font-mono text-lg" placeholder="0,00" /></Field>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Forma de pagamento">
          {METHODS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={f.method === m} onClick={() => setF({ ...f, method: m })}
              className={cn("h-10 rounded-full border px-3.5 text-[13px]", f.method === m ? "border-sky/40 bg-electric/25 text-halo" : "border-white/10 text-muted-foreground")}>{METHOD_LABEL[m]}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="fp-day" label="Data"><Input type="date" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} className="h-12 [color-scheme:dark]" /></Field>
          <Field id="fp-time" label="Hora"><Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} className="h-12 [color-scheme:dark]" /></Field>
        </div>
        <Field id="fp-svc" label="Serviço relacionado (opcional)">
          <Select value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}><option value="">Nenhum</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        </Field>
        <Field id="fp-pro" label="Profissional (opcional)">
          <Select value={f.professionalId} onChange={(e) => setF({ ...f, professionalId: e.target.value })}><option value="">Nenhum</option>{professionals.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        </Field>
        <Field id="fp-notes" label="Observação"><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="h-12" /></Field>
      </div>
    </SheetContent>
  );
}
