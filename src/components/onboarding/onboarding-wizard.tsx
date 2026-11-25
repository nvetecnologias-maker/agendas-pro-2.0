"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Copy, PartyPopper, Plus, Scissors, Trash2, UserPlus } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/form-controls";
import { WeekHoursEditor } from "@/components/panel/week-hours-editor";
import { ImageUpload } from "@/components/panel/image-upload";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { formatDuration } from "@/lib/appointments/status";
import type { DayRanges } from "@/lib/schedule";
import type { Barbershop } from "@/types/database";
import { saveShopProfileAction, saveBrandingAction } from "@/app/painel/(app)/configuracoes/actions";
import { saveWeekAction } from "@/app/painel/(app)/configuracoes/schedule-actions";
import { saveServiceAction, deleteServiceAction } from "@/app/painel/(app)/servicos/actions";
import { saveProfessionalAction } from "@/app/painel/(app)/profissionais/actions";
import { addSelfAsProfessionalAction, completeOnboardingAction, setOnboardingStepAction } from "@/app/onboarding/actions";

const STEPS = ["Sua barbearia", "Contato e endereço", "Horários", "Serviços", "Profissionais", "Aparência", "Publicar"];

type Svc = { id: string; name: string; price_cents: number; duration_minutes: number; is_active: boolean };
type Pro = { id: string; name: string; user_id: string | null; is_active: boolean; serviceIds: string[] };

const PRESETS = [
  { name: "Corte masculino", duration: 30, price: "45,00" },
  { name: "Barba", duration: 30, price: "35,00" },
  { name: "Corte + barba", duration: 60, price: "70,00" },
  { name: "Sobrancelha", duration: 15, price: "20,00" },
  { name: "Pigmentação", duration: 45, price: "50,00" },
  { name: "Degradê", duration: 40, price: "50,00" },
];
const COLORS = ["#2467F2", "#75B5FF", "#083DA9", "#10B981", "#F59E0B", "#E11D48", "#D4AF37"];

export function OnboardingWizard({
  shop, userId, ownerName, week, hoursConfigured, services, professionals, publicUrl,
}: {
  shop: Barbershop; userId: string; ownerName: string; week: DayRanges[]; hoursConfigured: boolean;
  services: Svc[]; professionals: Pro[]; publicUrl: string;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(Math.min(Math.max(shop.onboarding_step, 1), 7));
  const [pending, start] = React.useTransition();
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // passos 1 e 2
  const social = (shop.social_links ?? {}) as Record<string, string>;
  const [profile, setProfile] = React.useState({
    name: shop.name, description: shop.description ?? "", phone: shop.phone ?? "", whatsapp: shop.whatsapp ?? "", email: shop.email ?? "",
    address_street: shop.address_street ?? "", address_number: shop.address_number ?? "", address_complement: shop.address_complement ?? "",
    address_district: shop.address_district ?? "", address_city: shop.address_city ?? "", address_state: shop.address_state ?? "", address_zip: shop.address_zip ?? "",
    instagram: social.instagram ?? "", facebook: social.facebook ?? "", tiktok: social.tiktok ?? "", youtube: social.youtube ?? "",
  });
  const bind = (k: keyof typeof profile) => ({ value: profile[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setProfile({ ...profile, [k]: e.target.value }) });
  // passo 3
  const [hours, setHours] = React.useState(week);
  // passo 4
  const [newSvc, setNewSvc] = React.useState({ name: "", price: "", duration: "30" });
  // passo 5
  const [newPro, setNewPro] = React.useState("");
  // passo 6
  const branding = (shop.branding ?? {}) as { primary?: string };
  const [logo, setLogo] = React.useState<string | null>(shop.logo_url);
  const [cover, setCover] = React.useState<string | null>(shop.cover_url);
  const [primary, setPrimary] = React.useState(branding.primary ?? "#2467F2");

  const go = (n: number) => {
    setStep(n);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
    setOnboardingStepAction(n);
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string>; message?: string }>, next?: number) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        router.refresh();
        if (next) go(next);
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
      }
    });

  const activePros = professionals.filter((p) => p.is_active);
  const iAmPro = professionals.some((p) => p.user_id === userId);

  const next = () => {
    switch (step) {
      case 1:
      case 2:
        return run(() => saveShopProfileAction(profile), step + 1);
      case 3:
        return run(() => saveWeekAction(null, hours), 4);
      case 4:
        if (!services.length) return toast.error("Adicione pelo menos um serviço.");
        return go(5);
      case 5:
        if (!activePros.length) return toast.error("Adicione pelo menos um profissional.");
        return go(6);
      case 6:
        return run(() => saveBrandingAction({ logo_url: logo, cover_url: cover, primary, gallery: [], show_professionals: true, welcome: "" }), 7);
    }
  };

  const addService = (s: { name: string; price: string; duration: number }) =>
    run(async () => saveServiceAction({ name: s.name, price: s.price, duration: s.duration, isActive: true, professionalIds: activePros.map((p) => p.id), imageUrl: null }));

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6 px-4 pb-40 pt-6">
      <header className="flex items-center justify-between">
        <Logo />
        <span className="text-[13px] text-muted-foreground">Etapa {step} de 7</span>
      </header>

      <div className="grid gap-2">
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full", i + 1 <= step ? "bg-gradient-to-r from-sky to-electric" : "bg-white/10")} />
          ))}
        </div>
        <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-halo sm:text-[28px]">{STEPS[step - 1]}</h1>
        <p className="text-muted-foreground">
          {[
            `Vamos deixar a ${shop.name} pronta para receber agendamentos online. Leva poucos minutos.`,
            "Esses dados aparecem na sua página para o cliente encontrar e falar com você.",
            "Defina quando a barbearia abre. Use duas faixas no mesmo dia para criar o intervalo de almoço.",
            "Escolha um modelo e ajuste depois, ou crie do seu jeito.",
            "Quem atende na barbearia? Cada profissional tem sua própria agenda.",
            "Dê a cara da sua barbearia à página de agendamento.",
            "Tudo pronto! Publique e compartilhe seu link com os clientes.",
          ][step - 1]}
        </p>
      </div>

      {step === 1 && (
        <div className="grid gap-4">
          <Field id="ob-name" label="Nome da barbearia" error={errors.name}><Input {...bind("name")} className="h-12" /></Field>
          <Field id="ob-desc" label="Descrição curta" hint="Ex.: Barbearia clássica no centro, com café e cerveja gelada."><Textarea {...bind("description")} /></Field>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field id="ob-wa" label="WhatsApp" error={errors.whatsapp}><Input inputMode="tel" {...bind("whatsapp")} className="h-12" placeholder="(11) 99999-9999" /></Field>
            <Field id="ob-phone" label="Telefone" error={errors.phone}><Input inputMode="tel" {...bind("phone")} className="h-12" /></Field>
          </div>
          <Field id="ob-insta" label="Instagram" error={errors.instagram}><Input inputMode="url" {...bind("instagram")} placeholder="https://instagram.com/suabarbearia" className="h-12" /></Field>
          <div className="grid grid-cols-[1fr_96px] gap-3">
            <Field id="ob-street" label="Rua"><Input {...bind("address_street")} className="h-12" /></Field>
            <Field id="ob-num" label="Número"><Input {...bind("address_number")} className="h-12" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="ob-dist" label="Bairro"><Input {...bind("address_district")} className="h-12" /></Field>
            <Field id="ob-zip" label="CEP"><Input inputMode="numeric" {...bind("address_zip")} className="h-12" /></Field>
          </div>
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <Field id="ob-city" label="Cidade"><Input {...bind("address_city")} className="h-12" /></Field>
            <Field id="ob-uf" label="UF" error={errors.address_state}><Input maxLength={2} {...bind("address_state")} className="h-12 uppercase" /></Field>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-3">
          {!hoursConfigured && <p className="rounded-xl bg-electric/10 p-3 text-[13px] text-sky">Sugerimos um horário comum. Ajuste à vontade.</p>}
          <WeekHoursEditor value={hours} onChange={setHours} />
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-4">
          {services.length > 0 && (
            <ul className="grid gap-2">
              {services.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-electric/15 text-sky"><Scissors className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-halo">{s.name}</p>
                    <p className="text-[13px] text-muted-foreground">{formatDuration(s.duration_minutes)} · {formatMoney(s.price_cents)}</p>
                  </div>
                  <button type="button" onClick={() => run(() => deleteServiceAction(s.id))} className="grid size-10 place-items-center rounded-xl bg-white/5 text-muted-foreground" aria-label={`Remover ${s.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2">
            <p className="text-sm font-medium text-halo">Adicionar com um toque</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.filter((p) => !services.some((s) => s.name === p.name)).map((p) => (
                <button key={p.name} type="button" disabled={pending} onClick={() => addService(p)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-4 text-[13px] text-halo active:scale-95">
                  <Plus className="size-4 text-sky" /> {p.name} <span className="text-muted-foreground">R$ {p.price}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border border-white/[0.07] p-3">
            <p className="text-sm font-medium text-halo">Ou crie o seu</p>
            <Input value={newSvc.name} onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })} placeholder="Nome do serviço" className="h-12" aria-label="Nome do serviço" />
            <div className="grid grid-cols-2 gap-3">
              <Input value={newSvc.price} inputMode="decimal" onChange={(e) => setNewSvc({ ...newSvc, price: e.target.value })} placeholder="Preço (R$)" className="h-12 font-mono" aria-label="Preço" />
              <Input value={newSvc.duration} type="number" inputMode="numeric" onChange={(e) => setNewSvc({ ...newSvc, duration: e.target.value })} placeholder="Minutos" className="h-12 font-mono" aria-label="Duração em minutos" />
            </div>
            <Button variant="subtle" disabled={!newSvc.name || !newSvc.price || pending} onClick={() => { addService({ name: newSvc.name, price: newSvc.price, duration: Number(newSvc.duration) || 30 }); setNewSvc({ name: "", price: "", duration: "30" }); }}>
              <Plus /> Adicionar serviço
            </Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="grid gap-4">
          {!iAmPro && (
            <button type="button" disabled={pending} onClick={() => run(addSelfAsProfessionalAction)}
              className="flex items-center gap-3 rounded-2xl border border-sky/30 bg-electric/15 p-4 text-left active:scale-[0.99]">
              <span className="grid size-11 place-items-center rounded-xl bg-electric text-white"><UserPlus className="size-5" /></span>
              <span>
                <span className="block font-medium text-halo">Eu também atendo</span>
                <span className="text-[13px] text-muted-foreground">Adicionar {ownerName.split(" ")[0] || "você"} como profissional, com todos os serviços</span>
              </span>
            </button>
          )}
          {professionals.length > 0 && (
            <ul className="grid gap-2">
              {professionals.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-3">
                  <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-lapis to-midnight text-sm font-semibold text-halo">{p.name.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-halo">{p.name}{p.user_id === userId ? " (você)" : ""}</p>
                    <p className="text-[13px] text-muted-foreground">{p.serviceIds.length} serviço(s){p.is_active ? "" : " · inativo"}</p>
                  </div>
                  <Check className="size-5 text-success" />
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input value={newPro} onChange={(e) => setNewPro(e.target.value)} placeholder="Nome de outro profissional" className="h-12 flex-1" aria-label="Nome do profissional" />
            <Button className="h-12" disabled={newPro.trim().length < 2 || pending} onClick={() => {
              const name = newPro.trim();
              setNewPro("");
              run(() => saveProfessionalAction({ name, specialties: [], isActive: true, serviceIds: services.map((s) => s.id), photoUrl: null }));
            }}><Plus /> Adicionar</Button>
          </div>
          <p className="text-[12px] text-subtle-foreground">Depois você pode definir foto, horários próprios e serviços de cada um em Profissionais.</p>
        </div>
      )}

      {step === 6 && (
        <div className="grid gap-5">
          <div className="grid grid-cols-[auto_1fr] gap-4">
            <ImageUpload shopId={shop.id} folder="branding" value={logo} onChange={setLogo} label="Logo" />
            <ImageUpload shopId={shop.id} folder="branding" value={cover} onChange={setCover} label="Capa" aspect="wide" />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium text-halo">Cor de destaque</p>
            <div className="flex flex-wrap gap-2.5">
              {COLORS.map((c) => (
                <button key={c} type="button" aria-label={c} aria-pressed={primary === c} onClick={() => setPrimary(c)}
                  className={cn("grid size-12 place-items-center rounded-full ring-offset-2 ring-offset-navy", primary === c && "ring-2 ring-halo")} style={{ background: c }}>
                  {primary === c && <Check className="size-5 text-white mix-blend-difference" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="grid gap-4">
          <div className="grid justify-items-center gap-3 rounded-[28px] border border-sky/25 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(36,103,242,0.45),rgba(2,0,111,0.55)_50%,rgba(3,11,32,0.9))] p-6 text-center">
            <PartyPopper className="size-10 text-sky" />
            <p className="text-[13px] text-halo/70">Seu link de agendamento</p>
            <p className="break-all font-mono text-lg font-semibold text-white">{publicUrl.replace(/^https?:\/\//, "")}</p>
            <Button variant="glass" onClick={async () => { await navigator.clipboard.writeText(publicUrl).catch(() => {}); toast.success("Link copiado!"); }}>
              <Copy /> Copiar link
            </Button>
          </div>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><Check className="size-4 text-success" /> {services.length} serviço(s) cadastrado(s)</li>
            <li className="flex gap-2"><Check className="size-4 text-success" /> {activePros.length} profissional(is) ativo(s)</li>
            <li className="flex gap-2"><Check className="size-4 text-success" /> Horário de funcionamento definido</li>
          </ul>
        </div>
      )}

      {/* Navegação fixa no rodapé (alcance do polegar) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-navy/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl gap-2">
          {step > 1 && (
            <Button variant="subtle" size="lg" className="h-13" onClick={() => go(step - 1)} aria-label="Voltar"><ArrowLeft /></Button>
          )}
          {step < 7 ? (
            <Button size="lg" className="h-13 flex-1 text-base" loading={pending} onClick={next}>Continuar <ArrowRight /></Button>
          ) : (
            <>
              <Button variant="subtle" size="lg" className="h-13" loading={pending} onClick={() => run(async () => {
                const r = await completeOnboardingAction(false);
                if (r.ok) router.push("/painel");
                return r;
              })}>Depois</Button>
              <Button size="lg" className="h-13 flex-1 text-base" loading={pending} onClick={() => run(async () => {
                const r = await completeOnboardingAction(true);
                if (r.ok) { toast.success("Agenda publicada!"); router.push("/painel/minha-agenda"); }
                return r;
              })}>Publicar minha agenda</Button>
            </>
          )}
        </div>
        {step >= 4 && step < 7 && (
          <button type="button" onClick={() => go(step + 1)} className="mx-auto mt-2 block text-[12px] text-subtle-foreground">Pular por enquanto</button>
        )}
      </div>
    </div>
  );
}
