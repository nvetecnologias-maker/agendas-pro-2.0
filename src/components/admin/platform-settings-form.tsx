"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/panel/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePlatformSettingsAction } from "@/app/super-admin/actions";

type V = {
  platformName: string; supportEmail: string; contactPhone: string; contactWhatsapp: string; publicBaseUrl: string;
  defaultTrialDays: string; gracePeriodDays: string; instagram: string;
};

export function PlatformSettingsForm({ initial }: { initial: V }) {
  const router = useRouter();
  const [v, setV] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();
  const set = (k: keyof V) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  const save = () => start(async () => {
    const r = await savePlatformSettingsAction(v);
    if (!r.ok) { setErrors(r.fieldErrors ?? {}); return void toast.error(r.error); }
    setErrors({});
    toast.success(r.message ?? "Salvo");
    router.refresh();
  });

  const F = ({ k, label, hint, ...rest }: { k: keyof V; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="grid content-start gap-1.5 text-[13px] text-muted-foreground">
      {label}
      <Input value={v[k]} onChange={set(k)} {...rest} />
      {errors[k] ? <span className="text-[12px] text-danger">{errors[k]}</span> : hint ? <span className="text-[12px] text-subtle-foreground">{hint}</span> : null}
    </label>
  );

  return (
    <div className="grid min-w-0 max-w-3xl gap-5 pb-20 md:pb-0">
      <PageHeader title="Configurações" description="Dados da plataforma usados no site, nos e-mails e nas assinaturas" />
      <section className="grid gap-4 rounded-2xl border border-white/[0.07] bg-surface-1 p-4">
        <h2 className="font-medium text-halo">Marca e contato</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {F({ k: "platformName", label: "Nome da plataforma" })}
          {F({ k: "publicBaseUrl", label: "Endereço do site", inputMode: "url", hint: "Usado nos links de agendamento e webhooks" })}
          {F({ k: "supportEmail", label: "E-mail de suporte", type: "email", inputMode: "email" })}
          {F({ k: "instagram", label: "Instagram", placeholder: "@agendaspro" })}
          {F({ k: "contactPhone", label: "Telefone", inputMode: "tel" })}
          {F({ k: "contactWhatsapp", label: "WhatsApp", inputMode: "tel", hint: "Botão de contato do site" })}
        </div>
      </section>
      <section className="grid gap-4 rounded-2xl border border-white/[0.07] bg-surface-1 p-4">
        <h2 className="font-medium text-halo">Assinaturas</h2>
        <div className="grid grid-cols-2 gap-3">
          {F({ k: "defaultTrialDays", label: "Dias de teste grátis", type: "number", inputMode: "numeric", min: 0, max: 90, hint: "Para novos cadastros" })}
          {F({ k: "gracePeriodDays", label: "Tolerância após vencer", type: "number", inputMode: "numeric", min: 0, max: 60, hint: "Dias até bloquear" })}
        </div>
      </section>
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-white/[0.06] bg-navy/90 p-3 backdrop-blur-xl md:static md:border-0 md:bg-transparent md:p-0">
        <Button size="lg" className="w-full md:w-auto" disabled={!dirty} loading={pending} onClick={save}>Salvar configurações</Button>
      </div>
    </div>
  );
}
