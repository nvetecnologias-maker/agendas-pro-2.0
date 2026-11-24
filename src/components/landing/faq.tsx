import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/animations/reveal";
import { SectionHeading } from "./section-heading";

export function Faq({ trialDays, supportEmail }: { trialDays: number; supportEmail: string | null }) {
  const items = [
    {
      q: "Como criar uma conta?",
      a: `Clique em "Começar agora", informe seu nome, e-mail, telefone, o nome da barbearia e uma senha. Confirmamos seu e-mail e você já entra no período de teste de ${trialDays} dias, sem cartão de crédito.`,
    },
    {
      q: "Como funciona o agendamento?",
      a: "Seu cliente abre o link da barbearia, escolhe o serviço, o profissional, o dia e um dos horários disponíveis, informa nome e telefone e confirma. O agendamento aparece na hora no seu painel. Horários ocupados, intervalos, folgas e bloqueios nunca aparecem como opção.",
    },
    {
      q: "Como compartilhar a minha agenda?",
      a: "Em \"Minha agenda\" você encontra seu link exclusivo (ex.: agendaspro.com.br/barbearia-do-joao), um botão para copiar, outro para enviar pelo WhatsApp e um QR Code para imprimir e deixar no balcão.",
    },
    {
      q: "Como funcionam os planos?",
      a: "Cada plano define quantos profissionais e quais recursos você pode usar. Você começa com o período de teste e escolhe o plano quando quiser. Dá para mudar de plano a qualquer momento em \"Minha assinatura\".",
    },
    {
      q: "Como cancelar a assinatura?",
      a: "Em \"Minha assinatura\", clique em cancelar. O acesso continua até o fim do período já pago. Seus dados não são apagados por vencimento: se voltar, encontra tudo como deixou.",
    },
    {
      q: "Como adicionar profissionais?",
      a: "No menu \"Profissionais\", cadastre nome, foto, contatos, serviços que cada um realiza e os horários de trabalho. Cada profissional ganha agenda individual, histórico e relatório de receita.",
    },
  ];

  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-28 sm:px-6">
      <SectionHeading id="faq-title" eyebrow="Perguntas frequentes" title="Ficou com alguma dúvida?" />
      <Reveal className="mt-12">
        <Accordion type="single" collapsible className="border-t border-border">
          {items.map((it, i) => (
            <AccordionItem key={it.q} value={`item-${i}`}>
              <AccordionTrigger>{it.q}</AccordionTrigger>
              <AccordionContent>{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {supportEmail && (
          <p className="mt-8 text-center text-muted-foreground">
            Não encontrou o que procurava?{" "}
            <a href={`mailto:${supportEmail}`} className="text-sky hover:underline">Fale com o suporte</a>
          </p>
        )}
      </Reveal>
    </section>
  );
}
