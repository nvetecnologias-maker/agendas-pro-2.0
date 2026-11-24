"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, CalendarPlus, CircleCheck, Layers, PauseCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Segmented } from "@/components/ui/form-controls";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { changePlanAction, grantDaysAction, setShopStatusAction, setSubscriptionStatusAction } from "@/app/super-admin/actions";
import type { Enums } from "@/types/database";

type Plan = { id: string; name: string; price: string; active: boolean };
type Mode = null | "days" | "plan" | "suspendShop" | "reactivateShop" | "suspendSub" | "activateSub" | "cancelSub";

export function ShopAdminActions({ shopId, shopStatus, subStatus, currentPlanId, plans }: {
  shopId: string; shopStatus: Enums<"barbershop_status">; subStatus: Enums<"subscription_status"> | null; currentPlanId: string | null; plans: Plan[];
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>(null);
  const [pending, start] = React.useTransition();
  const [days, setDays] = React.useState("7");
  const [sign, setSign] = React.useState<"add" | "remove">("add");
  const [reason, setReason] = React.useState("");
  const [planId, setPlanId] = React.useState(currentPlanId ?? plans.find((p) => p.active)?.id ?? "");
  const [status, setStatus] = React.useState<string>("");
  const [periodDays, setPeriodDays] = React.useState("");

  React.useEffect(() => { if (mode) setReason(""); }, [mode]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message ?? "Feito.");
      setMode(null);
      router.refresh();
    });

  const current = subStatus && ["trial", "active", "pending", "past_due", "suspended"].includes(subStatus);
  const confirmText: Partial<Record<NonNullable<Mode>, { title: string; body: string; cta: string; danger?: boolean; go: () => Promise<{ ok: boolean; error?: string; message?: string }> }>> = {
    suspendShop: { title: "Suspender barbearia", body: "O painel e a página pública ficam bloqueados até reativar. Os dados são mantidos.", cta: "Suspender", danger: true, go: () => setShopStatusAction(shopId, "suspended", reason) },
    reactivateShop: { title: "Reativar barbearia", body: "O acesso volta a seguir a assinatura.", cta: "Reativar", go: () => setShopStatusAction(shopId, "active", reason) },
    suspendSub: { title: "Suspender assinatura", body: "Bloqueia o painel até reativar a assinatura.", cta: "Suspender", danger: true, go: () => setSubscriptionStatusAction(shopId, "suspended", reason) },
    activateSub: { title: "Ativar assinatura", body: "Marca como ativa (paga). Se o vencimento já passou, ganha 30 dias.", cta: "Ativar", go: () => setSubscriptionStatusAction(shopId, "active", reason) },
    cancelSub: { title: "Cancelar assinatura", body: "Encerra a assinatura agora. A barbearia fica apenas com acesso à tela de assinatura.", cta: "Cancelar assinatura", danger: true, go: () => setSubscriptionStatusAction(shopId, "canceled", reason) },
  };
  const confirm = mode ? confirmText[mode] : undefined;

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        <Button variant="subtle" onClick={() => setMode("days")} disabled={!current}><CalendarPlus /> Conceder dias</Button>
        <Button variant="subtle" onClick={() => setMode("plan")}><Layers /> Trocar plano</Button>
        {current && subStatus !== "active" && <Button variant="subtle" onClick={() => setMode("activateSub")}><CircleCheck /> Ativar assinatura</Button>}
        {current && subStatus !== "suspended" && <Button variant="subtle" onClick={() => setMode("suspendSub")}><PauseCircle /> Suspender assinatura</Button>}
        {current && <Button variant="subtle" onClick={() => setMode("cancelSub")}><Ban /> Cancelar assinatura</Button>}
        {shopStatus === "active"
          ? <Button variant="subtle" className="text-danger" onClick={() => setMode("suspendShop")}><Ban /> Suspender barbearia</Button>
          : <Button onClick={() => setMode("reactivateShop")}><PlayCircle /> Reativar barbearia</Button>}
      </div>

      <Sheet open={mode === "days"} onOpenChange={(o) => !o && setMode(null)}>
        <SheetContent title="Conceder ou remover dias" description="Soma ao vencimento atual (ou a partir de hoje, se já venceu).">
          <div className="grid gap-4">
            <Segmented ariaLabel="Operação" value={sign} onChange={setSign} options={[{ value: "add", label: "Adicionar" }, { value: "remove", label: "Remover" }]} />
            <div className="grid grid-cols-4 gap-2">
              {["7", "15", "30", "90"].map((d) => (
                <button key={d} type="button" onClick={() => setDays(d)}
                  className={`h-11 rounded-xl border text-sm ${days === d ? "border-sky/50 bg-electric/20 text-halo" : "border-white/[0.08] text-muted-foreground"}`}>{d} dias</button>
              ))}
            </div>
            <label className="grid gap-2 text-[13px] text-muted-foreground">Quantidade de dias
              <Input type="number" inputMode="numeric" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
            </label>
            <label className="grid gap-2 text-[13px] text-muted-foreground">Motivo (fica no histórico)
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: cortesia por instabilidade" maxLength={300} />
            </label>
            <Button size="lg" loading={pending} onClick={() => run(() => grantDaysAction(shopId, { days: Number(days) * (sign === "add" ? 1 : -1), reason }))}>
              {sign === "add" ? "Conceder" : "Remover"} {days || 0} dia(s)
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mode === "plan"} onOpenChange={(o) => !o && setMode(null)}>
        <SheetContent title="Trocar plano" description="Muda o plano e o valor. Sem assinatura vigente, cria uma nova.">
          <div className="grid gap-4">
            <label className="grid gap-2 text-[13px] text-muted-foreground">Plano
              <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.price}{p.active ? "" : " (inativo)"}</option>)}
              </Select>
            </label>
            <label className="grid gap-2 text-[13px] text-muted-foreground">Status da assinatura
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">{current ? "Manter o atual" : "Ativa"}</option>
                <option value="trial">Teste</option>
                <option value="active">Ativa</option>
                <option value="pending">Pendente</option>
              </Select>
            </label>
            <label className="grid gap-2 text-[13px] text-muted-foreground">Vencimento em (dias a partir de hoje)
              <Input type="number" inputMode="numeric" min={1} value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} placeholder={current ? "Manter o vencimento atual" : "30"} />
            </label>
            <label className="grid gap-2 text-[13px] text-muted-foreground">Motivo
              <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Ex.: upgrade negociado" />
            </label>
            <Button size="lg" loading={pending} disabled={!planId} onClick={() => run(() => changePlanAction(shopId, { planId, status, periodDays, reason }))}>Salvar plano</Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!confirm} onOpenChange={(o) => !o && setMode(null)}>
        {confirm && (
          <SheetContent title={confirm.title} description={confirm.body}>
            <div className="grid gap-4">
              <label className="grid gap-2 text-[13px] text-muted-foreground">Motivo (fica na auditoria)
                <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="subtle" size="lg" onClick={() => setMode(null)}>Voltar</Button>
                <Button size="lg" loading={pending} variant={confirm.danger ? "destructive" : "primary"} onClick={() => run(confirm.go)}>{confirm.cta}</Button>
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </>
  );
}
