import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Termos de uso · Agendas Pro" };

export default function TermsPage() {
  return (
    <LegalPage title="Termos de uso" updatedAt="24 de novembro de 2026">
      <Alert tone="warning" title="Documento-modelo">
        Texto inicial para estruturar a página. Revise com um advogado antes de publicar a plataforma.
      </Alert>
      <h2>1. Sobre o serviço</h2>
      <p>O Agendas Pro é uma plataforma online de agendamento e gestão para barbearias, oferecida por assinatura.</p>
      <h2>2. Conta e responsabilidades</h2>
      <p>O titular da conta é responsável pelas informações cadastradas, pelos acessos concedidos à sua equipe e pelo uso da página pública de agendamento.</p>
      <h2>3. Período de teste e assinatura</h2>
      <p>Novas contas podem usar o período de teste gratuito informado na contratação. Após esse período, o uso depende de uma assinatura ativa. Os preços e recursos de cada plano estão na página de planos.</p>
      <h2>4. Cancelamento</h2>
      <p>A assinatura pode ser cancelada a qualquer momento pela área &quot;Minha assinatura&quot;. O acesso permanece até o fim do período já pago.</p>
      <h2>5. Dados</h2>
      <p>Os dados de cada barbearia ficam isolados e não são apagados automaticamente por vencimento. O tratamento de dados pessoais segue a Política de privacidade.</p>
    </LegalPage>
  );
}
