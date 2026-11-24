"use client";

import { CalendarDays, CheckCircle2, Clock, MapPin, Wallet } from "lucide-react";
import { ParallaxLayers } from "@/components/animations/parallax-layers";
import { RibbonField, AGENDAS_PRO_RIBBON_SUBTLE } from "@/components/animations/ribbon-field";
import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/utils";

/**
 * Demonstração visual do painel em camadas de profundidade.
 * Inspirado no Parallax Scrolling (Osmo): cada camada rola numa velocidade.
 * Todos os dados são ilustrativos.
 */

const HOURS = ["09h", "10h", "11h", "12h", "13h", "14h", "15h", "16h"];
const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const EVENTS: { d: number; s: number; len: number; label: string; tone: string }[] = [
  { d: 0, s: 0, len: 1, label: "Corte · Rafael", tone: "from-electric/80 to-lapis/80" },
  { d: 0, s: 2, len: 2, label: "Pigmentação · Bruno", tone: "from-sky/70 to-electric/70" },
  { d: 1, s: 1, len: 1, label: "Barba · Diego", tone: "from-electric/80 to-lapis/80" },
  { d: 2, s: 0, len: 2, label: "Corte + barba · Léo", tone: "from-sky/70 to-electric/70" },
  { d: 2, s: 5, len: 1, label: "Corte · Caio", tone: "from-electric/80 to-lapis/80" },
  { d: 3, s: 3, len: 1, label: "Sobrancelha · Gabriel", tone: "from-lapis/90 to-midnight/90" },
  { d: 4, s: 1, len: 2, label: "Corte + barba · Igor", tone: "from-sky/70 to-electric/70" },
  { d: 4, s: 6, len: 1, label: "Degradê · Vitor", tone: "from-electric/80 to-lapis/80" },
  { d: 5, s: 0, len: 1, label: "Corte · Pedro", tone: "from-electric/80 to-lapis/80" },
  { d: 5, s: 2, len: 1, label: "Barba · Lucas", tone: "from-lapis/90 to-midnight/90" },
];

export function Showcase() {
  return (
    <section aria-labelledby="demo-title" className="relative overflow-hidden py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          id="demo-title"
          eyebrow="Demonstração"
          title="Veja o painel do barbeiro em ação"
          subtitle="Agenda semanal, página de agendamento do cliente e financeiro trabalhando juntos. Telas ilustrativas, com dados de exemplo."
        />
      </div>

      <ParallaxLayers className="relative mx-auto mt-16 h-[620px] max-w-7xl px-4 sm:h-[680px] sm:px-6">
        {/* camada 1: luz de fundo (mais lenta) */}
        <div data-parallax-speed="40" className="absolute inset-x-6 top-10 bottom-10 overflow-hidden rounded-[40px] opacity-70">
          <RibbonField params={AGENDAS_PRO_RIBBON_SUBTLE} quality={0.4} className="size-full" />
        </div>

        {/* camada 2: agenda semanal */}
        <div data-parallax-speed="12" className="absolute left-1/2 top-16 w-[min(920px,92%)] -translate-x-1/2">
          <div className="rounded-3xl border border-white/10 bg-[#050f2a]/95 p-4 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)] sm:p-5" role="img" aria-label="Ilustração da agenda semanal">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium text-halo">
                <CalendarDays className="size-4 text-sky" aria-hidden /> Semana de 23 a 28 de novembro
              </p>
              <span className="rounded-full border border-sky/20 bg-sky/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-sky">Exemplo</span>
            </div>
            <div className="grid grid-cols-[26px_repeat(6,minmax(0,1fr))] gap-1 text-[10px] sm:grid-cols-[36px_repeat(6,minmax(0,1fr))] sm:gap-1.5">
              <span />
              {DAYS.map((d) => (
                <span key={d} className="pb-1 text-center text-subtle-foreground">{d}</span>
              ))}
              {HOURS.map((h, s) => (
                <Row key={h} hour={h} slot={s} />
              ))}
            </div>
          </div>
        </div>

        {/* camada 3: página do cliente no celular (mais rápida) */}
        <div data-parallax-speed="-28" className="absolute bottom-0 left-[4%] w-[230px] max-sm:hidden">
          <PhoneBooking />
        </div>

        {/* camada 4: card financeiro (a mais rápida) */}
        <div data-parallax-speed="-50" className="absolute right-[4%] bottom-16 w-[260px] max-sm:right-4 max-sm:w-[220px]">
          <div className="rounded-3xl border border-white/15 bg-[#0b1d52]/95 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_30px_70px_-25px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <p className="flex items-center gap-2 text-[12px] text-muted-foreground"><Wallet className="size-4 text-sky" aria-hidden /> Recebido hoje</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-halo">R$ 1.260</p>
            <div className="mt-4 grid gap-2 text-[12px]">
              {[["Pix", 62], ["Cartão", 28], ["Dinheiro", 10]].map(([k, v]) => (
                <div key={k as string} className="grid gap-1">
                  <div className="flex justify-between text-muted-foreground"><span>{k}</span><span>{v}%</span></div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-sky to-electric" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-subtle-foreground">Valores ilustrativos</p>
          </div>
        </div>
      </ParallaxLayers>
    </section>
  );
}

function Row({ hour, slot }: { hour: string; slot: number }) {
  return (
    <>
      <span className="pt-1 text-right font-mono text-subtle-foreground">{hour}</span>
      {DAYS.map((_, d) => {
        const ev = EVENTS.find((e) => e.d === d && e.s === slot);
        const covered = EVENTS.some((e) => e.d === d && slot > e.s && slot < e.s + e.len);
        if (covered) return null;
        return (
          <div
            key={d}
            className={cn("h-9 rounded-lg border border-white/[0.04] bg-white/[0.02] sm:h-10", ev && "border-0 p-0")}
            style={ev ? { gridRow: `span ${ev.len}`, height: "auto" } : undefined}
          >
            {ev && (
              <div className={cn("h-full overflow-hidden break-words rounded-lg bg-gradient-to-br p-1 text-[8px] leading-tight sm:p-1.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] sm:text-[10px]", ev.tone)}>
                {ev.label}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function PhoneBooking() {
  return (
    <div className="rounded-[38px] border border-white/15 bg-[#030b20] p-2 shadow-[0_40px_100px_-20px_rgba(2,0,111,0.9)]" role="img" aria-label="Ilustração da página de agendamento no celular">
      <div className="overflow-hidden rounded-[30px] bg-gradient-to-b from-lapis/40 to-navy">
        <div className="h-20 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(117,181,255,0.5),transparent)]" />
        <div className="-mt-8 px-4 pb-5">
          <div className="grid size-14 place-items-center rounded-2xl border border-white/20 bg-navy text-lg font-semibold text-halo">BJ</div>
          <p className="mt-2 text-[13px] font-semibold text-halo">Barbearia do João</p>
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><MapPin className="size-3" aria-hidden /> Centro · aberto até 20h</p>
          <p className="mt-4 text-[10px] font-medium text-halo">Escolha o horário · sexta, 27</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {["14:00", "14:30", "15:00", "15:30", "16:30", "17:00"].map((t, i) => (
              <span key={t} className={cn("rounded-lg py-1.5 text-center font-mono text-[10px]", i === 3 ? "bg-electric text-white" : "border border-white/10 text-sky")}>{t}</span>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/5 p-2.5 text-[10px] text-halo">
            <Clock className="size-3.5 text-sky" aria-hidden /> Corte + barba · 50 min
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-electric py-2.5 text-[11px] font-medium text-white">
            <CheckCircle2 className="size-3.5" aria-hidden /> Confirmar agendamento
          </div>
        </div>
      </div>
    </div>
  );
}
