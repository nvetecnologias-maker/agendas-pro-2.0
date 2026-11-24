"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, UserPlus, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/form-controls";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { centsToInput, formatMoney } from "@/lib/money";
import { formatDuration, formatPhone } from "@/lib/appointments/status";
import { getSlotsAction, saveAppointmentAction, searchCustomersAction } from "@/app/painel/(app)/agendamentos/actions";
import type { AgendaProfessional, AgendaService } from "./types";

export type FormDefaults = {
  id?: string;
  day: string;
  time?: string;
  professionalId?: string;
  serviceId?: string;
  customer?: { id: string; name: string; phone: string };
  notes?: string;
  priceCents?: number;
};

type Slot = { professionalId: string; time: string };

export function AppointmentForm({
  defaults,
  onClose,
  services,
  professionals,
  today,
  lockedProfessionalId,
  canEditPrice,
}: {
  defaults: FormDefaults | null;
  onClose: () => void;
  services: AgendaService[];
  professionals: AgendaProfessional[];
  tz: string;
  today: string;
  lockedProfessionalId: string | null;
  canEditPrice: boolean;
  autoConfirm: boolean;
}) {
  const open = !!defaults;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      {defaults && (
        <FormBody
          key={defaults.id ?? `${defaults.day}-${defaults.time}-${defaults.professionalId}`}
          d={defaults}
          onClose={onClose}
          services={services.filter((s) => s.is_active || s.id === defaults.serviceId)}
          professionals={lockedProfessionalId ? professionals.filter((p) => p.id === lockedProfessionalId) : professionals}
          today={today}
          canEditPrice={canEditPrice}
        />
      )}
    </Sheet>
  );
}

function FormBody({
  d, onClose, services, professionals, today, canEditPrice,
}: {
  d: FormDefaults;
  onClose: () => void;
  services: AgendaService[];
  professionals: AgendaProfessional[];
  today: string;
  canEditPrice: boolean;
}) {
  const router = useRouter();
  const [customer, setCustomer] = React.useState(d.customer ?? null);
  const [newCustomer, setNewCustomer] = React.useState({ name: "", phone: "" });
  const [mode, setMode] = React.useState<"search" | "new">(d.customer ? "search" : "search");
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<{ id: string; name: string; phone: string }[]>([]);

  const [serviceId, setServiceId] = React.useState(d.serviceId ?? services[0]?.id ?? "");
  const service = services.find((s) => s.id === serviceId);
  const eligible = professionals.filter((p) => !service || service.professionalIds.includes(p.id));
  const [professionalId, setProfessionalId] = React.useState(d.professionalId ?? eligible[0]?.id ?? "");
  const [day, setDay] = React.useState(d.day);
  const [time, setTime] = React.useState(d.time ?? "");
  const [customTime, setCustomTime] = React.useState(false);
  const [slots, setSlots] = React.useState<Slot[] | null>(null);
  const [price, setPrice] = React.useState(d.priceCents !== undefined ? centsToInput(d.priceCents) : "");
  const [notes, setNotes] = React.useState(d.notes ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();

  // profissional precisa realizar o serviço escolhido
  React.useEffect(() => {
    if (service && professionalId && !service.professionalIds.includes(professionalId)) {
      setProfessionalId(eligible[0]?.id ?? "");
    }
  }, [serviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // horários livres vêm do banco (mesma regra da página pública)
  React.useEffect(() => {
    if (!serviceId || !professionalId || !day) return;
    let alive = true;
    setSlots(null);
    getSlotsAction({ serviceId, day, professionalId }).then((s) => {
      if (!alive) return;
      setSlots(s);
      if (d.time && day === d.day && professionalId === d.professionalId && !s.some((x) => x.time === d.time)) setCustomTime(true);
    });
    return () => { alive = false; };
  }, [serviceId, professionalId, day]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => searchCustomersAction(q).then(setResults), 250);
    return () => clearTimeout(t);
  }, [q]);

  const submit = () =>
    start(async () => {
      const r = await saveAppointmentAction({
        id: d.id,
        customerId: customer?.id,
        customerName: customer ? undefined : newCustomer.name,
        customerPhone: customer ? undefined : newCustomer.phone,
        serviceId,
        professionalId,
        day,
        time,
        price: canEditPrice && price ? price : undefined,
        notes,
      });
      if (r.ok) {
        toast.success(r.message ?? "Salvo");
        onClose();
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
      }
    });

  const noServices = services.length === 0;

  return (
    <SheetContent
      title={d.id ? "Editar agendamento" : "Novo agendamento"}
      size="lg"
      footer={
        <Button size="lg" className="h-13 w-full text-base" loading={pending} disabled={noServices || !time} onClick={submit}>
          {d.id ? "Salvar alterações" : time ? `Agendar às ${time}` : "Escolha um horário"}
        </Button>
      }
    >
      {noServices ? (
        <p className="rounded-xl bg-warning/10 p-4 text-sm text-warning">Cadastre um serviço e vincule a um profissional antes de agendar.</p>
      ) : (
        <div className="grid gap-5">
          {/* Cliente */}
          <section className="grid gap-2">
            <p className="text-sm font-medium text-halo">Cliente</p>
            {customer ? (
              <div className="flex items-center gap-3 rounded-2xl border border-sky/20 bg-electric/10 p-3">
                <Avatar name={customer.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-halo">{customer.name}</p>
                  <p className="text-[13px] text-muted-foreground">{formatPhone(customer.phone)}</p>
                </div>
                <button type="button" onClick={() => setCustomer(null)} className="grid size-9 place-items-center rounded-xl bg-white/5" aria-label="Trocar cliente">
                  <X className="size-4" />
                </button>
              </div>
            ) : mode === "search" ? (
              <div className="grid gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
                  <Input
                    autoFocus={!d.id}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Nome ou telefone"
                    aria-label="Buscar cliente"
                    className="h-12 pl-10"
                    aria-invalid={errors.customerName ? true : undefined}
                  />
                </div>
                {results.length > 0 && (
                  <ul className="overflow-hidden rounded-2xl border border-white/[0.07]">
                    {results.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => setCustomer(c)} className="flex w-full items-center gap-3 border-b border-white/5 px-3 py-2.5 text-left last:border-0 active:bg-white/5">
                          <Avatar name={c.name} className="size-8 text-xs" />
                          <span className="min-w-0 flex-1 truncate text-halo">{c.name}</span>
                          <span className="text-[13px] text-muted-foreground">{formatPhone(c.phone)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="subtle" onClick={() => { setMode("new"); setNewCustomer({ name: /\d/.test(q) ? "" : q, phone: /\d/.test(q) ? q : "" }); }}>
                  <UserPlus /> Novo cliente
                </Button>
                {errors.customerName && <p className="text-[13px] text-danger">{errors.customerName}</p>}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="nc-name" label="Nome" error={errors.customerName}>
                  <Input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} autoComplete="off" className="h-12" />
                </Field>
                <Field id="nc-phone" label="Telefone (WhatsApp)" error={errors.customerPhone}>
                  <Input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} inputMode="tel" placeholder="(11) 99999-9999" className="h-12" />
                </Field>
                <button type="button" onClick={() => setMode("search")} className="justify-self-start text-[13px] text-sky">Buscar cliente existente</button>
              </div>
            )}
          </section>

          {/* Serviço e profissional */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="f-service" label="Serviço" error={errors.serviceId}>
              <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} · {formatDuration(s.duration_minutes)} · {formatMoney(s.price_cents)}</option>
                ))}
              </Select>
            </Field>
            <Field id="f-pro" label="Profissional" error={errors.professionalId}>
              <Select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} disabled={professionals.length <= 1}>
                {eligible.length === 0 && <option value="">Ninguém realiza este serviço</option>}
                {eligible.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          </div>

          {/* Data e horário */}
          <section className="grid gap-2">
            <div className="flex items-end justify-between gap-3">
              <Field id="f-day" label="Data" className="flex-1">
                <Input type="date" value={day} min={d.id ? undefined : today} onChange={(e) => { setDay(e.target.value); setTime(""); }} className="h-12 [color-scheme:dark]" />
              </Field>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-halo">Horário</p>
              <button type="button" className="text-[13px] text-sky" onClick={() => setCustomTime((v) => !v)}>
                {customTime ? "Ver horários livres" : "Outro horário"}
              </button>
            </div>
            {customTime ? (
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 [color-scheme:dark]" aria-label="Horário" />
            ) : slots === null ? (
              <div className="grid grid-cols-4 gap-2">{Array.from({ length: 8 }, (_, i) => <span key={i} className="h-11 animate-pulse rounded-xl bg-white/5" />)}</div>
            ) : slots.length === 0 ? (
              <p className="rounded-xl bg-white/[0.04] p-3 text-[13px] text-muted-foreground">Sem horários livres nesse dia para esse profissional.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Horários livres">
                {slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    role="radio"
                    aria-checked={time === s.time}
                    onClick={() => setTime(s.time)}
                    className={cn(
                      "h-11 rounded-xl border font-mono text-[14px] transition-colors",
                      time === s.time ? "border-sky/50 bg-electric text-white" : "border-white/10 bg-white/[0.03] text-halo",
                    )}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}
            {errors.time && <p className="text-[13px] text-danger">{errors.time}</p>}
          </section>

          {canEditPrice && (
            <Field id="f-price" label="Preço (R$)" hint={service ? `Padrão do serviço: ${formatMoney(service.price_cents)}` : undefined}>
              <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={service ? centsToInput(service.price_cents) : ""} className="h-12 font-mono" />
            </Field>
          )}
          <Field id="f-notes" label="Observações">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
          </Field>
        </div>
      )}
    </SheetContent>
  );
}
