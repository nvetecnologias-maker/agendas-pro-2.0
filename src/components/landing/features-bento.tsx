import {
  BarChart3,
  CalendarClock,
  Link2,
  Scissors,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { SpotlightCard } from "@/components/animations/spotlight-card";
import { SectionHeading } from "./section-heading";

export function FeaturesBento() {
  return (
    <section id="funcionalidades" aria-labelledby="funcionalidades-title" className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-28 sm:px-6">
      <SectionHeading
        id="funcionalidades-title"
        eyebrow="Funcionalidades"
        title="Tudo o que sua barbearia precisa, num só lugar"
        subtitle="Da agenda ao financeiro, cada módulo conversa com os outros. Menos planilha, menos WhatsApp perdido, mais controle."
      />

      <div className="mt-14 grid auto-rows-[minmax(190px,auto)] gap-4 md:grid-cols-6">
        {/* Agendamento online: destaque */}
        <Reveal className="md:col-span-4 md:row-span-2">
          <SpotlightCard className="h-full p-7 sm:p-9">
            <div className="flex h-full flex-col">
              <FeatureIcon icon={CalendarClock} />
              <h3 className="mt-5 text-2xl font-semibold tracking-tight">Agendamento online 24 horas</h3>
              <p className="mt-2 max-w-md text-muted-foreground">
                Seus clientes escolhem serviço, profissional e horário pelo celular. Só aparecem horários realmente livres,
                e o sistema bloqueia qualquer conflito.
              </p>
              {/* mini grade de horários */}
              <div className="mt-auto grid grid-cols-4 gap-2 pt-8 sm:grid-cols-6" aria-hidden>
                {["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"].map((t, i) => (
                  <span
                    key={t}
                    className={
                      i === 4
                        ? "rounded-xl bg-electric py-2.5 text-center font-mono text-xs text-white shadow-[0_8px_24px_-8px_rgba(36,103,242,0.9)]"
                        : [1, 2, 7, 10].includes(i)
                          ? "rounded-xl border border-border py-2.5 text-center font-mono text-xs text-subtle-foreground line-through"
                          : "rounded-xl border border-sky/20 bg-sky/5 py-2.5 text-center font-mono text-xs text-sky"
                    }
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </SpotlightCard>
        </Reveal>

        <Reveal className="md:col-span-2" delay={0.05}>
          <FeatureCard icon={Users} title="Gestão de profissionais" text="Agenda individual, horários, folgas e receita gerada por cada barbeiro." />
        </Reveal>
        <Reveal className="md:col-span-2" delay={0.1}>
          <FeatureCard icon={Scissors} title="Gestão de serviços" text="Preços, durações, categorias e quem realiza cada serviço." />
        </Reveal>

        <Reveal className="md:col-span-2" delay={0.05}>
          <FeatureCard icon={Wallet} title="Controle financeiro" text="Separe faturamento previsto do que entrou de verdade, por Pix, cartão ou dinheiro." />
        </Reveal>
        <Reveal className="md:col-span-2" delay={0.1}>
          <FeatureCard icon={UserRound} title="Cadastro de clientes" text="Histórico, último atendimento, total gasto e observações de cada cliente." />
        </Reveal>
        <Reveal className="md:col-span-2" delay={0.15}>
          <FeatureCard icon={BarChart3} title="Relatórios" text="Receita por mês, serviços mais vendidos e desempenho da equipe." />
        </Reveal>

        <Reveal className="md:col-span-6" delay={0.05}>
          <SpotlightCard className="border-beam p-7 sm:p-9">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-5">
                <FeatureIcon icon={Link2} />
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">Link exclusivo de agendamento</h3>
                  <p className="mt-1 max-w-xl text-muted-foreground">
                    Compartilhe no Instagram, no WhatsApp ou num QR Code no balcão. Sua página, com sua marca.
                  </p>
                </div>
              </div>
              <div className="glass flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-mono text-sm md:w-auto" aria-hidden>
                <span className="text-subtle-foreground">agendaspro.com.br/</span>
                <span className="text-sky">barbearia-do-joao</span>
              </div>
            </div>
          </SpotlightCard>
        </Reveal>
      </div>
    </section>
  );
}

function FeatureIcon({ icon: Icon }: { icon: typeof Users }) {
  return (
    <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-b from-electric/30 to-lapis/20 text-sky shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_0_1px_rgba(117,181,255,0.18)]">
      <Icon className="size-5.5" aria-hidden />
    </span>
  );
}

function FeatureCard({ icon, title, text }: { icon: typeof Users; title: string; text: string }) {
  return (
    <SpotlightCard className="h-full p-7">
      <FeatureIcon icon={icon} />
      <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
    </SpotlightCard>
  );
}
