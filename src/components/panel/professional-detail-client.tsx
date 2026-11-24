"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/form-controls";
import { Sheet } from "@/components/ui/sheet";
import { WeekHoursEditor } from "@/components/panel/week-hours-editor";
import { formatPhone } from "@/lib/appointments/status";
import { DEFAULT_WEEK, type DayRanges } from "@/lib/schedule";
import { saveWeekAction } from "@/app/painel/(app)/configuracoes/schedule-actions";
import { toggleProfessionalAction } from "@/app/painel/(app)/profissionais/actions";
import { ProfessionalForm, type ProWithServices } from "./professionals-client";

export function ProfessionalDetailClient({
  shopId, pro, services, week,
}: {
  shopId: string;
  pro: ProWithServices;
  services: { id: string; name: string; is_active: boolean }[];
  week: DayRanges[] | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [own, setOwn] = React.useState(!!week);
  const [value, setValue] = React.useState<DayRanges[]>(week ?? DEFAULT_WEEK);
  const [pending, start] = React.useTransition();

  const saveHours = () =>
    start(async () => {
      const r = await saveWeekAction(pro.id, own ? value : null);
      if (r.ok) { toast.success(r.message!); router.refresh(); } else toast.error(r.error);
    });

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={pro.name} src={pro.photo_url} className="size-16 text-lg" />
        <div className="min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-0">
          <h1 className="truncate text-2xl font-semibold text-halo">{pro.name}</h1>
          <p className="text-sm text-muted-foreground">{[formatPhone(pro.phone), pro.email].filter(Boolean).join(" · ") || "Sem contato cadastrado"}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge tone={pro.is_active ? "success" : "neutral"} dot>{pro.is_active ? "Ativo" : "Inativo"}</Badge>
            {pro.specialties.map((s) => <Badge key={s}>{s}</Badge>)}
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button variant="subtle" onClick={() => setEditing(true)}><Pencil /> Editar</Button>
          <Button variant="subtle" loading={pending} onClick={() => start(async () => {
            const r = await toggleProfessionalAction(pro.id, !pro.is_active);
            if (r.ok) { toast.success(r.message!); router.refresh(); } else toast.error(r.error);
          })}><Power /> {pro.is_active ? "Desativar" : "Ativar"}</Button>
        </div>
      </div>

      <section className="grid gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-halo">Horários de trabalho</h2>
        </div>
        <Switch
          label="Horário próprio"
          description={own ? "Este profissional tem expediente diferente da barbearia" : "Segue o horário de funcionamento da barbearia"}
          checked={own}
          onCheckedChange={setOwn}
        />
        {own && <WeekHoursEditor value={value} onChange={setValue} />}
        <Button loading={pending} onClick={saveHours} className="justify-self-start">Salvar horários</Button>
      </section>

      <Sheet open={editing} onOpenChange={setEditing}>
        {editing && <ProfessionalForm shopId={shopId} p={pro} services={services} onDone={() => { setEditing(false); router.refresh(); }} />}
      </Sheet>
    </>
  );
}
