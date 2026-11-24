import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, KeyRound, Mail, MessageCircle, Phone } from "lucide-react";
import { Bullets, LegalPage, Pending, type LegalSection } from "@/components/landing/legal-page";
import { LEGAL_ROUTES } from "@/lib/legal";
import { getPublicPlatformInfo } from "@/services/public-site";

export const metadata: Metadata = {
  title: "Suporte e contato · Agendas Pro",
  description: "Canais de atendimento do Agendas Pro e respostas para as dúvidas mais comuns.",
  alternates: { canonical: LEGAL_ROUTES.support },
};

export const revalidate = 300;

const card = "flex items-start gap-3 rounded-xl border border-border bg-surface-1/70 p-4";

export default async function SupportPage() {
  const info = await getPublicPlatformInfo();
  const whatsapp = info.contact_whatsapp?.replace(/\D/g, "");

  const sections: LegalSection[] = [
    {
      id: "contato",
      title: "Fale com a gente",
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={card}>
            <Mail className="mt-0.5 size-5 shrink-0 text-sky" aria-hidden />
            <div>
              <p className="font-medium text-halo">E-mail</p>
              {info.support_email ? (
                <a href={`mailto:${info.support_email}`} className="text-sky hover:underline">{info.support_email}</a>
              ) : (
                <Pending>[e-mail de atendimento]</Pending>
              )}
            </div>
          </div>
          <div className={card}>
            <MessageCircle className="mt-0.5 size-5 shrink-0 text-sky" aria-hidden />
            <div>
              <p className="font-medium text-halo">WhatsApp</p>
              {whatsapp ? (
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-sky hover:underline">{info.contact_whatsapp}</a>
              ) : (
                <Pending>[número de WhatsApp de suporte]</Pending>
              )}
            </div>
          </div>
          {info.contact_phone && (
            <div className={card}>
              <Phone className="mt-0.5 size-5 shrink-0 text-sky" aria-hidden />
              <div>
                <p className="font-medium text-halo">Telefone</p>
                <a href={`tel:${info.contact_phone.replace(/[^\d+]/g, "")}`} className="text-sky hover:underline">{info.contact_phone}</a>
              </div>
            </div>
          )}
          <div className={card}>
            <BookOpen className="mt-0.5 size-5 shrink-0 text-sky" aria-hidden />
            <div>
              <p className="font-medium text-halo">Horário de atendimento</p>
              <Pending>[dias e horário de atendimento]</Pending>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "duvidas",
      title: "Dúvidas comuns",
      content: (
        <Bullets
          items={[
            <><strong className="text-halo">Esqueci minha senha.</strong> Use a opção <Link href="/recuperar-senha" className="text-sky hover:underline">Recuperar senha</Link> e siga o link enviado por e-mail.</>,
            <><strong className="text-halo">Como divulgo meu link de agendamento?</strong> No painel, abra “Minha agenda” para copiar o link, compartilhar no WhatsApp ou baixar o QR Code.</>,
            <><strong className="text-halo">Como pago ou cancelo a assinatura?</strong> Pelo painel, em “Minha assinatura”.</>,
            <><strong className="text-halo">Sou cliente de uma barbearia e quero cancelar meu horário.</strong> Use o link recebido na confirmação do agendamento ou fale diretamente com a barbearia.</>,
            <>Veja mais respostas nas <Link href="/#faq" className="text-sky hover:underline">perguntas frequentes</Link>.</>,
          ]}
        />
      ),
    },
    {
      id: "privacidade",
      title: "Privacidade e dados pessoais",
      content: (
        <p className="flex items-start gap-2">
          <KeyRound className="mt-1 size-4 shrink-0 text-sky" aria-hidden />
          <span>
            Pedidos de acesso, correção ou exclusão de dados seguem a{" "}
            <Link href={LEGAL_ROUTES.privacy} className="text-sky hover:underline">Política de Privacidade</Link>. As
            regras de uso estão nos <Link href={LEGAL_ROUTES.terms} className="text-sky hover:underline">Termos de Uso</Link>.
          </span>
        </p>
      ),
    },
  ];

  const pending = !info.support_email || !whatsapp;
  return (
    <LegalPage
      title="Suporte e contato"
      intro={<p>Atendimento para donos de barbearia, profissionais e clientes que agendaram pelo Agendas Pro.</p>}
      sections={sections}
      pendingNotice={pending}
    />
  );
}
