import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatDate } from "@/lib/datetime";
import { SUB_STATUS_LABEL } from "@/lib/admin/labels";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

export const metadata = { title: "Barbearias" };
const PAGE = 25;
const SUBS = ["trial", "active", "pending", "past_due", "suspended", "canceled", "expired"] as const;

type SP = { q?: string; status?: string; assinatura?: string; p?: string };

export default async function AdminShopsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const shopStatus = sp.status === "active" || sp.status === "suspended" ? sp.status : undefined;
  const subStatus = (SUBS as readonly string[]).includes(sp.assinatura ?? "") ? sp.assinatura : undefined;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_barbershops", {
    ...(sp.q ? { p_search: sp.q.slice(0, 80) } : {}),
    ...(shopStatus ? { p_shop_status: shopStatus } : {}),
    ...(subStatus ? { p_sub_status: subStatus } : {}),
    p_limit: PAGE,
    p_offset: (page - 1) * PAGE,
  });
  const rows = data ?? [];
  const total = Number(rows[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (patch: Partial<SP>) => {
    const u = new URLSearchParams();
    const m = { ...sp, ...patch };
    for (const [k, v] of Object.entries(m)) if (v) u.set(k, String(v));
    const s = u.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="grid gap-5">
      <PageHeader title="Barbearias" description={`${total} encontrada(s)`} />

      <form className="flex gap-2" action="/super-admin/barbearias">
        {subStatus && <input type="hidden" name="assinatura" value={subStatus} />}
        {shopStatus && <input type="hidden" name="status" value={shopStatus} />}
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
          <input name="q" defaultValue={sp.q} placeholder="Nome, link, dono, e-mail ou telefone"
            className="h-12 w-full rounded-lg border border-white/[0.08] bg-surface-1 pl-10 pr-4 text-base md:text-[15px] text-halo placeholder:text-subtle-foreground outline-none focus:border-sky/50" />
        </label>
        <button className="h-12 rounded-lg bg-electric px-5 text-sm font-medium text-white">Buscar</button>
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        <Chip href={`/super-admin/barbearias${qs({ assinatura: undefined, status: undefined, p: undefined })}`} active={!subStatus && !shopStatus}>Todas</Chip>
        {SUBS.map((s) => (
          <Chip key={s} href={`/super-admin/barbearias${qs({ assinatura: s, p: undefined })}`} active={subStatus === s}>{SUB_STATUS_LABEL[s].label}</Chip>
        ))}
        <Chip href={`/super-admin/barbearias${qs({ status: shopStatus === "suspended" ? undefined : "suspended", p: undefined })}`} active={shopStatus === "suspended"}>Barbearia suspensa</Chip>
      </div>

      {error ? (
        <p className="text-danger">Erro ao carregar.</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhuma barbearia encontrada" description="Ajuste a busca ou os filtros." />
      ) : (
        <ul className="grid gap-2">
          {rows.map((r) => {
            const st = r.sub_status ? SUB_STATUS_LABEL[r.sub_status as Enums<"subscription_status">] : null;
            return (
              <li key={r.id}>
                <Link href={`/super-admin/barbearias/${r.id}`} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-3.5 transition hover:border-white/15">
                  <Avatar name={r.name} className="size-11 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-[15px] font-medium text-halo">
                      {r.name}
                      {r.status === "suspended" && <Badge tone="danger">Suspensa</Badge>}
                    </p>
                    <p className="truncate text-[13px] text-muted-foreground">{r.owner_name ?? "Sem dono"} · {r.owner_email ?? "Não informado"}</p>
                    <p className="mt-0.5 truncate text-[12px] text-subtle-foreground">
                      /{r.slug} · {r.professionals} prof. · {r.appointments_30d} agend. 30d · desde {formatDate(r.created_at)}
                    </p>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                    {st && <Badge tone={st.tone}>{st.label}</Badge>}
                    <span className="text-[12px] text-muted-foreground">{r.plan_name ?? "Sem plano"}{r.period_end ? ` · até ${formatDate(r.period_end)}` : ""}</span>
                  </div>
                  {st && <Badge tone={st.tone} className="sm:hidden">{st.label}</Badge>}
                  <ChevronRight className="size-4 shrink-0 text-subtle-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between" aria-label="Paginação">
          <Link aria-disabled={page <= 1} href={`/super-admin/barbearias${qs({ p: String(page - 1) })}`}
            className={cn("inline-flex h-11 items-center gap-1 rounded-lg bg-white/[0.05] px-4 text-sm", page <= 1 && "pointer-events-none opacity-40")}>
            <ChevronLeft className="size-4" /> Anterior
          </Link>
          <span className="text-sm text-muted-foreground">Página {page} de {pages}</span>
          <Link aria-disabled={page >= pages} href={`/super-admin/barbearias${qs({ p: String(page + 1) })}`}
            className={cn("inline-flex h-11 items-center gap-1 rounded-lg bg-white/[0.05] px-4 text-sm", page >= pages && "pointer-events-none opacity-40")}>
            Próxima <ChevronRight className="size-4" />
          </Link>
        </nav>
      )}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={cn("inline-flex h-9 shrink-0 items-center rounded-lg border px-3.5 text-[13px]",
        active ? "border-[#E7B661]/40 bg-[#B98226]/20 text-halo" : "border-white/[0.08] text-muted-foreground hover:text-halo")}>
      {children}
    </Link>
  );
}
