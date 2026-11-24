"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Plus, Ticket } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented, Select, Switch } from "@/components/ui/form-controls";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatMoney, centsToInput } from "@/lib/money";
import { formatDate, toLocalDay } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { saveCouponAction, toggleCouponAction } from "@/app/super-admin/actions";
import type { Tables } from "@/types/database";

type Coupon = Tables<"coupons">;
type PlanOpt = { id: string; name: string; price: string; active: boolean };
const AUDIENCE = { all: "Todos", new_customers: "Só novos clientes", existing_customers: "Só clientes atuais" } as const;

function couponState(c: Coupon, used: number) {
  const now = Date.now();
  if (!c.is_active) return { label: "Pausado", tone: "neutral" as const };
  if (c.ends_at && new Date(c.ends_at).getTime() < now) return { label: "Expirado", tone: "neutral" as const };
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { label: "Agendado", tone: "info" as const };
  if (c.max_redemptions && used >= c.max_redemptions) return { label: "Esgotado", tone: "warning" as const };
  return { label: "Ativo", tone: "success" as const };
}

export function CouponsAdmin({ coupons, usage, plans }: { coupons: Coupon[]; usage: Record<string, { redemptions: number; discount: number }>; plans: PlanOpt[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Coupon | "new" | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const toggle = async (c: Coupon) => {
    setBusy(c.id);
    const r = await toggleCouponAction(c.id, !c.is_active);
    setBusy(null);
    if (!r.ok) return void toast.error(r.error);
    toast.success(c.is_active ? "Cupom pausado." : "Cupom ativado.");
    router.refresh();
  };

  return (
    <div className="grid gap-5">
      <PageHeader title="Cupons" description="Descontos e dias extras de teste para assinaturas"
        actions={<Button onClick={() => setEditing("new")}><Plus /> Novo cupom</Button>} />
      {coupons.length === 0 ? (
        <EmptyState icon={Ticket} title="Nenhum cupom ainda" description="Crie um código para campanhas, parceiros ou indicações."
          action={<Button onClick={() => setEditing("new")}><Plus /> Criar cupom</Button>} />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {coupons.map((c) => {
            const u = usage[c.id] ?? { redemptions: 0, discount: 0 };
            const st = couponState(c, u.redemptions);
            const off = c.discount_type === "percent" ? `${c.discount_value}% off` : `${formatMoney(c.discount_value)} off`;
            return (
              <li key={c.id} className="grid gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-4">
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => { void navigator.clipboard?.writeText(c.code); toast.success("Código copiado."); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#E7B661]/40 bg-[#B98226]/10 px-2.5 py-1 font-mono text-sm font-semibold tracking-wide text-[#E7B661]"
                    aria-label={`Copiar código ${c.code}`}>
                    {c.code}<Copy className="size-3.5 opacity-70" />
                  </button>
                  <span className="flex-1" />
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                <div>
                  <p className="font-medium text-halo">{c.name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {off}{c.extra_trial_days ? ` · +${c.extra_trial_days} dias de teste` : ""} · {AUDIENCE[c.audience]}
                  </p>
                  <p className="text-[12px] text-subtle-foreground">
                    {c.starts_at || c.ends_at ? (c.starts_at ? `De ${formatDate(c.starts_at)} ` : "") + (c.ends_at ? `${c.starts_at ? "até" : "Até"} ${formatDate(c.ends_at)}` : "sem data de fim") : "Sem prazo"}
                    {c.applicable_plan_ids.length ? ` · ${c.applicable_plan_ids.length} plano(s)` : " · Todos os planos"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/[0.03] p-2.5 text-center">
                  <div><p className="font-mono text-lg font-semibold text-halo">{u.redemptions}{c.max_redemptions ? <span className="text-sm text-muted-foreground">/{c.max_redemptions}</span> : null}</p><p className="text-[11px] text-subtle-foreground">usos</p></div>
                  <div><p className="font-mono text-lg font-semibold text-halo">{formatMoney(u.discount)}</p><p className="text-[11px] text-subtle-foreground">em descontos</p></div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <input type="checkbox" className="peer sr-only" checked={c.is_active} disabled={busy === c.id} onChange={() => toggle(c)} />
                    <span className={cn("relative h-6 w-10 rounded-full transition", c.is_active ? "bg-electric" : "bg-white/10")}>
                      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-all", c.is_active ? "left-[18px]" : "left-0.5")} />
                    </span>
                    {c.is_active ? "Ativo" : "Pausado"}
                  </label>
                  <Button size="sm" variant="subtle" onClick={() => setEditing(c)}><Pencil /> Editar</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <CouponForm c={editing === "new" ? null : editing} plans={plans} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}

function CouponForm({ c, plans, onDone }: { c: Coupon | null; plans: PlanOpt[]; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [v, setV] = React.useState({
    name: c?.name ?? "", code: c?.code ?? "",
    discountType: (c?.discount_type ?? "percent") as "percent" | "fixed",
    discountValue: c ? (c.discount_type === "percent" ? String(c.discount_value) : centsToInput(c.discount_value)) : "",
    extraTrialDays: String(c?.extra_trial_days ?? 0),
    startsAt: c?.starts_at ? toLocalDay(c.starts_at) : "", endsAt: c?.ends_at ? toLocalDay(c.ends_at) : "",
    maxRedemptions: c?.max_redemptions ? String(c.max_redemptions) : "",
    audience: (c?.audience ?? "all") as keyof typeof AUDIENCE,
    planIds: c?.applicable_plan_ids ?? [], isActive: c?.is_active ?? true,
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));

  const save = () => start(async () => {
    const r = await saveCouponAction({ ...(c ? { id: c.id } : {}), ...v, extraTrialDays: Number(v.extraTrialDays || 0) });
    if (!r.ok) { setErrors(r.fieldErrors ?? {}); return void toast.error(r.error); }
    toast.success(r.message ?? "Salvo");
    onDone();
    router.refresh();
  });

  return (
    <SheetContent title={c ? "Editar cupom" : "Novo cupom"} size="lg"
      footer={<Button className="w-full" size="lg" loading={pending} onClick={save}>Salvar cupom</Button>}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <div className="grid grid-cols-2 gap-3">
          <F label="Nome interno" error={errors.name}><Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Black Friday" /></F>
          <F label="Código" error={errors.code}>
            <Input value={v.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} className="font-mono uppercase" placeholder="BLACK30" autoCapitalize="characters" />
          </F>
        </div>
        <Segmented ariaLabel="Tipo de desconto" value={v.discountType} onChange={(t) => set("discountType", t)}
          options={[{ value: "percent", label: "Percentual (%)" }, { value: "fixed", label: "Valor fixo (R$)" }]} />
        <div className="grid grid-cols-2 gap-3">
          <F label={v.discountType === "percent" ? "Desconto (%)" : "Desconto (R$)"} error={errors.discountValue}>
            <Input inputMode={v.discountType === "percent" ? "numeric" : "decimal"} value={v.discountValue} onChange={(e) => set("discountValue", e.target.value)} placeholder={v.discountType === "percent" ? "30" : "20,00"} />
          </F>
          <F label="Dias extras de teste" error={errors.extraTrialDays}><Input type="number" inputMode="numeric" min={0} max={90} value={v.extraTrialDays} onChange={(e) => set("extraTrialDays", e.target.value)} /></F>
          <F label="Início"><Input type="date" className="min-w-0" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></F>
          <F label="Fim" error={errors.endsAt}><Input type="date" className="min-w-0" value={v.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></F>
          <F label="Limite de usos" error={errors.maxRedemptions}><Input inputMode="numeric" value={v.maxRedemptions} onChange={(e) => set("maxRedemptions", e.target.value.replace(/\D/g, ""))} placeholder="Ilimitado" /></F>
          <F label="Quem pode usar">
            <Select value={v.audience} onChange={(e) => set("audience", e.target.value as keyof typeof AUDIENCE)}>
              {Object.entries(AUDIENCE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </F>
        </div>
        <div>
          <p className="mb-2 text-[13px] text-muted-foreground">Planos (nenhum marcado = todos)</p>
          <div className="flex flex-wrap gap-2">
            {plans.map((p) => {
              const on = v.planIds.includes(p.id);
              return (
                <button key={p.id} type="button" aria-pressed={on}
                  onClick={() => set("planIds", on ? v.planIds.filter((x) => x !== p.id) : [...v.planIds, p.id])}
                  className={cn("h-10 rounded-lg border px-3.5 text-[13px]", on ? "border-sky/50 bg-electric/20 text-halo" : "border-white/[0.08] text-muted-foreground")}>
                  {p.name} · {p.price}{p.active ? "" : " (inativo)"}
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.07] px-3 py-1">
          <Switch label="Ativo" description="Pode ser usado no checkout" checked={v.isActive} onCheckedChange={(x) => set("isActive", x)} />
        </div>
      </div>
    </SheetContent>
  );
}

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid content-start gap-1.5 text-[13px] text-muted-foreground">
      {label}
      {children}
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </label>
  );
}
