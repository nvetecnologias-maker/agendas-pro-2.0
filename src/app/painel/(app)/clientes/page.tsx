import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Contact } from "lucide-react";
import { requirePanelAction } from "@/lib/panel/context";
import { PageHeader, EmptyState } from "@/components/panel/page-header";
import { CustomersToolbar } from "@/components/panel/customers-client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { formatPhone } from "@/lib/appointments/status";

export const metadata: Metadata = { title: "Clientes · Agendas Pro" };
const PAGE = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; p?: string }> }) {
  const panel = await requirePanelAction("customers.view");
  const { supabase, shop, tz } = panel;
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(0, Number(sp.p ?? 0) || 0);

  let query = supabase.from("customers").select("id, name, phone, created_at", { count: "exact" }).eq("barbershop_id", shop.id);
  if (q) {
    const digits = q.replace(/\D/g, "");
    query = digits.length >= 3 ? query.ilike("phone", `%${digits}%`) : query.ilike("name", `%${q.replace(/[%,()*]/g, " ")}%`);
  }
  const { data: customers, count } = await query.order("name").range(page * PAGE, page * PAGE + PAGE - 1);
  const ids = (customers ?? []).map((c) => c.id);
  const { data: stats } = ids.length
    ? await supabase.from("customer_stats").select("*").in("customer_id", ids)
    : { data: [] };
  const byId = new Map((stats ?? []).map((s) => [s.customer_id, s]));
  const showMoney = panel.can("finance.view");

  return (
    <div className="grid gap-5">
      <PageHeader title="Clientes" description={`${count ?? 0} cliente(s)${q ? " encontrados" : " cadastrados"}`} />
      <CustomersToolbar initialQuery={q} canCreate={panel.can("customers.manage")} />
      {!customers?.length ? (
        <EmptyState icon={Contact} title={q ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"} description={q ? "Tente outro nome ou telefone." : "Clientes entram automaticamente quando agendam pelo link ou quando você cria um agendamento."} />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {customers.map((c) => {
            const s = byId.get(c.id);
            return (
              <li key={c.id}>
                <Link href={`/painel/clientes/${c.id}`} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-3 active:bg-white/5">
                  <Avatar name={c.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-halo">{c.name}</p>
                    <p className="text-[13px] text-muted-foreground">{formatPhone(c.phone)}</p>
                    <p className="text-[12px] text-subtle-foreground">
                      {s?.completed_appointments ?? 0} atendimento(s)
                      {s?.last_visit_at ? ` · último em ${formatDate(s.last_visit_at, tz)}` : ""}
                    </p>
                  </div>
                  {showMoney && <span className="shrink-0 font-mono text-[13px] text-halo">{formatMoney(s?.total_spent_cents ?? 0)}</span>}
                  <ChevronRight className="size-4 shrink-0 text-subtle-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {(count ?? 0) > PAGE && (
        <div className="flex items-center justify-between">
          <Button variant="subtle" size="sm" disabled={page === 0} asChild={page > 0}>
            {page > 0 ? <Link href={`?q=${encodeURIComponent(q)}&p=${page - 1}`}>Anterior</Link> : <span>Anterior</span>}
          </Button>
          <span className="text-[13px] text-muted-foreground">Página {page + 1} de {Math.ceil((count ?? 0) / PAGE)}</span>
          <Button variant="subtle" size="sm" disabled={(page + 1) * PAGE >= (count ?? 0)} asChild={(page + 1) * PAGE < (count ?? 0)}>
            {(page + 1) * PAGE < (count ?? 0) ? <Link href={`?q=${encodeURIComponent(q)}&p=${page + 1}`}>Próxima</Link> : <span>Próxima</span>}
          </Button>
        </div>
      )}
    </div>
  );
}
