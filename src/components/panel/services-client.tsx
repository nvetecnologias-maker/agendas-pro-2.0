"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Copy, MoreVertical, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Switch, Textarea } from "@/components/ui/form-controls";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PageHeader, EmptyState } from "@/components/panel/page-header";
import { ImageUpload } from "@/components/panel/image-upload";
import { centsToInput, formatMoney } from "@/lib/money";
import { formatDuration } from "@/lib/appointments/status";
import { cn } from "@/lib/utils";
import type { Service } from "@/types/database";
import {
  deleteServiceAction, duplicateServiceAction, reorderServicesAction, saveServiceAction, toggleServiceAction,
} from "@/app/painel/(app)/servicos/actions";

type Svc = Service & { professionalIds: string[] };
type Pro = { id: string; name: string; is_active: boolean };

const PRESETS = [
  { name: "Corte masculino", duration: 30, price: "45,00", category: "Cabelo" },
  { name: "Barba", duration: 30, price: "35,00", category: "Barba" },
  { name: "Corte + barba", duration: 60, price: "70,00", category: "Combos" },
  { name: "Sobrancelha", duration: 15, price: "20,00", category: "Acabamento" },
  { name: "Pigmentação", duration: 45, price: "50,00", category: "Barba" },
];

export function ServicesClient({ shopId, services, professionals, canEdit }: { shopId: string; services: Svc[]; professionals: Pro[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Partial<Svc> | null>(null);
  const [order, setOrder] = React.useState(services.map((s) => s.id));
  const [, start] = React.useTransition();
  React.useEffect(() => setOrder(services.map((s) => s.id)), [services]);

  const byId = new Map(services.map((s) => [s.id, s]));
  const list = order.map((id) => byId.get(id)).filter(Boolean) as Svc[];

  const run = (p: Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await p;
      if (r.ok) { if (r.message) toast.success(r.message); router.refresh(); }
      else toast.error(r.error);
    });

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    run(reorderServicesAction(next));
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Serviços"
        description={`${services.filter((s) => s.is_active).length} ativos de ${services.length}`}
        actions={canEdit && <Button onClick={() => setEditing({ is_active: true, professionalIds: professionals.filter((p) => p.is_active).map((p) => p.id) })}><Plus /> Novo serviço</Button>}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Nenhum serviço cadastrado"
          description="Comece por um modelo e ajuste preço e duração."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {PRESETS.map((p) => (
                <Button key={p.name} variant="glass" size="sm" onClick={() => setEditing({
                  name: p.name, duration_minutes: p.duration, price_cents: Math.round(Number(p.price.replace(",", ".")) * 100),
                  category: p.category, is_active: true, professionalIds: professionals.filter((x) => x.is_active).map((x) => x.id),
                })}>
                  <Plus /> {p.name}
                </Button>
              ))}
            </div>
          }
        />
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2">
          {list.map((s, i) => (
            <li key={s.id} className={cn("flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-3", !s.is_active && "opacity-60")}>
              <div className="grid shrink-0 gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid size-8 place-items-center rounded-lg bg-white/5 text-muted-foreground disabled:opacity-30" aria-label={`Mover ${s.name} para cima`}><ArrowUp className="size-4" /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} className="grid size-8 place-items-center rounded-lg bg-white/5 text-muted-foreground disabled:opacity-30" aria-label={`Mover ${s.name} para baixo`}><ArrowDown className="size-4" /></button>
              </div>
              {s.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image_url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-electric/15 text-sky"><Scissors className="size-6" /></span>
              )}
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(s)}>
                <p className="truncate font-medium text-halo">{s.name}</p>
                <p className="text-[13px] text-muted-foreground">{formatDuration(s.duration_minutes)} · <span className="font-mono">{formatMoney(s.price_cents)}</span></p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {s.category && <Badge>{s.category}</Badge>}
                  {!s.is_active && <Badge tone="warning">Inativo</Badge>}
                  {s.professionalIds.length === 0 && <Badge tone="danger">Sem profissional</Badge>}
                </div>
              </button>
              <Dropdown.Root>
                <Dropdown.Trigger className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-white/5" aria-label={`Ações de ${s.name}`}>
                  <MoreVertical className="size-5" />
                </Dropdown.Trigger>
                <Dropdown.Portal>
                  <Dropdown.Content align="end" sideOffset={6} className="z-50 min-w-48 rounded-2xl border border-white/10 bg-[#0b1d52] p-1.5 shadow-2xl">
                    <MenuItem icon={Pencil} onSelect={() => setEditing(s)}>Editar</MenuItem>
                    <MenuItem icon={Copy} onSelect={() => run(duplicateServiceAction(s.id))}>Duplicar</MenuItem>
                    <MenuItem icon={Scissors} onSelect={() => run(toggleServiceAction(s.id, !s.is_active))}>{s.is_active ? "Desativar" : "Ativar"}</MenuItem>
                    <MenuItem icon={Trash2} danger onSelect={() => { if (confirm(`Excluir "${s.name}"?`)) run(deleteServiceAction(s.id)); }}>Excluir</MenuItem>
                  </Dropdown.Content>
                </Dropdown.Portal>
              </Dropdown.Root>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <ServiceForm key={editing.id ?? "new"} shopId={shopId} s={editing} professionals={professionals} onDone={() => { setEditing(null); router.refresh(); }} />}
      </Sheet>
    </div>
  );
}

export function MenuItem({ icon: Icon, children, onSelect, danger }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; onSelect: () => void; danger?: boolean }) {
  return (
    <Dropdown.Item onSelect={onSelect} className={cn("flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm outline-none data-[highlighted]:bg-white/10", danger ? "text-danger" : "text-halo")}>
      <Icon className="size-4" /> {children}
    </Dropdown.Item>
  );
}

function ServiceForm({ shopId, s, professionals, onDone }: { shopId: string; s: Partial<Svc>; professionals: Pro[]; onDone: () => void }) {
  const [name, setName] = React.useState(s.name ?? "");
  const [description, setDescription] = React.useState(s.description ?? "");
  const [category, setCategory] = React.useState(s.category ?? "");
  const [price, setPrice] = React.useState(s.price_cents !== undefined ? centsToInput(s.price_cents) : "");
  const [duration, setDuration] = React.useState(String(s.duration_minutes ?? 30));
  const [image, setImage] = React.useState<string | null>(s.image_url ?? null);
  const [active, setActive] = React.useState(s.is_active ?? true);
  const [pros, setPros] = React.useState<string[]>(s.professionalIds ?? []);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();

  const submit = () =>
    start(async () => {
      const r = await saveServiceAction({ id: s.id, name, description, category, price, duration: Number(duration), imageUrl: image, isActive: active, professionalIds: pros });
      if (r.ok) { toast.success(r.message ?? "Salvo"); onDone(); }
      else { setErrors(r.fieldErrors ?? {}); toast.error(r.error); }
    });

  return (
    <SheetContent title={s.id ? "Editar serviço" : "Novo serviço"} footer={<Button size="lg" className="w-full" loading={pending} onClick={submit}>Salvar serviço</Button>}>
      <div className="grid gap-4">
        <Field id="s-name" label="Nome" error={errors.name}><Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" placeholder="Ex.: Corte masculino" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="s-price" label="Preço (R$)" error={errors.price}><Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="h-12 font-mono" placeholder="45,00" /></Field>
          <Field id="s-dur" label="Duração (min)" error={errors.duration}><Input type="number" inputMode="numeric" min={5} max={600} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} className="h-12 font-mono" /></Field>
        </div>
        <div className="flex flex-wrap gap-2">
          {[15, 30, 45, 60, 90].map((m) => (
            <button key={m} type="button" onClick={() => setDuration(String(m))} className={cn("h-9 rounded-lg border px-3 text-[13px]", Number(duration) === m ? "border-sky/40 bg-electric/25 text-halo" : "border-white/10 text-muted-foreground")}>{formatDuration(m)}</button>
          ))}
        </div>
        <Field id="s-cat" label="Categoria" hint="Opcional. Ex.: Cabelo, Barba, Combos"><Input value={category} onChange={(e) => setCategory(e.target.value)} className="h-12" /></Field>
        <Field id="s-desc" label="Descrição"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Aparece na página de agendamento" /></Field>
        <ImageUpload shopId={shopId} folder="services" value={image} onChange={setImage} label="Imagem (opcional)" />
        <div className="grid gap-2">
          <p className="text-sm font-medium text-halo">Quem realiza</p>
          {professionals.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Cadastre profissionais para vinculá-los.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {professionals.map((p) => {
                const on = pros.includes(p.id);
                return (
                  <button key={p.id} type="button" aria-pressed={on} onClick={() => setPros(on ? pros.filter((x) => x !== p.id) : [...pros, p.id])}
                    className={cn("h-10 rounded-lg border px-4 text-[13px]", on ? "border-sky/40 bg-electric/25 text-halo" : "border-white/10 text-muted-foreground", !p.is_active && "opacity-60")}>
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <Switch label="Serviço ativo" description="Inativos não aparecem para agendamento" checked={active} onCheckedChange={setActive} />
      </div>
    </SheetContent>
  );
}
