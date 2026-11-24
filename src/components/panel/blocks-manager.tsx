"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select, Switch } from "@/components/ui/form-controls";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, todayLocal } from "@/lib/datetime";
import { addBlockAction, deleteBlockAction } from "@/app/painel/(app)/configuracoes/schedule-actions";

type Block = { id: string; professional_id: string | null; kind: string; starts_at: string; ends_at: string; reason: string | null };
const KIND = { block: "Bloqueio", day_off: "Folga", holiday: "Feriado" } as const;

export function BlocksManager({
  blocks, professionals, tz, fixedProfessionalId, title = "Folgas, feriados e bloqueios",
}: {
  blocks: Block[];
  professionals: { id: string; name: string }[];
  tz: string;
  fixedProfessionalId?: string;
  title?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const today = todayLocal(tz);
  const [f, setF] = React.useState({
    professionalId: fixedProfessionalId ?? "",
    kind: "day_off" as keyof typeof KIND,
    fromDay: today,
    toDay: today,
    allDay: true,
    startTime: "12:00",
    endTime: "13:00",
    reason: "",
  });
  const names = new Map(professionals.map((p) => [p.id, p.name]));

  const save = () =>
    start(async () => {
      const r = await addBlockAction({ ...f, professionalId: f.professionalId || null });
      if (r.ok) { toast.success(r.message!); setOpen(false); router.refresh(); } else toast.error(r.error);
    });

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-halo">{title}</h2>
        <Button variant="subtle" size="sm" onClick={() => setOpen(true)}><Plus /> Adicionar</Button>
      </div>
      {blocks.length === 0 ? (
        <p className="flex items-center gap-2 rounded-2xl border border-dashed border-white/10 p-4 text-[13px] text-muted-foreground">
          <CalendarOff className="size-4" /> Nenhum bloqueio futuro.
        </p>
      ) : (
        <ul className="grid gap-2">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={b.kind === "holiday" ? "info" : b.kind === "day_off" ? "brand" : "neutral"}>{KIND[b.kind as keyof typeof KIND]}</Badge>
                  <span className="text-[13px] text-muted-foreground">{b.professional_id ? names.get(b.professional_id) ?? "Profissional" : "Toda a barbearia"}</span>
                </div>
                <p className="mt-1 text-sm text-halo">{formatDateTime(b.starts_at, tz)} → {formatDateTime(b.ends_at, tz)}</p>
                {b.reason && <p className="text-[13px] text-subtle-foreground">{b.reason}</p>}
              </div>
              <button type="button" disabled={pending} onClick={() => start(async () => { const r = await deleteBlockAction(b.id); if (r.ok) router.refresh(); else toast.error(r.error); })}
                className="grid size-10 place-items-center rounded-xl bg-white/5 text-muted-foreground" aria-label="Remover bloqueio">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title="Novo bloqueio" description="Nenhum horário será oferecido nesse período." footer={<Button size="lg" className="w-full" loading={pending} onClick={save}>Salvar</Button>}>
          <div className="grid gap-4">
            <Field id="b-kind" label="Tipo">
              <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as keyof typeof KIND })}>
                <option value="day_off">Folga</option>
                <option value="holiday">Feriado</option>
                <option value="block">Bloqueio de horário</option>
              </Select>
            </Field>
            {!fixedProfessionalId && (
              <Field id="b-pro" label="Vale para">
                <Select value={f.professionalId} onChange={(e) => setF({ ...f, professionalId: e.target.value })}>
                  <option value="">Toda a barbearia</option>
                  {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
            )}
            <Switch label="Dia inteiro" checked={f.allDay} onCheckedChange={(v) => setF({ ...f, allDay: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field id="b-from" label="De"><Input type="date" value={f.fromDay} min={today} onChange={(e) => setF({ ...f, fromDay: e.target.value, toDay: e.target.value > f.toDay ? e.target.value : f.toDay })} className="h-12 [color-scheme:dark]" /></Field>
              <Field id="b-to" label="Até"><Input type="date" value={f.toDay} min={f.fromDay} onChange={(e) => setF({ ...f, toDay: e.target.value })} className="h-12 [color-scheme:dark]" /></Field>
            </div>
            {!f.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <Field id="b-st" label="Início"><Input type="time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} className="h-12 [color-scheme:dark]" /></Field>
                <Field id="b-et" label="Fim"><Input type="time" value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} className="h-12 [color-scheme:dark]" /></Field>
              </div>
            )}
            <Field id="b-reason" label="Motivo (opcional)"><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} className="h-12" placeholder="Ex.: Natal, consulta médica" /></Field>
            <p className="text-[12px] text-subtle-foreground">Agendamentos já existentes no período não são cancelados automaticamente.</p>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
