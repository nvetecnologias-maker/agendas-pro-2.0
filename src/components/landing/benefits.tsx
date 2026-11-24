import { Award, CalendarX2, Clock3, LayoutList, LineChart } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { SectionHeading } from "./section-heading";

const BENEFITS = [
  { icon: CalendarX2, title: "Fim dos conflitos de horário", text: "O sistema só oferece horários livres e impede dois clientes no mesmo horário, mesmo que marquem ao mesmo tempo." },
  { icon: LayoutList, title: "Agenda organizada", text: "Dia, semana, mês ou lista. Filtre por profissional, serviço e status em segundos." },
  { icon: Clock3, title: "Menos tempo no celular", text: "O cliente agenda sozinho. Você para de responder \"tem horário hoje?\" o dia inteiro." },
  { icon: Award, title: "Atendimento profissional", text: "Página com a sua marca, confirmação imediata e opção de adicionar ao calendário." },
  { icon: LineChart, title: "Controle financeiro de verdade", text: "Veja o que foi previsto e o que realmente entrou, por dia, profissional e forma de pagamento." },
];

export function Benefits() {
  return (
    <section aria-labelledby="beneficios-title" className="mx-auto grid max-w-7xl gap-14 px-4 py-28 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <div className="lg:sticky lg:top-32">
        <SectionHeading
          id="beneficios-title"
          eyebrow="Benefícios"
          align="left"
          title="Mais tempo para cortar. Menos tempo administrando."
          subtitle="O Agendas Pro cuida da parte chata para você focar no que faz a sua barbearia crescer: o atendimento."
        />
      </div>
      <ul className="grid gap-3">
        {BENEFITS.map((b, i) => (
          <Reveal key={b.title} delay={i * 0.05}>
            <li className="group flex list-none gap-5 rounded-3xl border border-border bg-surface-1/70 p-6 transition-colors duration-300 hover:border-sky/30 hover:bg-surface-1">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-electric/15 text-sky transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-6deg]">
                <b.icon className="size-5.5" aria-hidden />
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{b.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{b.text}</p>
              </div>
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
