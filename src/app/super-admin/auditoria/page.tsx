import { FileClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/panel/page-header";
import { FilterChip, ChipRow, Pager } from "@/components/admin/filter-chip";
import { formatDateTime } from "@/lib/datetime";
import { AUDIT_LABEL } from "@/lib/admin/labels";
import Link from "next/link";

export const metadata = { title: "Auditoria" };
const PAGE = 40;
const GROUPS = {
  admin: { label: "Ações do admin", match: "super_admin" },
  barbershop: { label: "Barbearias", prefix: "barbershop." },
  subscription: { label: "Assinaturas", prefix: "subscription." },
  plan: { label: "Planos e cupons", prefix: ["plan.", "coupon."] },
  gateway: { label: "Gateways", prefix: "payment_gateway." },
} as const;
type G = keyof typeof GROUPS;

const FIELD: Record<string, string> = {
  status: "status", plan_id: "plano", current_period_end: "vencimento", amount_cents: "valor", price_cents: "preço", is_active: "ativo",
  name: "nome", trial_days: "dias de teste", public_key: "chave pública", enabled_methods: "formas de pagamento", discount_value: "desconto",
};
function describe(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof m.reason === "string" && m.reason) parts.push(`Motivo: ${m.reason}`);
  if (typeof m.days === "number") parts.push(`${m.days > 0 ? "+" : ""}${m.days} dias`);
  if (typeof m.barbershop_name === "string") parts.push(m.barbershop_name);
  const rec = m.record as Record<string, unknown> | undefined;
  if (rec && typeof rec.name === "string") parts.push(rec.name);
  else if (rec && typeof rec.code === "string") parts.push(rec.code);
  const ch = m.changes as Record<string, { from: unknown; to: unknown }> | undefined;
  if (ch && typeof ch === "object") {
    const keys = Object.keys(ch).filter((k) => k !== "updated_at");
    const fmt = (x: unknown) => (x === null || x === undefined ? "vazio" : typeof x === "object" ? "…" : String(x).slice(0, 24));
    if (keys.length) parts.push(keys.slice(0, 4).map((k) => `${FIELD[k] ?? k}: ${fmt(ch[k].from)} → ${fmt(ch[k].to)}`).join("; ") + (keys.length > 4 ? "…" : ""));
  }
  return parts.length ? parts.join(" · ") : null;
}

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ g?: string; p?: string }> }) {
  const sp = await searchParams;
  const g = (sp.g && sp.g in GROUPS ? sp.g : undefined) as G | undefined;
  const page = Math.max(1, Number(sp.p) || 1);
  const supabase = await createClient();
  let q = supabase.from("audit_logs").select("id, action, actor_id, actor_role, barbershop_id, metadata, created_at", { count: "exact" })
    .order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (g) {
    const def = GROUPS[g];
    if ("match" in def) q = q.eq("actor_role", def.match);
    else {
      const pre = (Array.isArray(def.prefix) ? def.prefix : [def.prefix]) as string[];
      q = q.or(pre.map((p) => `action.like.${p}*`).join(","));
    }
  }
  const { data, count } = await q;
  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
  const shopIds = [...new Set(rows.map((r) => r.barbershop_id).filter(Boolean))] as string[];
  const [{ data: actors }, { data: shops }] = await Promise.all([
    actorIds.length ? supabase.from("profiles").select("id, full_name, email").in("id", actorIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
    shopIds.length ? supabase.from("barbershops").select("id, name").in("id", shopIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const actor = new Map((actors ?? []).map((a) => [a.id, a.full_name || a.email || "Usuário"]));
  const shop = new Map((shops ?? []).map((s) => [s.id, s.name]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const href = (gg: G | undefined, p = 1) => `/super-admin/auditoria${gg || p > 1 ? "?" : ""}${new URLSearchParams({ ...(gg ? { g: gg } : {}), ...(p > 1 ? { p: String(p) } : {}) })}`;

  return (
    <div className="grid gap-5">
      <PageHeader title="Auditoria" description="Tudo que muda planos, assinaturas, barbearias e integrações fica registrado" />
      <ChipRow>
        <FilterChip href={href(undefined)} active={!g}>Tudo</FilterChip>
        {(Object.keys(GROUPS) as G[]).map((k) => <FilterChip key={k} href={href(k)} active={g === k}>{GROUPS[k].label}</FilterChip>)}
      </ChipRow>
      {rows.length === 0 ? (
        <EmptyState icon={FileClock} title="Nada registrado" description="Nenhum evento para esse filtro." />
      ) : (
        <ol className="relative grid gap-0 border-l border-white/[0.08] pl-4">
          {rows.map((r) => {
            const d = describe(r.metadata);
            return (
              <li key={r.id} className="relative py-2.5">
                <span className={`absolute -left-[21px] top-4 size-2.5 rounded-full ${r.actor_role === "super_admin" ? "bg-[#E7B661]" : "bg-sky/70"}`} aria-hidden />
                <p className="text-[14px] text-halo">
                  {AUDIT_LABEL[r.action] ?? r.action}
                  {r.barbershop_id && (
                    <> · <Link className="text-sky hover:underline" href={`/super-admin/barbearias/${r.barbershop_id}`}>{shop.get(r.barbershop_id) ?? "barbearia"}</Link></>
                  )}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {r.actor_id ? actor.get(r.actor_id) ?? "Usuário" : "Sistema"}{r.actor_role === "super_admin" ? " (admin)" : ""} · {formatDateTime(r.created_at)}
                </p>
                {d && <p className="mt-0.5 break-words text-[12px] text-subtle-foreground">{d}</p>}
              </li>
            );
          })}
        </ol>
      )}
      <Pager page={page} pages={pages} href={(p) => href(g, p)} />
    </div>
  );
}
