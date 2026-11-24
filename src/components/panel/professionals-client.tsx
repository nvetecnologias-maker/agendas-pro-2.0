"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Switch, Textarea } from "@/components/ui/form-controls";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import { PageHeader, EmptyState } from "@/components/panel/page-header";
import { ImageUpload } from "@/components/panel/image-upload";
import { formatPhone } from "@/lib/appointments/status";
import { cn } from "@/lib/utils";
import type { Professional } from "@/types/database";
import { saveProfessionalAction } from "@/app/painel/(app)/profissionais/actions";

export type ProWithServices = Professional & { serviceIds: string[] };
type Svc = { id: string; name: string; is_active: boolean };

export function ProfessionalsClient({ shopId, professionals, services, limit }: { shopId: string; professionals: ProWithServices[]; services: Svc[]; limit: number | null }) {
  const [editing, setEditing] = React.useState<Partial<ProWithServices> | null>(null);
  const active = professionals.filter((p) => p.is_active).length;
  const atLimit = limit !== null && active >= limit;

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Profissionais"
        description={limit === null ? `${active} ativos · ilimitado no seu plano` : `${active} de ${limit} ativos no seu plano`}
        actions={<Button onClick={() => setEditing({ is_active: !atLimit, serviceIds: services.filter((s) => s.is_active).map((s) => s.id), specialties: [] })}><Plus /> Adicionar</Button>}
      />
      {atLimit && (
        <Alert tone="info" title="Limite do plano atingido">
          Para ativar mais profissionais, <Link href="/painel/assinatura" className="text-sky underline">faça upgrade do plano</Link>. Você ainda pode cadastrar profissionais inativos.
        </Alert>
      )}
      {professionals.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum profissional" description="Adicione você e sua equipe. Cada profissional tem agenda, horários e relatório próprios." />
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2">
          {professionals.map((p) => (
            <li key={p.id}>
              <Link href={`/painel/profissionais/${p.id}`} className={cn("flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-3 active:bg-white/5", !p.is_active && "opacity-60")}>
                <Avatar name={p.name} src={p.photo_url} className="size-14 text-base" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-halo">{p.name}</p>
                  <p className="truncate text-[13px] text-muted-foreground">{p.specialties.length ? p.specialties.join(" · ") : formatPhone(p.phone) || "Não informado"}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone={p.is_active ? "success" : "neutral"} dot>{p.is_active ? "Ativo" : "Inativo"}</Badge>
                    <Badge>{p.serviceIds.length} serviço(s)</Badge>
                  </div>
                </div>
                <ChevronRight className="size-5 text-subtle-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <ProfessionalForm key={editing.id ?? "new"} shopId={shopId} p={editing} services={services} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}

export function ProfessionalForm({ shopId, p, services, onDone }: { shopId: string; p: Partial<ProWithServices>; services: Svc[]; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = React.useState(p.name ?? "");
  const [phone, setPhone] = React.useState(p.phone ?? "");
  const [email, setEmail] = React.useState(p.email ?? "");
  const [specialties, setSpecialties] = React.useState((p.specialties ?? []).join(", "));
  const [bio, setBio] = React.useState(p.bio ?? "");
  const [photo, setPhoto] = React.useState<string | null>(p.photo_url ?? null);
  const [active, setActive] = React.useState(p.is_active ?? true);
  const [svc, setSvc] = React.useState<string[]>(p.serviceIds ?? []);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();

  const submit = () =>
    start(async () => {
      const r = await saveProfessionalAction({
        id: p.id, name, phone, email, bio, photoUrl: photo, isActive: active, serviceIds: svc,
        specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (r.ok) {
        toast.success(r.message!);
        onDone();
        if (!p.id && r.data) router.push(`/painel/profissionais/${r.data.id}`);
        else router.refresh();
      } else { setErrors(r.fieldErrors ?? {}); toast.error(r.error); }
    });

  return (
    <SheetContent title={p.id ? "Editar profissional" : "Novo profissional"} footer={<Button size="lg" className="w-full" loading={pending} onClick={submit}>Salvar</Button>}>
      <div className="grid gap-4">
        <ImageUpload shopId={shopId} folder="professionals" value={photo} onChange={setPhoto} label="Foto" />
        <Field id="p-name" label="Nome" error={errors.name}><Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="p-phone" label="Telefone"><Input value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} className="h-12" /></Field>
          <Field id="p-email" label="E-mail" error={errors.email}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" /></Field>
        </div>
        <Field id="p-spec" label="Especialidades" hint="Separe por vírgula. Ex.: degradê, barba, pigmentação"><Input value={specialties} onChange={(e) => setSpecialties(e.target.value)} className="h-12" /></Field>
        <Field id="p-bio" label="Apresentação" hint="Aparece na página de agendamento"><Textarea value={bio} onChange={(e) => setBio(e.target.value)} /></Field>
        <div className="grid gap-2">
          <p className="text-sm font-medium text-halo">Serviços que realiza</p>
          {services.length === 0 ? <p className="text-[13px] text-muted-foreground">Cadastre serviços primeiro.</p> : (
            <div className="flex flex-wrap gap-2">
              {services.map((s) => {
                const on = svc.includes(s.id);
                return (
                  <button key={s.id} type="button" aria-pressed={on} onClick={() => setSvc(on ? svc.filter((x) => x !== s.id) : [...svc, s.id])}
                    className={cn("h-10 rounded-lg border px-4 text-[13px]", on ? "border-sky/40 bg-electric/25 text-halo" : "border-white/10 text-muted-foreground")}>
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <Switch label="Ativo" description="Inativos não recebem agendamentos e não contam no limite do plano" checked={active} onCheckedChange={setActive} />
      </div>
    </SheetContent>
  );
}
