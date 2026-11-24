import { CalendarCheck2, Scissors, Share2, UserPlus } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { SectionHeading } from "./section-heading";

const STEPS = [
  { icon: UserPlus, title: "Crie sua conta", text: "Informe seus dados e os da barbearia. Não pedimos cartão e o período de teste começa na hora." },
  { icon: Scissors, title: "Configure a barbearia", text: "Horários, serviços, preços e profissionais, com um passo a passo guiado." },
  { icon: Share2, title: "Compartilhe seu link", text: "Envie no WhatsApp, coloque na bio do Instagram ou imprima o QR Code." },
  { icon: CalendarCheck2, title: "Receba agendamentos", text: "Os clientes marcam sozinhos e você acompanha tudo pelo painel." },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-title" className="relative scroll-mt-24 py-28">
      <div aria-hidden className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(60%_60%_at_50%_40%,#000,transparent)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          id="como-funciona-title"
          eyebrow="Como funciona"
          title="Do cadastro ao primeiro agendamento em 4 passos"
        />
        <ol className="relative mt-16 grid gap-4 md:grid-cols-4">
          <div aria-hidden className="absolute left-0 right-0 top-[38px] hidden h-px bg-gradient-to-r from-transparent via-sky/40 to-transparent md:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <li className="relative list-none">
                <div className="glass relative mx-auto grid size-[76px] place-items-center rounded-3xl">
                  <s.icon className="size-7 text-sky" aria-hidden />
                  <span className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-electric font-mono text-xs font-semibold text-white shadow-[0_6px_16px_-4px_rgba(36,103,242,0.9)]">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-center text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-[260px] text-center text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
