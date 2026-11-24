import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, Mail, MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/panel/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ShopAdminActions } from "@/components/admin/shop-admin-actions";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { formatPhone, whatsappLink } from "@/lib/appointments/status";
import { AUDIT_LABEL, EVENT_LABEL, GATEWAY_LABEL, PERIOD_SUFFIX, SUB_STATUS_LABEL, TX_STATUS_LABEL } from "@/lib/admin/labels";
import type { Barbershop, Enums, Subscription } from "@/types/database";

type Detail = {
  shop: Barbershop;
  access: string;
  members: { role: string; name: string | null; email: string | null; phone: string | null; is_active: boolean }[];
  subscription: (Subscription & { plan_name: string; plan_slug: string }) | null;
  events: { event_type: string; from_status: string | null; to_status: string | null; metadata: Record<string, unknown>; created_at: string; actor_name: string | null }[];
  audit: { action: string; entity_type: string | null; metadata: Record<string, unknown>; created_at: string; actor_role: string | null; actor_name: string | null }[];
  transactions: { id: string; gateway: Enums<"payment_gateway">; amount_cents: number; method: string | null; status: Enums<"transaction_status">; paid_at: string | null; created_at: string }[];
  stats: { professionals: number; services: number; customers: number; appointments_total: number; appointments_30d: number; public_bookings_30d: number; last_appointment_at: string | null };
};

const ACCESS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  full: { label: "Acesso total", tone: "success" },
  grace: { label: "Em carência", tone: "warning" },
  billing_only: { label: "Só assinatura", tone: "warning" },
  blocked: { label: "Bloqueada", tone: "danger" },
};
const ROLE: Record<string, string> = { owner: "Proprietário", admin: "Administrador", professional: "Profissional" };

export default async function AdminShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data }, { data: plans }] = await Promise.all([
    supabase.rpc("admin_barbershop_detail", { p_barbershop_id: id }),
    supabase.from("plans").select("id, name, price_cents, billing_period, is_active").order("sort_order"),
  ]);
  const d = data as unknown as Detail | null;
  if (!d) notFound();
  const { shop, subscription: sub, stats } = d;
  const owner = d.members.find((m) => m.role === "owner");
  const st = sub ? SUB_STATUS_LABEL[sub.status] : null;
  const access = ACCESS[d.access] ?? ACCESS.blocked;

  return (
    <div className="grid gap-5">
      <Link href="/super-admin/barbearias" className="flex items-center gap-1 text-[13px] text-sky"><ChevronLeft className="size-4" /> Barbearias</Link>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={shop.name} src={shop.logo_url} className="size-16 rounded-2xl text-lg" />
        <div className="min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-0">
          <h1 className="truncate text-2xl font-semibold text-halo">{shop.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone={shop.status === "active" ? "success" : "danger"} dot>{shop.status === "active" ? "Ativa" : "Suspensa"}</Badge>
            <Badge tone={access.tone}>{access.label}</Badge>
            {shop.published_at ? <Badge tone="info">Agenda publicada</Badge> : <Badge>Não publicada</Badge>}
          </div>
        </div>
        <a href={`/${shop.slug}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/[0.06] px-4 text-sm text-halo">
          <ExternalLink className="size-4" /> /{shop.slug}
        </a>
      </div>

      <ShopAdminActions shopId={shop.id} shopStatus={shop.status} subStatus={sub?.status ?? null} currentPlanId={sub?.plan_id ?? null}
        plans={(plans ?? []).map((p) => ({ id: p.id, name: p.name, price: `${formatMoney(p.price_cents)}${PERIOD_SUFFIX[p.billing_period]}`, active: p.is_active }))} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-3">Assinatura</CardTitle>
          {sub ? (
            <dl className="grid gap-2.5 text-[14px]">
              <Row label="Plano" value={<span className="font-medium text-halo">{sub.plan_name}</span>} />
              <Row label="Status" value={st && <Badge tone={st.tone}>{st.label}</Badge>} />
              <Row label="Valor" value={<span className="font-mono">{formatMoney(sub.amount_cents)}{PERIOD_SUFFIX[sub.billing_period]}</span>} />
              <Row label="Período atual" value={`${formatDate(sub.current_period_start)} – ${formatDate(sub.current_period_end)}`} />
              <Row label="Próxima cobrança" value={sub.next_billing_at ? formatDate(sub.next_billing_at) : "—"} />
              <Row label="Gateway" value={sub.gateway ? GATEWAY_LABEL[sub.gateway] : "—"} />
              {sub.cancel_at_period_end && <Row label="Cancelamento" value="No fim do período" />}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Sem assinatura. Use “Trocar plano” para criar uma.</p>
          )}
        </Card>
        <Card>
          <CardTitle className="mb-3">Responsável</CardTitle>
          {owner ? (
            <div className="grid gap-2 text-[14px]">
              <p className="font-medium text-halo">{owner.name ?? "—"}</p>
              {owner.email && <a href={`mailto:${owner.email}`} className="flex items-center gap-2 text-muted-foreground"><Mail className="size-4" /> {owner.email}</a>}
              {owner.phone && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <a href={`tel:+55${owner.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/[0.06] px-3 text-sm"><Phone className="size-4" /> {formatPhone(owner.phone)}</a>
                  <a href={whatsappLink(owner.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/[0.06] px-3 text-sm"><MessageCircle className="size-4" /> WhatsApp</a>
                </div>
              )}
            </div>
          ) : <p className="text-sm text-muted-foreground">Sem proprietário.</p>}
          {d.members.length > 1 && (
            <ul className="mt-4 grid gap-1.5 border-t border-white/[0.06] pt-3 text-[13px]">
              {d.members.filter((m) => m !== owner).map((m, i) => (
                <li key={i} className="flex justify-between gap-2"><span className="truncate text-halo">{m.name ?? m.email}</span><span className="text-muted-foreground">{ROLE[m.role] ?? m.role}</span></li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Agendamentos 30d" value={stats.appointments_30d} hint={`${stats.public_bookings_30d} online · ${stats.appointments_total} no total`} />
        <StatCard label="Clientes" value={stats.customers} />
        <StatCard label="Profissionais ativos" value={stats.professionals} hint={`${stats.services} serviço(s) ativo(s)`} />
        <StatCard label="Último agendamento" value={stats.last_appointment_at ? formatDate(stats.last_appointment_at) : "—"} hint={`Cliente desde ${formatDate(shop.created_at)}`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="none" className="overflow-hidden">
          <CardTitle className="px-4 pb-2 pt-4">Histórico da assinatura</CardTitle>
          {d.events.length === 0 ? <p className="px-4 pb-5 text-sm text-subtle-foreground">Sem eventos.</p> : (
            <ul className="divide-y divide-white/[0.05]">
              {d.events.map((e, i) => (
                <li key={i} className="px-4 py-3 text-[13px]">
                  <p className="text-halo">{EVENT_LABEL[e.event_type] ?? e.event_type}
                    {e.event_type === "days_granted" && e.metadata?.days ? ` (${String(e.metadata.days)} dias)` : ""}
                    {e.from_status && e.to_status && e.from_status !== e.to_status ? ` · ${SUB_STATUS_LABEL[e.from_status as Enums<"subscription_status">]?.label} → ${SUB_STATUS_LABEL[e.to_status as Enums<"subscription_status">]?.label}` : ""}
                  </p>
                  <p className="text-subtle-foreground">{formatDateTime(e.created_at)} · {e.actor_name ?? "Sistema"}{e.metadata?.reason ? ` · “${String(e.metadata.reason)}”` : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card padding="none" className="overflow-hidden">
          <CardTitle className="px-4 pb-2 pt-4">Pagamentos da assinatura</CardTitle>
          {d.transactions.length === 0 ? <p className="px-4 pb-5 text-sm text-subtle-foreground">Nenhum pagamento ainda.</p> : (
            <ul className="divide-y divide-white/[0.05]">
              {d.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
                  <div><p className="text-halo">{GATEWAY_LABEL[t.gateway]} · {t.method ?? "—"}</p><p className="text-subtle-foreground">{formatDateTime(t.paid_at ?? t.created_at)}</p></div>
                  <div className="text-right"><p className="font-mono text-halo">{formatMoney(t.amount_cents)}</p><Badge tone={TX_STATUS_LABEL[t.status].tone}>{TX_STATUS_LABEL[t.status].label}</Badge></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card padding="none" className="overflow-hidden">
        <CardTitle className="px-4 pb-2 pt-4">Auditoria</CardTitle>
        {d.audit.length === 0 ? <p className="px-4 pb-5 text-sm text-subtle-foreground">Sem registros.</p> : (
          <ul className="divide-y divide-white/[0.05]">
            {d.audit.map((a, i) => (
              <li key={i} className="px-4 py-3 text-[13px]">
                <p className="text-halo">{AUDIT_LABEL[a.action] ?? a.action}</p>
                <p className="text-subtle-foreground">{formatDateTime(a.created_at)} · {a.actor_name ?? (a.actor_role === "system" ? "Sistema" : a.actor_role ?? "—")}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-halo">{value}</dd>
    </div>
  );
}
