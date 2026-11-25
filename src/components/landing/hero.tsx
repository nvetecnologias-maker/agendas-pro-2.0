"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, CalendarCheck2, CheckCircle2, Scissors, ShieldCheck, Wallet } from "lucide-react";
import { RibbonField } from "@/components/animations/ribbon-field";
import { TiltCard } from "@/components/animations/tilt-card";
import { ParallaxLayers } from "@/components/animations/parallax-layers";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "./dashboard-mockup";

const ease = [0.22, 1, 0.36, 1] as const;
const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease },
});

const BENEFITS = [
  { icon: CalendarCheck2, text: "Seus clientes agendam sozinhos pelo seu link, 24 horas por dia" },
  { icon: ShieldCheck, text: "O sistema só mostra horários livres e impede marcações duplicadas" },
  { icon: Wallet, text: "Financeiro por dia, profissional e forma de pagamento" },
];

export function Hero({ trialDays }: { trialDays: number }) {
  return (
    <section id="inicio" aria-labelledby="hero-title" className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
      <RibbonField className="absolute inset-0 -z-10" />
      <div aria-hidden className="absolute inset-x-0 -bottom-1 -z-10 h-80 bg-gradient-to-b from-transparent via-navy/70 to-navy" />

      <ParallaxLayers className="mx-auto grid w-full max-w-7xl gap-12 px-4 pb-24 pt-28 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:pb-24 lg:pt-40">
        <div data-parallax-speed="-8">
          <motion.p
            {...fade()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[13px] font-medium text-halo/90 backdrop-blur"
          >
            <Scissors className="size-3.5 text-sky" aria-hidden /> Sistema de agendamento para barbearias
          </motion.p>

          <motion.h1
            id="hero-title"
            {...fade(0.05)}
            className="mt-5 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-halo sm:text-5xl lg:text-[58px]"
          >
            Agenda online e gestão da sua barbearia <span className="text-gradient">em um só lugar.</span>
          </motion.h1>

          <motion.p {...fade(0.1)} className="mt-5 max-w-xl text-[17px] leading-relaxed text-halo/80 sm:text-lg">
            O Agendas Pro é feito para donos de barbearia e barbeiros que perdem tempo marcando horário pelo WhatsApp.
            Seus clientes escolhem serviço, profissional e horário pelo celular, e você acompanha agenda, equipe,
            clientes e faturamento no mesmo painel.
          </motion.p>

          <motion.ul {...fade(0.15)} className="mt-6 grid gap-2.5 text-[15px] text-halo/85">
            {BENEFITS.map((b) => (
              <li key={b.text} className="flex items-start gap-2.5">
                <b.icon className="mt-0.5 size-4.5 shrink-0 text-sky" aria-hidden /> {b.text}
              </li>
            ))}
          </motion.ul>

          <motion.div {...fade(0.2)} className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/cadastro">
                Criar conta grátis <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="glass" asChild>
              <a href="#como-funciona">Ver como começar</a>
            </Button>
          </motion.div>

          <motion.p {...fade(0.25)} className="mt-5 flex items-start gap-2 text-sm text-halo/65">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-sky" aria-hidden />
            <span>
              Crie a conta, cadastre serviços e horários e compartilhe seu link. {trialDays} dias grátis, sem cartão de
              crédito.
            </span>
          </motion.p>
        </div>

        {/* Mockup do painel (dados de exemplo identificados na própria tela) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease }}
          className="relative [perspective:1400px]"
        >
          <div data-parallax-speed="6">
            <TiltCard max={4}>
              <DashboardMockup />
            </TiltCard>
          </div>
        </motion.div>
      </ParallaxLayers>
    </section>
  );
}
