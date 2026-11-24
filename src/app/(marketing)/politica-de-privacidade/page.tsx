import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, LegalPage, Pending, type LegalSection } from "@/components/landing/legal-page";
import { LEGAL_ROUTES, LEGAL_UPDATED_AT, PRIVACY_VERSION } from "@/lib/legal";
import { getPublicPlatformInfo } from "@/services/public-site";

export const metadata: Metadata = {
  title: "Política de Privacidade · Agendas Pro",
  description: "Como o Agendas Pro coleta, usa, armazena e protege dados pessoais, de acordo com a LGPD (Lei nº 13.709/2018).",
  alternates: { canonical: LEGAL_ROUTES.privacy },
};

export const revalidate = 300;

export default async function PrivacyPolicyPage() {
  const info = await getPublicPlatformInfo();
  const supportEmail = info.support_email ? (
    <a href={`mailto:${info.support_email}`} className="text-sky hover:underline">{info.support_email}</a>
  ) : (
    <Pending>[e-mail de atendimento]</Pending>
  );

  const sections: LegalSection[] = [
    {
      id: "quem-somos",
      title: "Quem somos",
      content: (
        <>
          <p>
            O Agendas Pro é uma plataforma online de agendamento e gestão para barbearias, oferecida por{" "}
            <Pending>[razão social]</Pending>, inscrita no CNPJ sob o nº <Pending>[CNPJ]</Pending>, com sede em{" "}
            <Pending>[endereço completo]</Pending> (&quot;Agendas Pro&quot;, &quot;nós&quot;).
          </p>
          <p>
            Esta Política explica quais dados pessoais tratamos, por que, com quem compartilhamos, por quanto tempo
            guardamos e como você pode exercer seus direitos, conforme a Lei Geral de Proteção de Dados Pessoais (LGPD,
            Lei nº 13.709/2018).
          </p>
        </>
      ),
    },
    {
      id: "papeis",
      title: "Quem decide sobre os dados (controlador e operador)",
      content: (
        <>
          <p>A plataforma envolve dois tipos de relação, com papéis diferentes:</p>
          <Bullets
            items={[
              <><strong className="text-halo">Dados das contas da plataforma</strong> (donos de barbearia, administradores e profissionais que usam o painel): o Agendas Pro é o <strong className="text-halo">controlador</strong>.</>,
              <><strong className="text-halo">Dados dos clientes das barbearias</strong> (pessoas que agendam um horário): cada barbearia é a <strong className="text-halo">controladora</strong> dos dados dos seus clientes, e o Agendas Pro atua como <strong className="text-halo">operador</strong>, tratando esses dados em nome da barbearia e conforme as instruções dela.</>,
            ]}
          />
          <p>
            Se você é cliente de uma barbearia e quer exercer seus direitos, pode falar diretamente com a barbearia ou com
            o Agendas Pro, que encaminhará o pedido a ela.
          </p>
        </>
      ),
    },
    {
      id: "dados-coletados",
      title: "Quais informações coletamos",
      content: (
        <>
          <p><strong className="text-halo">Ao criar uma conta de barbearia:</strong></p>
          <Bullets
            items={[
              "Nome completo, e-mail, telefone/WhatsApp e senha (a senha é armazenada de forma criptografada pelo serviço de autenticação e não é visível para nós).",
              "Nome da barbearia e o endereço de agendamento gerado a partir dele.",
              "Versão dos Termos de Uso e da Política de Privacidade aceitos e a data do aceite.",
            ]}
          />
          <p><strong className="text-halo">Ao configurar e usar o painel:</strong></p>
          <Bullets
            items={[
              "Dados da barbearia: endereço, telefone, WhatsApp, e-mail, redes sociais, descrição, horários de funcionamento, logo, capa e fotos enviadas.",
              "Dados dos profissionais cadastrados: nome, telefone, especialidades, foto (se enviada), horários de trabalho, folgas e serviços que realizam.",
              "Serviços, preços, durações, agendamentos, pagamentos recebidos (valor e forma de pagamento) e observações registradas pela equipe.",
              "Registros de auditoria das ações feitas no painel (quem fez, o quê e quando).",
            ]}
          />
          <p><strong className="text-halo">Ao agendar um horário pela página de uma barbearia (clientes):</strong></p>
          <Bullets
            items={[
              "Nome e telefone (obrigatórios) e e-mail (se informado).",
              "Serviço, profissional, data e horário escolhidos e o histórico de atendimentos naquela barbearia.",
              "Observações que a barbearia registrar sobre o atendimento.",
            ]}
          />
          <p><strong className="text-halo">Ao assinar um plano:</strong></p>
          <Bullets
            items={[
              "Plano escolhido, cupom aplicado, valores, status e identificadores das transações informados pelo provedor de pagamento.",
              "Os dados do cartão de crédito ou da conta bancária são digitados diretamente no ambiente do provedor de pagamento. O Agendas Pro não recebe nem armazena número de cartão ou código de segurança.",
            ]}
          />
        </>
      ),
    },
    {
      id: "finalidades",
      title: "Para que usamos os dados e com qual base legal",
      content: (
        <>
          <Bullets
            items={[
              <><strong className="text-halo">Prestar o serviço contratado</strong> (criar a conta, mostrar a agenda, permitir agendamentos online, calcular relatórios e financeiro): execução de contrato (art. 7º, V, da LGPD).</>,
              <><strong className="text-halo">Cobrar a assinatura e emitir comprovantes</strong>: execução de contrato e cumprimento de obrigação legal (art. 7º, II e V).</>,
              <><strong className="text-halo">Enviar avisos do serviço</strong> (confirmação de agendamento, lembretes, avisos de pagamento e de vencimento): execução de contrato. Os canais de envio dependem das configurações de cada barbearia.</>,
              <><strong className="text-halo">Segurança, prevenção a fraudes e registros de auditoria</strong>: legítimo interesse (art. 7º, IX) e cumprimento de obrigação legal, incluindo a guarda de registros de acesso exigida pelo Marco Civil da Internet (Lei nº 12.965/2014).</>,
              <><strong className="text-halo">Atendimento e suporte</strong>: execução de contrato e legítimo interesse.</>,
              <><strong className="text-halo">Exercício de direitos em processos</strong>: art. 7º, VI.</>,
            ]}
          />
          <p>
            Não vendemos dados pessoais e não usamos os dados dos clientes das barbearias para publicidade própria. Não
            tomamos decisões automatizadas que produzam efeitos jurídicos sobre as pessoas.
          </p>
        </>
      ),
    },
    {
      id: "compartilhamento",
      title: "Compartilhamento com provedores e serviços externos",
      content: (
        <>
          <p>Compartilhamos dados apenas com os fornecedores necessários para o funcionamento da plataforma:</p>
          <Bullets
            items={[
              <><strong className="text-halo">Supabase</strong>: banco de dados, autenticação e armazenamento de arquivos (fotos e logos).</>,
              <><strong className="text-halo">Vercel</strong>: hospedagem e entrega do site e do painel.</>,
              <><strong className="text-halo">Provedores de pagamento</strong> (Mercado Pago, Asaas ou Stripe, conforme o meio disponível no momento da assinatura): processamento das cobranças da assinatura.</>,
              <><strong className="text-halo">Envio de e-mails</strong> (Resend) e <strong className="text-halo">envio de WhatsApp</strong> (<Pending>[provedor de WhatsApp]</Pending>), somente quando esses canais estiverem ativados.</>,
            ]}
          />
          <p>
            Também podemos fornecer dados a autoridades públicas quando houver obrigação legal ou ordem judicial. A
            barbearia tem acesso aos dados dos seus próprios clientes, profissionais e agendamentos. Os dados de uma
            barbearia não ficam visíveis para outras barbearias.
          </p>
        </>
      ),
    },
    {
      id: "transferencia-internacional",
      title: "Transferência internacional",
      content: (
        <p>
          Alguns provedores listados acima podem armazenar ou processar dados em servidores fora do Brasil. Nesses casos, a
          transferência ocorre para viabilizar a execução do contrato com você, nos termos do art. 33 da LGPD. Região
          principal de armazenamento do banco de dados: <Pending>[região do servidor de banco de dados]</Pending>.
        </p>
      ),
    },
    {
      id: "armazenamento",
      title: "Como funciona o armazenamento",
      content: (
        <p>
          Os dados ficam em banco de dados gerenciado pela Supabase. Cada registro operacional (agendamentos, clientes,
          serviços, pagamentos) é vinculado a uma barbearia, e regras de acesso no próprio banco de dados (Row Level
          Security) só liberam esses registros para os membros daquela barbearia. Arquivos enviados, como logos e fotos,
          ficam no serviço de armazenamento de arquivos da Supabase.
        </p>
      ),
    },
    {
      id: "seguranca",
      title: "Como protegemos os dados",
      content: (
        <>
          <p>Adotamos as seguintes medidas técnicas, que estão implementadas na plataforma hoje:</p>
          <Bullets
            items={[
              "Conexões criptografadas (HTTPS) entre o navegador e a plataforma.",
              "Senhas armazenadas apenas em formato criptografado pelo serviço de autenticação.",
              "Isolamento dos dados por barbearia com regras de acesso aplicadas no banco de dados.",
              "Permissões por papel (proprietário, administrador e profissional) dentro de cada barbearia.",
              "Chaves de acesso dos provedores de pagamento guardadas em cofre de segredos, fora das tabelas comuns.",
              "Confirmação da autenticidade das notificações de pagamento recebidas dos provedores.",
              "Registro de auditoria das ações administrativas.",
            ]}
          />
          <p>
            Nenhum sistema é totalmente imune a incidentes. Se ocorrer um incidente de segurança que possa causar risco ou
            dano relevante, comunicaremos os titulares afetados e a Autoridade Nacional de Proteção de Dados (ANPD), como
            determina a LGPD.
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookies e tecnologias semelhantes",
      content: (
        <>
          <Bullets
            items={[
              <><strong className="text-halo">Cookies de sessão (necessários)</strong>: mantêm você conectado ao painel com segurança. Sem eles, não é possível entrar na conta.</>,
              <><strong className="text-halo">Armazenamento local do navegador</strong>: na página de agendamento, o nome e o telefone informados podem ficar salvos no próprio aparelho do cliente para preencher o próximo agendamento. Esses dados ficam só no navegador e podem ser apagados limpando os dados do site.</>,
            ]}
          />
          <p>Atualmente não utilizamos cookies de publicidade nem ferramentas de rastreamento de terceiros.</p>
        </>
      ),
    },
    {
      id: "clientes-e-profissionais",
      title: "Dados de clientes e profissionais das barbearias",
      content: (
        <>
          <p>
            A barbearia é responsável por cadastrar apenas os dados necessários dos seus profissionais e clientes, por ter
            base legal para isso e por informá-los sobre o uso dos dados. O Agendas Pro trata esses dados somente para
            fornecer as funcionalidades da plataforma à barbearia.
          </p>
          <p>
            Os clientes que agendam pela página pública informam seus dados para que a barbearia possa confirmar e realizar
            o atendimento. O link de acompanhamento enviado ao cliente permite consultar ou cancelar o próprio agendamento,
            respeitando a política de cancelamento da barbearia.
          </p>
        </>
      ),
    },
    {
      id: "direitos",
      title: "Seus direitos",
      content: (
        <>
          <p>Nos termos do art. 18 da LGPD, você pode solicitar:</p>
          <Bullets
            items={[
              "Confirmação de que tratamos seus dados e acesso a eles.",
              "Correção de dados incompletos, inexatos ou desatualizados.",
              "Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei.",
              "Portabilidade dos dados a outro fornecedor, conforme regulamentação da ANPD.",
              "Eliminação dos dados tratados com base no consentimento, quando for o caso.",
              "Informação sobre com quem compartilhamos seus dados.",
              "Revisão de decisões tomadas unicamente com base em tratamento automatizado.",
              "Revogação do consentimento, quando o tratamento depender dele.",
            ]}
          />
          <p>Você também pode apresentar reclamação à ANPD (www.gov.br/anpd).</p>
        </>
      ),
    },
    {
      id: "como-solicitar",
      title: "Como solicitar acesso, correção ou exclusão",
      content: (
        <>
          <Bullets
            items={[
              "Donos de barbearia podem corrigir os dados da conta, da barbearia, dos profissionais e dos clientes diretamente no painel.",
              <>Para outros pedidos, envie um e-mail para <Pending>[e-mail do encarregado de dados]</Pending> ou para {supportEmail}, informando seu nome, o e-mail ou telefone usado no cadastro e o que deseja.</>,
              "Podemos pedir informações adicionais para confirmar sua identidade antes de atender o pedido, para proteger seus dados.",
              <>Prazo de resposta: <Pending>[prazo de resposta, ex.: até 15 dias]</Pending>.</>,
            ]}
          />
        </>
      ),
    },
    {
      id: "retencao",
      title: "Prazo e critérios de retenção",
      content: (
        <>
          <Bullets
            items={[
              "Enquanto a conta estiver ativa, os dados são mantidos para prestar o serviço.",
              "O fim do período de teste, o vencimento ou o cancelamento da assinatura não apagam automaticamente os dados da barbearia. Eles continuam guardados para permitir a reativação da conta.",
              <>Após o encerramento definitivo da conta, os dados serão eliminados ou anonimizados em até <Pending>[prazo de eliminação após o encerramento]</Pending>, exceto os que precisarem ser guardados por obrigação legal.</>,
              "Registros de acesso à aplicação são guardados por no mínimo 6 meses (Marco Civil da Internet). Registros de cobrança e transações são mantidos pelo prazo exigido pela legislação fiscal e contábil.",
            ]}
          />
        </>
      ),
    },
    {
      id: "menores",
      title: "Crianças e adolescentes",
      content: (
        <p>
          O painel do Agendas Pro é destinado a maiores de 18 anos. Agendamentos para menores de idade devem ser feitos pelos
          pais ou responsáveis.
        </p>
      ),
    },
    {
      id: "alteracoes",
      title: "Alterações desta Política",
      content: (
        <p>
          Podemos atualizar esta Política para refletir mudanças na plataforma ou na legislação. A versão e a data da última
          atualização ficam no topo desta página. Quando a mudança for relevante, avisaremos pelo painel ou por e-mail.
        </p>
      ),
    },
    {
      id: "contato",
      title: "Canais de contato sobre privacidade",
      content: (
        <Bullets
          items={[
            <>Encarregado pelo tratamento de dados (DPO): <Pending>[nome do encarregado]</Pending>.</>,
            <>E-mail de privacidade: <Pending>[e-mail do encarregado de dados]</Pending>.</>,
            <>Atendimento geral: {supportEmail}. Veja também a página de <Link href={LEGAL_ROUTES.support} className="text-sky hover:underline">Suporte</Link>.</>,
            <>Endereço para correspondência: <Pending>[endereço completo]</Pending>.</>,
          ]}
        />
      ),
    },
  ];

  return (
    <LegalPage
      title="Política de Privacidade"
      updatedAt={LEGAL_UPDATED_AT}
      version={PRIVACY_VERSION}
      intro={
        <p>
          Este documento descreve como o Agendas Pro trata dados pessoais de quem usa a plataforma e de quem agenda horários
          nas barbearias cadastradas. Leia também os <Link href={LEGAL_ROUTES.terms} className="text-sky hover:underline">Termos de Uso</Link>.
        </p>
      }
      sections={sections}
    />
  );
}
