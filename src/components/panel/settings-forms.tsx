"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select, Switch, Textarea } from "@/components/ui/form-controls";
import { ImageUpload } from "@/components/panel/image-upload";
import { WeekHoursEditor } from "@/components/panel/week-hours-editor";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { DayRanges } from "@/lib/schedule";
import type { ActionResult } from "@/lib/db-errors";
import type { Barbershop } from "@/types/database";
import { saveBrandingAction, savePreferencesAction, saveShopProfileAction } from "@/app/painel/(app)/configuracoes/actions";
import { saveWeekAction } from "@/app/painel/(app)/configuracoes/schedule-actions";

function useSave() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const save = (fn: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { setErrors({}); toast.success(r.message ?? "Salvo"); router.refresh(); after?.(); }
      else { setErrors(r.fieldErrors ?? {}); toast.error(r.error); }
    });
  return { pending, errors, save };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-2xl border border-white/[0.07] bg-surface-1 p-4 md:p-5">
      <h2 className="text-base font-semibold text-halo">{title}</h2>
      {children}
    </section>
  );
}

function SaveBar({ pending, onClick, label = "Salvar alterações" }: { pending: boolean; onClick: () => void; label?: string }) {
  return (
    <div className="sticky bottom-20 z-20 lg:bottom-4">
      <Button size="lg" className="w-full shadow-2xl md:w-auto" loading={pending} onClick={onClick}><Check /> {label}</Button>
    </div>
  );
}

type Social = Partial<Record<"instagram" | "facebook" | "tiktok" | "youtube", string>>;

export function ShopProfileForm({ shop }: { shop: Barbershop }) {
  const social = (shop.social_links ?? {}) as Social;
  const [f, setF] = React.useState({
    name: shop.name, description: shop.description ?? "", phone: shop.phone ?? "", whatsapp: shop.whatsapp ?? "", email: shop.email ?? "",
    address_street: shop.address_street ?? "", address_number: shop.address_number ?? "", address_complement: shop.address_complement ?? "",
    address_district: shop.address_district ?? "", address_city: shop.address_city ?? "", address_state: shop.address_state ?? "", address_zip: shop.address_zip ?? "",
    instagram: social.instagram ?? "", facebook: social.facebook ?? "", tiktok: social.tiktok ?? "", youtube: social.youtube ?? "",
  });
  const { pending, errors, save } = useSave();
  const bind = (k: keyof typeof f) => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value }) });

  return (
    <div className="grid gap-4">
      <Section title="Identificação">
        <Field id="sp-name" label="Nome da barbearia" error={errors.name}><Input {...bind("name")} className="h-12" /></Field>
        <Field id="sp-desc" label="Descrição" hint="Aparece na sua página de agendamento"><Textarea {...bind("description")} /></Field>
      </Section>
      <Section title="Contato">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="sp-phone" label="Telefone" error={errors.phone}><Input inputMode="tel" {...bind("phone")} className="h-12" /></Field>
          <Field id="sp-wa" label="WhatsApp" error={errors.whatsapp}><Input inputMode="tel" {...bind("whatsapp")} className="h-12" /></Field>
        </div>
        <Field id="sp-email" label="E-mail" error={errors.email}><Input type="email" {...bind("email")} className="h-12" /></Field>
      </Section>
      <Section title="Endereço">
        <div className="grid grid-cols-[1fr_96px] gap-3">
          <Field id="sp-street" label="Rua"><Input {...bind("address_street")} className="h-12" autoComplete="address-line1" /></Field>
          <Field id="sp-num" label="Número"><Input {...bind("address_number")} className="h-12" /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="sp-comp" label="Complemento"><Input {...bind("address_complement")} className="h-12" /></Field>
          <Field id="sp-dist" label="Bairro"><Input {...bind("address_district")} className="h-12" /></Field>
        </div>
        <div className="grid grid-cols-[1fr_72px] gap-3 sm:grid-cols-[1fr_80px_140px]">
          <Field id="sp-city" label="Cidade"><Input {...bind("address_city")} className="h-12" /></Field>
          <Field id="sp-uf" label="UF" error={errors.address_state}><Input {...bind("address_state")} maxLength={2} className="h-12 uppercase" /></Field>
          <Field id="sp-zip" label="CEP" className="col-span-2 sm:col-span-1"><Input inputMode="numeric" {...bind("address_zip")} className="h-12" /></Field>
        </div>
      </Section>
      <Section title="Redes sociais">
        {(["instagram", "facebook", "tiktok", "youtube"] as const).map((k) => (
          <Field key={k} id={`sp-${k}`} label={k[0].toUpperCase() + k.slice(1)} error={errors[k]}>
            <Input {...bind(k)} placeholder={`https://${k}.com/sua-barbearia`} inputMode="url" className="h-12" />
          </Field>
        ))}
      </Section>
      <SaveBar pending={pending} onClick={() => save(() => saveShopProfileAction(f))} />
    </div>
  );
}

const COLORS = ["#2467F2", "#75B5FF", "#083DA9", "#0EA5E9", "#10B981", "#F59E0B", "#E11D48", "#D4AF37", "#F5F8FF"];

export function BrandingForm({ shop }: { shop: Barbershop }) {
  const b = (shop.branding ?? {}) as { primary?: string; gallery?: string[]; show_professionals?: boolean; welcome?: string };
  const [logo, setLogo] = React.useState<string | null>(shop.logo_url);
  const [cover, setCover] = React.useState<string | null>(shop.cover_url);
  const [primary, setPrimary] = React.useState(b.primary ?? "#2467F2");
  const [gallery, setGallery] = React.useState<string[]>(b.gallery ?? []);
  const [showPros, setShowPros] = React.useState(b.show_professionals ?? true);
  const [welcome, setWelcome] = React.useState(b.welcome ?? "");
  const { pending, save } = useSave();

  return (
    <div className="grid gap-4">
      <Alert tone="info">Estas opções mudam apenas a sua página pública de agendamento. O painel mantém a identidade do Agendas Pro.</Alert>
      <Section title="Logo e capa">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
          <ImageUpload shopId={shop.id} folder="branding" value={logo} onChange={setLogo} label="Logo" />
          <ImageUpload shopId={shop.id} folder="branding" value={cover} onChange={setCover} label="Capa" aspect="wide" />
        </div>
      </Section>
      <Section title="Cor de destaque">
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Cor de destaque">
          {COLORS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={primary.toLowerCase() === c.toLowerCase()} aria-label={c} onClick={() => setPrimary(c)}
              className={cn("grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-surface-1", primary.toLowerCase() === c.toLowerCase() && "ring-2 ring-halo")}
              style={{ background: c }}>
              {primary.toLowerCase() === c.toLowerCase() && <Check className="size-5 text-ink mix-blend-difference" />}
            </button>
          ))}
          <label className="relative grid size-11 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-white/25 text-muted-foreground">
            <Plus className="size-5" />
            <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Escolher outra cor" />
          </label>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
          <span className="h-11 flex-1 rounded-xl text-center text-sm font-medium leading-[44px] text-white" style={{ background: primary }}>Agendar horário</span>
          <span className="text-[12px] text-subtle-foreground">prévia do botão</span>
        </div>
      </Section>
      <Section title="Apresentação">
        <Field id="br-welcome" label="Mensagem de boas-vindas" hint="Até 160 caracteres. Ex.: Corte na régua, café por conta da casa."><Input value={welcome} onChange={(e) => setWelcome(e.target.value)} maxLength={160} className="h-12" /></Field>
        <Switch label="Mostrar profissionais" description="Exibe fotos e apresentação da equipe na página" checked={showPros} onCheckedChange={setShowPros} />
      </Section>
      <Section title="Galeria de fotos">
        <div className="flex flex-wrap gap-3">
          {gallery.map((g, i) => (
            <ImageUpload key={g} shopId={shop.id} folder="gallery" value={g} label={`Foto ${i + 1}`} onChange={(v) => setGallery(v ? gallery.map((x, j) => (j === i ? v : x)) : gallery.filter((_, j) => j !== i))} />
          ))}
          {gallery.length < 8 && (
            <ImageUpload key={`new-${gallery.length}`} shopId={shop.id} folder="gallery" value={null} label="Adicionar" onChange={(v) => v && setGallery([...gallery, v])} />
          )}
        </div>
      </Section>
      <SaveBar pending={pending} onClick={() => save(() => saveBrandingAction({ logo_url: logo, cover_url: cover, primary, gallery, show_professionals: showPros, welcome }))} />
    </div>
  );
}

export function PreferencesForm({ shop }: { shop: Barbershop }) {
  const n = (shop.notification_prefs ?? {}) as { new_booking_email?: boolean; reminder_whatsapp?: boolean; reminder_hours?: number };
  const [f, setF] = React.useState({
    min_advance_minutes: String(shop.min_advance_minutes),
    max_advance_days: String(shop.max_advance_days),
    buffer_minutes: String(shop.buffer_minutes),
    slot_interval_minutes: String(shop.slot_interval_minutes),
    cancellation_min_hours: String(shop.cancellation_min_hours),
    cancellation_policy: shop.cancellation_policy ?? "",
    auto_confirm: shop.auto_confirm,
    new_booking_email: n.new_booking_email ?? true,
    reminder_whatsapp: n.reminder_whatsapp ?? false,
    reminder_hours: String(n.reminder_hours ?? 24),
  });
  const { pending, errors, save } = useSave();
  const sel = (k: keyof typeof f, options: [string, string][], label: string, hint?: string) => (
    <Field id={`pf-${k}`} label={label} hint={hint} error={errors[k]}>
      <Select value={String(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
    </Field>
  );

  return (
    <div className="grid gap-4">
      <Section title="Agendamento online">
        {sel("min_advance_minutes", [["0", "Sem antecedência"], ["30", "30 minutos"], ["60", "1 hora"], ["120", "2 horas"], ["240", "4 horas"], ["720", "12 horas"], ["1440", "1 dia"]], "Antecedência mínima", "Quanto tempo antes o cliente pode agendar")}
        {sel("max_advance_days", [["7", "7 dias"], ["15", "15 dias"], ["30", "30 dias"], ["60", "60 dias"], ["90", "90 dias"], ["180", "6 meses"]], "Agendar com até", "Limite de dias no futuro")}
        {sel("buffer_minutes", [["0", "Sem intervalo"], ["5", "5 min"], ["10", "10 min"], ["15", "15 min"], ["20", "20 min"], ["30", "30 min"]], "Tempo entre atendimentos", "Pausa automática após cada atendimento")}
        {sel("slot_interval_minutes", [["10", "10 em 10 min"], ["15", "15 em 15 min"], ["20", "20 em 20 min"], ["30", "30 em 30 min"], ["60", "De hora em hora"]], "Horários oferecidos")}
        <Switch label="Confirmar automaticamente" description="Agendamentos já entram como confirmados" checked={f.auto_confirm} onCheckedChange={(v) => setF({ ...f, auto_confirm: v })} />
      </Section>
      <Section title="Cancelamento">
        {sel("cancellation_min_hours", [["0", "A qualquer momento"], ["1", "Até 1 hora antes"], ["2", "Até 2 horas antes"], ["6", "Até 6 horas antes"], ["12", "Até 12 horas antes"], ["24", "Até 24 horas antes"]], "Cliente pode cancelar")}
        <Field id="pf-policy" label="Regras de cancelamento" hint="Aparece para o cliente ao agendar"><Textarea value={f.cancellation_policy} onChange={(e) => setF({ ...f, cancellation_policy: e.target.value })} /></Field>
      </Section>
      <Section title="Notificações">
        <Switch label="E-mail a cada novo agendamento" checked={f.new_booking_email} onCheckedChange={(v) => setF({ ...f, new_booking_email: v })} />
        <Switch label="Lembrete por WhatsApp para o cliente" description="Requer integração de WhatsApp ativa e plano compatível" checked={f.reminder_whatsapp} onCheckedChange={(v) => setF({ ...f, reminder_whatsapp: v })} />
        {f.reminder_whatsapp && sel("reminder_hours", [["2", "2 horas antes"], ["12", "12 horas antes"], ["24", "24 horas antes"], ["48", "48 horas antes"]], "Enviar lembrete")}
      </Section>
      <SaveBar pending={pending} onClick={() => save(() => savePreferencesAction(f))} />
    </div>
  );
}

export function ShopHoursForm({ week, configured }: { week: DayRanges[]; configured: boolean }) {
  const [value, setValue] = React.useState(week);
  const { pending, save } = useSave();
  return (
    <div className="grid gap-3">
      <h2 className="text-base font-semibold text-halo">Horário de funcionamento</h2>
      {!configured && <Alert tone="warning">Defina o horário de funcionamento para que os horários livres apareçam na agenda.</Alert>}
      <p className="text-sm text-muted-foreground">Use mais de uma faixa por dia para criar intervalos (ex.: almoço).</p>
      <WeekHoursEditor value={value} onChange={setValue} />
      <SaveBar pending={pending} onClick={() => save(() => saveWeekAction(null, value))} label="Salvar horários" />
    </div>
  );
}
