import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Política de privacidade · Agendas Pro" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidade" updatedAt="24 de novembro de 2026">
      <Alert tone="warning" title="Documento-modelo">
        Texto inicial para estruturar a página. Revise com um advogado (LGPD) antes de publicar a plataforma.
      </Alert>
      <h2>1. Dados que coletamos</h2>
      <p>Do titular da barbearia: nome, e-mail, telefone e dados do estabelecimento. Dos clientes que agendam: nome e telefone informados no agendamento.</p>
      <h2>2. Para que usamos</h2>
      <p>Para operar a agenda, enviar confirmações e lembretes, emitir cobranças da assinatura e oferecer suporte.</p>
      <h2>3. Compartilhamento</h2>
      <p>Não vendemos dados. Compartilhamos apenas com provedores necessários à operação, como hospedagem e processamento de pagamentos.</p>
      <h2>4. Segurança</h2>
      <p>Os dados de cada barbearia são isolados no banco de dados, com controle de acesso por papel e registro de ações administrativas.</p>
      <h2>5. Seus direitos</h2>
      <p>Você pode solicitar acesso, correção ou exclusão dos seus dados pelos canais de contato da plataforma.</p>
    </LegalPage>
  );
}
