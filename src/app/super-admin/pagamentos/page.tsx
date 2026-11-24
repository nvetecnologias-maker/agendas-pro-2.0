import Link from "next/link";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, StatCard } from "@/components/panel/page-header";
import { FilterChip, ChipRow, Pager } from "@/components/admin/filter-chip";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { GATEWAY_LABEL, TX_STATUS_LABEL } from "@/lib/admin/labels";
import type { Enums } from "@/types/database";

export const metadata = { title: "Pagamentos" };
const PAGE = 30;
const STATUSES = ["approved", "pending", "refused", "refunded", "canceled"] as const;
const METHOD: Record<string, string> = { pix: "Pix", credit_card: "Cartão", boleto: "Boleto" };

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string; p?: string }> }) {
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as Enums<"transaction_status">) : undefined;
  const page = Math.max(1, Number(sp.p) || 1);
  const supabase = await createClient();
  let q = supabase.from("payment_transactions")
    .select("id, amount_cents, discount_cents, method, status, gateway, environment, paid_at, created_at, barbershop_id, barbershops(name), plans(name)", { count: "exact" })
    .order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (status) q = q.eq("status", status);
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [{ data, count }, { data: month }] = await Promise.all([
    q,
    supabase.from("payment_transactions").select("amount_cents, status").gte("created_at", since),
  ]);
  const approved = (month ?? []).filter((t) => t.status === "approved");
  const sum = approved.reduce((a, t) => a + t.amount_cents, 0);
  const refused = (month ?? []).filter((t) => t.status === "refused").length;
  const rows = data ?? [];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const href = (patch: { status?: string; p?: number }) => {
    const u = new URLSearchParams();
    const s = "status" in patch ? patch.status : status;
    if (s) u.set("status", s);
    if (patch.p && patch.p > 1) u.set("p", String(patch.p));
    const str = u.toString();
    return `/super-admin/pagamentos${str ? `?${str}` : ""}`;
  };

  return (
    <div className="grid gap-5">
      <PageHeader title="Pagamentos" description="Cobranças de assinatura recebidas pelos gateways" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
        <StatCard label="Recebido nos últimos 30 dias" value={formatMoney(sum)} tone="brand" className="col-span-2 md:col-span-1" />
        <StatCard label="Aprovados" value={approved.length} />
        <StatCard label="Recusados" value={refused} />
      </div>
      <ChipRow>
        <FilterChip href={href({ status: undefined })} active={!status}>Todos</FilterChip>
        {STATUSES.map((s) => <FilterChip key={s} href={href({ status: s })} active={status === s}>{TX_STATUS_LABEL[s].label}</FilterChip>)}
      </ChipRow>
      {rows.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhum pagamento ainda" description="Quando um gateway estiver ativo, as cobranças aparecem aqui automaticamente." />
      ) : (
        <ul className="grid gap-2">
          {rows.map((t) => {
            const st = TX_STATUS_LABEL[t.status];
            return (
              <li key={t.id}>
                <Link href={`/super-admin/barbearias/${t.barbershop_id}`} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-3.5 hover:border-white/15">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-halo">{t.barbershops?.name ?? "Barbearia"}</p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {t.plans?.name ?? "Não informado"} · {GATEWAY_LABEL[t.gateway]}{t.method ? ` · ${METHOD[t.method] ?? t.method}` : ""}{t.environment === "sandbox" ? " · teste" : ""}
                    </p>
                    <p className="text-[12px] text-subtle-foreground">{formatDateTime(t.paid_at ?? t.created_at)}</p>
                  </div>
                  <div className="grid justify-items-end gap-1">
                    <p className="font-mono text-[15px] font-semibold text-halo">{formatMoney(t.amount_cents)}</p>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Pager page={page} pages={pages} href={(p) => href({ p })} />
    </div>
  );
}
