"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented, Switch } from "@/components/ui/form-controls";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { GATEWAY_LABEL } from "@/lib/admin/labels";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { saveGatewayAction } from "@/app/super-admin/actions";

type Provider = "mercado_pago" | "asaas" | "stripe";
type Env = "sandbox" | "production";
type Method = "pix" | "credit_card" | "boleto";
type Gw = { id: string; provider: Provider; environment: Env; is_active: boolean; public_key: string | null; enabled_methods: string[]; updated_at: string; has_secret: boolean; has_webhook_secret: boolean };

const PROVIDERS: { id: Provider; blurb: string; methods: Method[]; publicLabel: string; secretLabel: string; webhookLabel: string }[] = [
  { id: "mercado_pago", blurb: "Pix, cartão e boleto. Muito usado no Brasil.", methods: ["pix", "credit_card", "boleto"], publicLabel: "Public key", secretLabel: "Access token", webhookLabel: "Assinatura secreta do webhook" },
  { id: "asaas", blurb: "Assinaturas recorrentes com Pix, boleto e cartão.", methods: ["pix", "credit_card", "boleto"], publicLabel: "Wallet ID (opcional)", secretLabel: "Chave de API ($aact_…)", webhookLabel: "Token de autenticação do webhook" },
  { id: "stripe", blurb: "Cartão internacional e Pix via Stripe.", methods: ["credit_card", "pix"], publicLabel: "Publishable key (pk_…)", secretLabel: "Secret key (sk_…)", webhookLabel: "Signing secret (whsec_…)" },
];
const METHOD_LABEL: Record<Method, string> = { pix: "Pix", credit_card: "Cartão", boleto: "Boleto" };

export function GatewaysAdmin({ gateways, baseUrl }: { gateways: Gw[]; baseUrl: string }) {
  const [env, setEnv] = React.useState<Env>(() => (gateways.find((g) => g.is_active)?.environment ?? "sandbox"));
  const [editing, setEditing] = React.useState<Provider | null>(null);
  const active = gateways.find((g) => g.is_active);
  const get = (p: Provider, e: Env) => gateways.find((g) => g.provider === p && g.environment === e);

  return (
    <div className="grid gap-5">
      <PageHeader title="Gateways de pagamento" description="Onde as barbearias pagam a assinatura. Só um gateway fica ativo por vez." />
      <div className={cn("flex items-start gap-3 rounded-2xl border p-4", active ? "border-success/25 bg-success/[0.06]" : "border-warning/25 bg-warning/[0.06]")}>
        <ShieldCheck className={cn("mt-0.5 size-5 shrink-0", active ? "text-success" : "text-warning")} />
        <div className="text-[13px]">
          {active ? (
            <p className="text-halo">Cobrando com <b>{GATEWAY_LABEL[active.provider]}</b> em {active.environment === "production" ? "produção" : "modo de teste"}.</p>
          ) : (
            <p className="text-halo">Nenhum gateway ativo. As barbearias não conseguem pagar a assinatura até você ativar um.</p>
          )}
          <p className="mt-1 text-muted-foreground">As chaves secretas ficam no cofre criptografado do banco. Elas nunca voltam para o navegador, nem para você.</p>
        </div>
      </div>
      <Segmented ariaLabel="Ambiente" value={env} onChange={setEnv} options={[{ value: "sandbox", label: "Teste (sandbox)" }, { value: "production", label: "Produção" }]} />
      <ul className="grid gap-3 lg:grid-cols-3">
        {PROVIDERS.map((p) => {
          const g = get(p.id, env);
          return (
            <li key={p.id} className={cn("flex flex-col gap-3 rounded-2xl border bg-surface-1 p-4", g?.is_active ? "border-success/30" : "border-white/[0.07]")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-halo">{GATEWAY_LABEL[p.id]}</p>
                  <p className="text-[13px] text-muted-foreground">{p.blurb}</p>
                </div>
                {g?.is_active ? <Badge tone="success" dot className="shrink-0">Ativo</Badge> : g ? <Badge className="shrink-0 whitespace-nowrap">Configurado</Badge> : <Badge className="shrink-0 whitespace-nowrap">Sem chaves</Badge>}
              </div>
              <div className="grid gap-1.5 text-[13px]">
                <Row ok={!!g?.has_secret} label={p.secretLabel} />
                <Row ok={!!g?.has_webhook_secret} label="Segredo do webhook" />
                <p className="text-[12px] text-subtle-foreground">
                  {g ? `${g.enabled_methods.map((m) => METHOD_LABEL[m as Method] ?? m).join(", ")} · atualizado em ${formatDate(g.updated_at)}` : "Formas: " + p.methods.map((m) => METHOD_LABEL[m]).join(", ")}
                </p>
              </div>
              <Button variant={g ? "subtle" : "primary"} className="mt-auto" onClick={() => setEditing(p.id)}>
                <KeyRound /> {g ? "Editar" : "Configurar"}
              </Button>
            </li>
          );
        })}
      </ul>
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <GatewayForm key={`${editing}-${env}`} def={PROVIDERS.find((p) => p.id === editing)!} env={env} current={get(editing, env)}
            webhookUrl={`${baseUrl.replace(/\/$/, "")}/api/webhooks/${editing.replace("_", "-")}`} onDone={() => setEditing(null)} />
        )}
      </Sheet>
    </div>
  );
}

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <p className={cn("flex items-center gap-2", ok ? "text-halo" : "text-subtle-foreground")}>
      {ok ? <Lock className="size-3.5 text-success" /> : <span className="size-3.5 rounded-full border border-current" />}
      {label}{ok ? " salvo" : " pendente"}
    </p>
  );
}

function GatewayForm({ def, env, current, webhookUrl, onDone }: { def: (typeof PROVIDERS)[number]; env: Env; current?: Gw; webhookUrl: string; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [publicKey, setPublicKey] = React.useState(current?.public_key ?? "");
  const [secretKey, setSecretKey] = React.useState("");
  const [webhookSecret, setWebhookSecret] = React.useState("");
  const [methods, setMethods] = React.useState<Method[]>((current?.enabled_methods as Method[] | undefined) ?? def.methods);
  const [isActive, setIsActive] = React.useState(current?.is_active ?? false);
  const [copied, setCopied] = React.useState(false);

  const save = () => start(async () => {
    const r = await saveGatewayAction({ provider: def.id, environment: env, publicKey, methods, isActive, secretKey: secretKey || undefined, webhookSecret: webhookSecret || undefined });
    if (!r.ok) { setErrors(r.fieldErrors ?? {}); return void toast.error(r.error); }
    toast.success(r.message ?? "Salvo");
    onDone();
    router.refresh();
  });

  return (
    <SheetContent title={`${GATEWAY_LABEL[def.id]} · ${env === "production" ? "Produção" : "Teste"}`}
      description="Cole as chaves do painel do gateway. Chaves já salvas não aparecem aqui; deixe em branco para manter."
      footer={<Button className="w-full" size="lg" loading={pending} onClick={save}>Salvar gateway</Button>}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <label className="grid gap-1.5 text-[13px] text-muted-foreground">{def.publicLabel}
          <Input value={publicKey} onChange={(e) => setPublicKey(e.target.value)} autoComplete="off" spellCheck={false} className="font-mono text-[13px]" />
        </label>
        <label className="grid gap-1.5 text-[13px] text-muted-foreground">{def.secretLabel}
          <Input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} autoComplete="new-password" spellCheck={false}
            placeholder={current?.has_secret ? "•••••••• salva" : "Obrigatória para ativar"} className="font-mono text-[13px]" />
          {errors.secretKey && <span className="text-[12px] text-danger">{errors.secretKey}</span>}
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
          <p className="text-[13px] text-muted-foreground">URL do webhook (cadastre no painel do gateway)</p>
          <div className="flex items-center gap-2">
            <code className="block min-w-0 flex-1 truncate rounded-lg bg-black/30 px-2.5 py-2 text-[12px] text-sky">{webhookUrl}</code>
            <Button size="sm" variant="subtle" aria-label="Copiar URL"
              onClick={() => { void navigator.clipboard?.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </div>
        <label className="grid gap-1.5 text-[13px] text-muted-foreground">{def.webhookLabel}
          <Input type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} autoComplete="new-password" spellCheck={false}
            placeholder={current?.has_webhook_secret ? "•••••••• salvo" : "Recomendado"} className="font-mono text-[13px]" />
        </label>
        <div>
          <p className="mb-2 text-[13px] text-muted-foreground">Formas de pagamento</p>
          <div className="flex flex-wrap gap-2">
            {def.methods.map((m) => {
              const on = methods.includes(m);
              return (
                <button key={m} type="button" aria-pressed={on} onClick={() => setMethods(on ? methods.filter((x) => x !== m) : [...methods, m])}
                  className={cn("h-10 rounded-lg border px-4 text-[13px]", on ? "border-sky/50 bg-electric/20 text-halo" : "border-white/[0.08] text-muted-foreground")}>
                  {METHOD_LABEL[m]}
                </button>
              );
            })}
          </div>
          {errors.methods && <p className="mt-1 text-[12px] text-danger">{errors.methods}</p>}
        </div>
        <div className="rounded-2xl border border-white/[0.07] px-3 py-1">
          <Switch label="Usar este gateway" description="Desativa o gateway ativo atual" checked={isActive} onCheckedChange={setIsActive} />
        </div>
        {env === "production" && isActive && (
          <p className="rounded-xl border border-warning/25 bg-warning/[0.06] p-3 text-[13px] text-warning">Produção: as cobranças serão reais.</p>
        )}
      </div>
    </SheetContent>
  );
}
