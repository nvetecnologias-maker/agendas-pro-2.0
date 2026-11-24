"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/form-controls";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { Customer } from "@/types/database";
import { saveCustomerAction } from "@/app/painel/(app)/clientes/actions";

export function CustomersToolbar({ initialQuery, canCreate }: { initialQuery: string; canCreate: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = React.useState(initialQuery);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (q === initialQuery) return;
    const t = setTimeout(() => router.replace(`${pathname}${q ? `?q=${encodeURIComponent(q)}` : ""}`, { scroll: false }), 300);
    return () => clearTimeout(t);
  }, [q, initialQuery, pathname, router]);

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou telefone" aria-label="Buscar cliente" className="h-12 pl-10" />
      </div>
      {canCreate && <Button className="h-12" onClick={() => setOpen(true)} aria-label="Novo cliente"><Plus /> <span className="max-sm:hidden">Novo cliente</span></Button>}
      <Sheet open={open} onOpenChange={setOpen}>
        {open && <CustomerForm onDone={(id) => { setOpen(false); if (id) router.push(`/painel/clientes/${id}`); }} />}
      </Sheet>
    </div>
  );
}

export function CustomerForm({ c, onDone }: { c?: Customer; onDone: (id?: string) => void }) {
  const router = useRouter();
  const [f, setF] = React.useState({ name: c?.name ?? "", phone: c?.phone ?? "", email: c?.email ?? "", notes: c?.notes ?? "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();
  const submit = () =>
    start(async () => {
      const r = await saveCustomerAction({ id: c?.id, ...f });
      if (r.ok) { toast.success(r.message!); router.refresh(); onDone(c ? undefined : r.data?.id); }
      else { setErrors(r.fieldErrors ?? {}); toast.error(r.error); }
    });
  return (
    <SheetContent title={c ? "Editar cliente" : "Novo cliente"} footer={<Button size="lg" className="w-full" loading={pending} onClick={submit}>Salvar</Button>}>
      <div className="grid gap-4">
        <Field id="c-name" label="Nome" error={errors.name}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="h-12" /></Field>
        <Field id="c-phone" label="Telefone (WhatsApp)" error={errors.phone}><Input value={f.phone} inputMode="tel" onChange={(e) => setF({ ...f, phone: e.target.value })} className="h-12" /></Field>
        <Field id="c-email" label="E-mail" error={errors.email}><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="h-12" /></Field>
        <Field id="c-notes" label="Observações" hint="Preferências, alergias, estilo de corte…"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
    </SheetContent>
  );
}
