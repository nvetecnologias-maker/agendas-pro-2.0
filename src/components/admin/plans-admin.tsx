"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Switch, Textarea } from "@/components/ui/form-controls";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatMoney, centsToInput } from "@/lib/money";
import { PERIOD_LABEL, PERIOD_SUFFIX } from "@/lib/admin/labels";
import { cn } from "@/lib/utils";
import { deletePlanAction, savePlanAction } from "@/app/super-admin/actions";
import type { Plan, PlanFeature } from "@/types/database";

/** Recursos que o sistema já entende (limites são aplicados pelo banco) */
const KNOWN: { key: string; label: string; hasLimit: boolean }[] = [
  { key: "professionals.max", label: "Profissionais", hasLimit: true },
  { key: "services.max", label: "Serviços ativos", hasLimit: true },
  { key: "public_page", label: "Página de agendamento online", hasLimit: false },
  { key: "customers", label: "Cadastro de clientes", hasLimit: false },
  { key: "finance.basic", label: "Financeiro", hasLimit: false },
  { key: "reports.advanced", label: "Relatórios avançados", hasLimit: false },
  { key: "notifications.whatsapp", label: "Lembretes por WhatsApp", hasLimit: false },
];

type F = { key: string; enabled: boolean; limit: string; label: string };

export function PlansAdmin({ plans, features, usage }: { plans: Plan[]; features: PlanFeature[]; usage: Record<string, number> }) {
  const [editing, setEditing] = React.useState<Plan | "new" | null>(null);
  return (
    <div className="grid gap-5">
      <PageHeader title="Planos" description="Preços, períodos, teste grátis e limites de cada plano"
        actions={<Button onClick={() => setEditing("new")}><Plus /> Novo plano</Button>} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => {
          const fs = features.filter((f) => f.plan_id === p.id);
          return (
            <article key={p.id} className={cn("flex flex-col rounded-2xl border bg-surface-1 p-4", p.is_featured ? "border-sky/30" : "border-white/[0.07]", !p.is_active && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 text-lg font-semibold text-halo">{p.name}{p.is_featured && <Star className="size-4 fill-[#E7B661] text-[#E7B661]" />}</p>
                  <p className="text-[12px] text-subtle-foreground">/{p.slug} · {PERIOD_LABEL[p.billing_period]} · {p.trial_days} dias de teste</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {!p.is_active && <Badge>Inativo</Badge>}
                  {p.is_default_trial && <Badge tone="info">Teste padrão</Badge>}
                  {p.highlight_label && <Badge tone="brand">{p.highlight_label}</Badge>}
                </div>
              </div>
              <p className="mt-3 font-mono text-2xl font-semibold text-halo">{formatMoney(p.price_cents)}<span className="text-sm font-normal text-muted-foreground">{PERIOD_SUFFIX[p.billing_period]}</span></p>
              {p.compare_at_cents ? <p className="text-[12px] text-subtle-foreground line-through">{formatMoney(p.compare_at_cents)}</p> : null}
              <ul className="mt-3 grid flex-1 gap-1.5 text-[13px]">
                {fs.map((f) => (
                  <li key={f.feature_key} className={cn("flex items-center gap-2", f.enabled ? "text-halo" : "text-subtle-foreground line-through")}>
                    {f.enabled ? <Check className="size-3.5 text-success" /> : <Minus className="size-3.5" />}
                    {f.label ?? f.feature_key}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                <span className="text-[12px] text-muted-foreground">{usage[p.id] ?? 0} barbearia(s)</span>
                <Button size="sm" variant="subtle" onClick={() => setEditing(p)}><Pencil /> Editar</Button>
              </div>
            </article>
          );
        })}
      </div>
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <PlanForm plan={editing === "new" ? null : editing} features={editing === "new" ? [] : features.filter((f) => f.plan_id === editing.id)}
            inUse={editing === "new" ? 0 : usage[editing.id] ?? 0} onDone={() => setEditing(null)} />
        )}
      </Sheet>
    </div>
  );
}

function PlanForm({ plan, features, inUse, onDone }: { plan: Plan | null; features: PlanFeature[]; inUse: number; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [v, setV] = React.useState({
    name: plan?.name ?? "", slug: plan?.slug ?? "", description: plan?.description ?? "",
    price: plan ? centsToInput(plan.price_cents) : "", compareAt: plan?.compare_at_cents ? centsToInput(plan.compare_at_cents) : "",
    billingPeriod: plan?.billing_period ?? "monthly", trialDays: String(plan?.trial_days ?? 14),
    isFeatured: plan?.is_featured ?? false, highlightLabel: plan?.highlight_label ?? "", isActive: plan?.is_active ?? true,
    isDefaultTrial: plan?.is_default_trial ?? false, sortOrder: String(plan?.sort_order ?? 10),
  });
  const [fs, setFs] = React.useState<F[]>(() => {
    const base = features.map((f) => ({ key: f.feature_key, enabled: f.enabled, limit: f.limit_value === null ? "" : String(f.limit_value), label: f.label ?? "" }));
    for (const k of KNOWN) if (!base.some((b) => b.key === k.key)) base.push({ key: k.key, enabled: false, limit: "", label: k.label });
    return base;
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));
  const setF = (i: number, patch: Partial<F>) => setFs((list) => list.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  const save = () => start(async () => {
    const r = await savePlanAction({
      ...(plan ? { id: plan.id } : {}), ...v, billingPeriod: v.billingPeriod as Plan["billing_period"],
      trialDays: Number(v.trialDays), sortOrder: Number(v.sortOrder),
      features: fs.filter((f) => f.key.trim()).map((f) => ({ key: f.key.trim(), enabled: f.enabled, limit: f.limit.trim(), label: f.label })),
    });
    if (!r.ok) { setErrors(r.fieldErrors ?? {}); return void toast.error(r.error); }
    toast.success(r.message ?? "Salvo");
    onDone();
    router.refresh();
  });
  const remove = () => start(async () => {
    const r = await deletePlanAction(plan!.id);
    if (!r.ok) return void toast.error(r.error);
    toast.success(r.message!);
    onDone();
    router.refresh();
  });

  return (
    <SheetContent title={plan ? `Editar ${plan.name}` : "Novo plano"} size="lg"
      description={inUse ? `${inUse} barbearia(s) neste plano. Mudanças de preço valem para novas cobranças.` : undefined}
      footer={
        <div className="flex gap-2">
          {plan && !inUse && <Button variant="ghost" className="text-danger" onClick={remove} disabled={pending}><Trash2 /> Excluir</Button>}
          <Button className="flex-1" size="lg" loading={pending} onClick={save}>Salvar plano</Button>
        </div>
      }>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <L label="Nome" error={errors.name}><Input value={v.name} onChange={(e) => { set("name", e.target.value); if (!plan) set("slug", e.target.value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} /></L>
          <L label="Identificador" error={errors.slug}><Input value={v.slug} onChange={(e) => set("slug", e.target.value)} /></L>
        </div>
        <L label="Descrição"><Textarea rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} className="min-h-0" /></L>
        <div className="grid grid-cols-2 gap-3">
          <L label="Preço (R$)" error={errors.price}><Input inputMode="decimal" value={v.price} onChange={(e) => set("price", e.target.value)} placeholder="99,90" /></L>
          <L label="Preço “de” (opcional)"><Input inputMode="decimal" value={v.compareAt} onChange={(e) => set("compareAt", e.target.value)} placeholder="129,90" /></L>
          <L label="Cobrança">
            <Select value={v.billingPeriod} onChange={(e) => set("billingPeriod", e.target.value as Plan["billing_period"])}>
              {Object.entries(PERIOD_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </L>
          <L label="Dias de teste" error={errors.trialDays}><Input type="number" inputMode="numeric" min={0} max={90} value={v.trialDays} onChange={(e) => set("trialDays", e.target.value)} /></L>
          <L label="Selo (opcional)"><Input value={v.highlightLabel} maxLength={30} onChange={(e) => set("highlightLabel", e.target.value)} placeholder="Mais escolhido" /></L>
          <L label="Ordem"><Input type="number" inputMode="numeric" value={v.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} /></L>
        </div>
        <div className="grid gap-1 rounded-2xl border border-white/[0.07] px-3 py-1">
          <Switch label="Ativo" description="Aparece no site e pode ser contratado" checked={v.isActive} onCheckedChange={(x) => set("isActive", x)} />
          <Switch label="Destaque" description="Realça o card no site" checked={v.isFeatured} onCheckedChange={(x) => set("isFeatured", x)} />
          <Switch label="Plano do teste grátis" description="Usado em novos cadastros (só um)" checked={v.isDefaultTrial} onCheckedChange={(x) => set("isDefaultTrial", x)} />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-halo">Recursos e limites</p>
          <p className="mb-3 text-[12px] text-subtle-foreground">Limite vazio = ilimitado. O texto aparece na vitrine de planos.</p>
          <ul className="grid gap-2">
            {fs.map((f, i) => {
              const known = KNOWN.find((k) => k.key === f.key);
              return (
                <li key={i} className="grid gap-2 rounded-2xl border border-white/[0.07] p-3">
                  <div className="flex items-center gap-2">
                    <button type="button" role="switch" aria-checked={f.enabled} aria-label={`Ativar ${f.key}`} onClick={() => setF(i, { enabled: !f.enabled })}
                      className={cn("grid size-8 shrink-0 place-items-center rounded-lg", f.enabled ? "bg-success/20 text-success" : "bg-white/[0.06] text-subtle-foreground")}>
                      {f.enabled ? <Check className="size-4" /> : <X className="size-4" />}
                    </button>
                    {known ? <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted-foreground">{f.key}</span>
                      : <Input value={f.key} onChange={(e) => setF(i, { key: e.target.value })} className="h-9 flex-1 font-mono text-[12px]" placeholder="chave.recurso" />}
                    {(known?.hasLimit ?? true) && (
                      <Input value={f.limit} onChange={(e) => setF(i, { limit: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="∞" className="h-9 w-20 text-center" aria-label="Limite" />
                    )}
                    {!known && <button type="button" onClick={() => setFs((l) => l.filter((_, j) => j !== i))} aria-label="Remover" className="grid size-8 place-items-center text-subtle-foreground"><Trash2 className="size-4" /></button>}
                  </div>
                  <Input value={f.label} onChange={(e) => setF(i, { label: e.target.value })} placeholder="Texto na vitrine" className="h-9 text-[13px]" />
                </li>
              );
            })}
          </ul>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setFs((l) => [...l, { key: "", enabled: true, limit: "", label: "" }])}><Plus /> Recurso personalizado</Button>
        </div>
      </div>
    </SheetContent>
  );
}

function L({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid content-start gap-1.5 text-[13px] text-muted-foreground">
      {label}
      {children}
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </label>
  );
}
