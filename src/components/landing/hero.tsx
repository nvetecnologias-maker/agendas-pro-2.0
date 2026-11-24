"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, CalendarCheck2, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import { RibbonField } from "@/components/animations/ribbon-field";
import { WordReveal } from "@/components/animations/word-reveal";
import { TiltCard } from "@/components/animations/tilt-card";
import { ParallaxLayers } from "@/components/animations/parallax-layers";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "./dashboard-mockup";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero({ trialDays }: { trialDays: number }) {
  return (
    <section id="inicio" aria-labelledby="hero-title" className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
      <RibbonField className="absolute inset-0 -z-10" />
      {/* iluminação volumétrica + transição para o fundo */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_70%_30%,rgba(117,181,255,0.18),transparent_70%)]" />
      <div aria-hidden className="absolute inset-x-0 -bottom-1 -z-10 h-80 bg-gradient-to-b from-transparent via-navy/70 to-navy" />

      <ParallaxLayers className="mx-auto grid w-full max-w-7xl gap-14 px-4 pb-32 pt-32 sm:px-6 lg:pb-24 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:pt-44">
        <div data-parallax-speed="-12">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] text-halo/90"
          >
            <Sparkles className="size-3.5 text-sky" aria-hidden /> Gestão premium para barbearias
          </motion.span>

          <WordReveal
            delay={0.15}
            className="mt-6 text-[40px] font-semibold leading-[1.02] tracking-[-0.035em] text-halo sm:text-6xl lg:text-[68px]"
            parts={[{ text: "Sua barbearia merece uma" }, { text: "gestão à altura.", accent: true }]}
          />

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-halo/75"
          >
            Organize seus horários, gerencie seus profissionais e acompanhe seus resultados em uma única plataforma.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.85, ease }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Button size="lg" asChild>
              <Link href="/cadastro">
                Começar agora <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="glass" asChild>
              <a href="#funcionalidades">Conhecer funcionalidades</a>
            </Button>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.05 }}
            className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-halo/65"
          >
            <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-sky" aria-hidden /> {trialDays} dias grátis</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-sky" aria-hidden /> Sem cartão de crédito</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-sky" aria-hidden /> Cancele quando quiser</li>
          </motion.ul>
        </div>

        {/* Mockup 3D com cards flutuantes em camadas de parallax */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 18 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.4, delay: 0.3, ease }}
          className="relative [perspective:1400px]"
        >
          <div data-parallax-speed="8">
            <TiltCard max={6}>
              <DashboardMockup />
            </TiltCard>
          </div>

          <div data-parallax-speed="-30" className="absolute -left-6 top-[58%] hidden sm:block">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0b1d52]/90 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-success/15 text-success">
                <CalendarCheck2 className="size-4.5" aria-hidden />
              </span>
              <div>
                <p className="text-[13px] font-medium text-halo">Novo agendamento</p>
                <p className="text-[11px] text-muted-foreground">Corte + barba · hoje, 16:30</p>
              </div>
            </motion.div>
          </div>

          <div data-parallax-speed="-45" className="absolute -right-4 -top-8 hidden sm:block">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="rounded-2xl border border-white/15 bg-[#0b1d52]/90 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
            >
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <TrendingUp className="size-3.5 text-sky" aria-hidden /> Receita da semana
              </p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-halo">R$ 3.840</p>
              <p className="text-[10px] text-subtle-foreground">valor ilustrativo</p>
            </motion.div>
          </div>
        </motion.div>
      </ParallaxLayers>
    </section>
  );
}
