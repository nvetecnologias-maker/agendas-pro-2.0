import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, LegalPage, Pending, type LegalSection } from "@/components/landing/legal-page";
import { LEGAL_ROUTES, LEGAL_UPDATED_AT, TERMS_VERSION } from "@/lib/legal";
import { getPublicPlatformInfo } from "@/services/public-site";

export const metadata: Metadata = {
  title: "Termos de Uso · Agendas Pro",
  description: "Regras de uso da plataforma Agendas Pro: cadastro, planos, pagamentos, cancelamento e responsabilidades.",
  alternates: { canonical: LEGAL_ROUTES.terms },
};

export const revalidate = 300;

const link = "text-sky hover:underline";

export default async function TermsOfUsePage() {
  const info = await getPublicPlatformInfo();
  const supportEmail = info.support_email ? (
    <a href={`mailto:${info.support_email}`} className={link}>{info.support_email}</a>
  ) : (
    <Pending>[e-mail de atendimento]</Pending>
  );

  const sections: LegalSection[] = [
    {
      id: "apresentacao",
      title: "Apresentação da plataforma",
      content: (
        <>
          <p>
            O Agendas Pro é uma plataforma online, oferecida por assinatura, para barbearias organizarem sua agenda,
            receberem agendamentos pela internet e acompanharem profissionais, serviços, clientes e financeiro. A
            plataforma é fornecida por <Pending>[razão social]</Pending>, CNPJ <Pending>[CNPJ]</Pending>, com sede em{" "}
            <Pending>[endereço completo]</Pending>.
          </p>
          <p>
            Ao criar uma conta ou usar a plataforma, você declara que leu e concorda com estes Termos e com a{" "}
            <Link href={LEGAL_ROUTES.privacy} className={link}>Política de Privacidade</Link>. Se não concordar, não
            utilize a plataforma.
          </p>
        </>
      ),
    },
    {
      id: "definicoes",
      title: "Definições",
      content: (
        <Bullets
          items={[
            <><strong className="text-halo">Barbearia</strong>: o estabelecimento cadastrado na plataforma.</>,
            <><strong className="text-halo">Proprietário</strong>: a pessoa que criou a conta da barbearia e responde por ela, inclusive pela assinatura.</>,
            <><strong className="text-halo">Administrador e Profissional</strong>: pessoas da equipe com acesso ao painel, com permissões definidas pelo Proprietário.</>,
            <><strong className="text-halo">Cliente</strong>: a pessoa que agenda um horário pela página da barbearia.</>,
            <><strong className="text-halo">Página de agendamento</strong>: o endereço público da barbearia na plataforma.</>,
          ]}
        />
      ),
    },
    {
      id: "cadastro",
      title: "Regras de cadastro",
      content: (
        <Bullets
          items={[
            "O cadastro do Proprietário exige nome completo, e-mail válido, telefone com DDD, nome da barbearia e senha.",
            "O Proprietário deve ter 18 anos ou mais e capacidade para contratar em nome da barbearia.",
            "As informações devem ser verdadeiras e mantidas atualizadas. O e-mail cadastrado é usado para acesso, recuperação de senha e avisos importantes.",
            "O login e a senha são pessoais. Você é responsável por manter a senha em sigilo e por toda atividade feita com seu acesso.",
            "Cada cadastro cria uma barbearia, com um único Proprietário ativo.",
          ]}
        />
      ),
    },
    {
      id: "responsabilidades-usuarios",
      title: "Responsabilidades dos usuários",
      content: (
        <Bullets
          items={[
            "Usar a plataforma de acordo com a lei, estes Termos e a finalidade de agendamento e gestão de barbearias.",
            "Não tentar acessar dados de outras barbearias, contornar limites técnicos ou de plano, nem interferir no funcionamento da plataforma.",
            "Não inserir conteúdo ilegal, ofensivo, que viole direitos de terceiros ou que contenha código malicioso.",
            "Comunicar imediatamente qualquer uso não autorizado da sua conta.",
          ]}
        />
      ),
    },
    {
      id: "responsabilidades-proprietarios",
      title: "Responsabilidades dos proprietários das barbearias",
      content: (
        <Bullets
          items={[
            "Manter corretos os dados da barbearia, serviços, preços, durações e horários de funcionamento exibidos aos clientes.",
            "Conceder e revogar o acesso da equipe ao painel e definir o papel de cada pessoa.",
            "Cumprir os agendamentos confirmados ou avisar o cliente em caso de alteração ou cancelamento.",
            "Atuar como controlador dos dados dos seus clientes e profissionais, cadastrando apenas o necessário, com base legal adequada, e atendendo aos pedidos desses titulares (LGPD).",
            "Responder pelos serviços prestados aos clientes, pelos valores cobrados e pelas obrigações fiscais, trabalhistas e de consumo da barbearia.",
            "Manter a assinatura em dia, conforme a seção de pagamentos.",
          ]}
        />
      ),
    },
    {
      id: "responsabilidades-profissionais",
      title: "Responsabilidades dos profissionais",
      content: (
        <Bullets
          items={[
            "Usar o acesso apenas para as atividades permitidas pelo papel definido pelo Proprietário.",
            "Manter atualizados os próprios horários, folgas e bloqueios de agenda.",
            "Tratar os dados dos clientes com sigilo e somente para o atendimento.",
          ]}
        />
      ),
    },
    {
      id: "agendamentos",
      title: "Regras de utilização dos agendamentos",
      content: (
        <>
          <Bullets
            items={[
              "A página de agendamento só fica disponível ao público depois que a barbearia a publica no painel.",
              "A plataforma mostra apenas horários livres, considerando o expediente, as folgas, os bloqueios e a duração do serviço, e impede dois agendamentos no mesmo horário para o mesmo profissional.",
              "Cada barbearia define a antecedência mínima para agendar, até quantos dias à frente aceita agendamentos, o intervalo entre atendimentos, se confirma automaticamente e a antecedência mínima para cancelamento pelo cliente.",
              "O cliente recebe um link para consultar e cancelar o agendamento, dentro do prazo de cancelamento definido pela barbearia.",
              "A barbearia pode criar, remarcar, concluir, cancelar ou marcar como falta qualquer agendamento pelo painel.",
            ]}
          />
          <p>
            O Agendas Pro fornece a ferramenta de agendamento e não é parte da relação de consumo entre a barbearia e o
            cliente. Atendimentos, atrasos, faltas, preços e pagamentos dos serviços são de responsabilidade da barbearia.
          </p>
        </>
      ),
    },
    {
      id: "planos",
      title: "Planos e funcionalidades",
      content: (
        <>
          <p>
            Os planos disponíveis, seus preços, períodos de cobrança (mensal, trimestral, semestral ou anual) e recursos
            incluídos são os publicados na seção <Link href="/#planos" className={link}>Planos</Link> no momento da
            contratação. Cada plano pode ter limites, como quantidade de profissionais ou de serviços, aplicados
            automaticamente pela plataforma.
          </p>
          <p>
            Novas contas começam com um período de teste gratuito, com a duração informada no cadastro, sem exigência de
            cartão de crédito. Durante o teste, os recursos do plano escolhido ficam disponíveis.
          </p>
          <p>
            Recursos que dependem de serviços externos, como envio de lembretes por e-mail ou WhatsApp, só funcionam quando
            o canal correspondente estiver ativo na plataforma.
          </p>
        </>
      ),
    },
    {
      id: "pagamentos",
      title: "Pagamentos e cobranças",
      content: (
        <>
          <Bullets
            items={[
              "O pagamento da assinatura é feito pela área “Minha assinatura”, no ambiente seguro de um provedor de pagamento parceiro (Mercado Pago, Asaas ou Stripe), pelos meios oferecidos no momento, como Pix, boleto ou cartão.",
              "O plano é ativado quando o provedor confirma o pagamento. Pagamentos pendentes por mais de 3 dias são cancelados automaticamente e podem ser refeitos.",
              "Cupons de desconto seguem as regras informadas em cada cupom (validade, público e limite de uso) e são validados antes do pagamento.",
              "Os valores pagos não incluem tarifas eventualmente cobradas pelo seu banco ou operadora de cartão.",
              <>Emissão de nota fiscal: <Pending>[regras de emissão de nota fiscal]</Pending>.</>,
            ]}
          />
        </>
      ),
    },
    {
      id: "renovacao",
      title: "Renovação de assinaturas",
      content: (
        <>
          <p>
            A assinatura vale pelo período pago. Para continuar usando a plataforma, o Proprietário realiza um novo
            pagamento pela área “Minha assinatura”. Atualmente a plataforma não faz cobranças automáticas recorrentes no
            cartão.
          </p>
          <p>
            Ao renovar o mesmo plano antes do vencimento, o novo período é somado ao período atual. Ao trocar de plano ou
            sair do período de teste, o novo período começa na data da confirmação do pagamento.
          </p>
          <p>A data de vencimento fica visível na área “Minha assinatura”. É responsabilidade do Proprietário acompanhar essa data.</p>
        </>
      ),
    },
    {
      id: "cancelamento",
      title: "Cancelamentos",
      content: (
        <>
          <Bullets
            items={[
              "O Proprietário pode cancelar a assinatura a qualquer momento pela área “Minha assinatura”.",
              "O cancelamento vale ao final do período já pago (ou do teste). Até lá, o acesso continua normal e o cancelamento pode ser desfeito.",
              "Cancelar a assinatura não apaga os dados da barbearia. Para pedir a exclusão definitiva dos dados, siga a Política de Privacidade.",
              <>Reembolsos e direito de arrependimento: <Pending>[política de reembolso a definir e validar juridicamente]</Pending>.</>,
            ]}
          />
        </>
      ),
    },
    {
      id: "inadimplencia",
      title: "Inadimplência",
      content: (
        <>
          <p>Se o período pago terminar sem a renovação:</p>
          <Bullets
            items={[
              "A assinatura passa para a situação “atrasada” e a barbearia continua operando normalmente durante um prazo de tolerância, cuja duração é definida pela plataforma e informada no painel.",
              "Encerrada a tolerância, o acesso fica restrito à área de assinatura: não é possível criar ou editar agendamentos, e a página de agendamento deixa de aceitar novos horários até a regularização.",
              "Os dados da barbearia são preservados e o acesso completo volta assim que o pagamento é confirmado.",
              "Ao fim do período de teste sem contratação, aplica-se a mesma restrição de acesso.",
            ]}
          />
        </>
      ),
    },
    {
      id: "suspensao",
      title: "Suspensão de contas",
      content: (
        <>
          <p>A conta pode ser suspensa, total ou parcialmente, nos seguintes casos:</p>
          <Bullets
            items={[
              "Violação destes Termos ou da lei.",
              "Uso que coloque em risco a segurança da plataforma, de outras barbearias ou de clientes.",
              "Suspeita fundamentada de fraude, inclusive em pagamentos.",
              "Determinação de autoridade competente.",
            ]}
          />
          <p>
            Sempre que possível, o Proprietário será avisado sobre o motivo. A suspensão pode ser revertida quando a causa
            for resolvida.
          </p>
        </>
      ),
    },
    {
      id: "uso-indevido",
      title: "Uso indevido da plataforma",
      content: (
        <Bullets
          items={[
            "Cadastrar agendamentos, clientes ou dados falsos com o objetivo de enganar terceiros.",
            "Usar a plataforma para enviar mensagens não solicitadas (spam) ou para fins diferentes do agendamento e da gestão da barbearia.",
            "Copiar, revender, sublicenciar ou fazer engenharia reversa da plataforma.",
            "Automatizar acessos em volume que prejudique o funcionamento do serviço.",
          ]}
        />
      ),
    },
    {
      id: "propriedade-intelectual",
      title: "Propriedade intelectual",
      content: (
        <p>
          A marca Agendas Pro, o software, o design e os textos da plataforma pertencem a <Pending>[razão social]</Pending>.
          A assinatura dá uma licença de uso pessoal, limitada, não exclusiva e intransferível, durante a vigência do plano.
          Os conteúdos enviados pela barbearia (logo, fotos, textos e dados) continuam sendo dela, que autoriza o Agendas
          Pro a usá-los apenas para exibir e operar a plataforma.
        </p>
      ),
    },
    {
      id: "disponibilidade",
      title: "Disponibilidade dos serviços",
      content: (
        <p>
          Trabalhamos para manter a plataforma disponível de forma contínua, mas podem ocorrer interrupções por manutenção,
          atualizações, falhas de provedores externos (hospedagem, banco de dados, pagamentos, e-mail ou WhatsApp) ou por
          motivos fora do nosso controle. Não há garantia de disponibilidade ininterrupta. Manutenções programadas serão
          avisadas com antecedência sempre que possível.
        </p>
      ),
    },
    {
      id: "limitacao-responsabilidade",
      title: "Limitações de responsabilidade",
      content: (
        <>
          <p>Na extensão permitida pela lei, o Agendas Pro não se responsabiliza por:</p>
          <Bullets
            items={[
              "Informações incorretas cadastradas pela barbearia ou pelos clientes.",
              "Faltas, atrasos, cancelamentos ou a qualidade dos serviços prestados pela barbearia.",
              "Falhas de conexão de internet, aparelhos dos usuários ou serviços de terceiros.",
              "Danos causados por uso indevido da conta ou por compartilhamento de senha.",
            ]}
          />
          <p>
            Limite de responsabilidade: <Pending>[limite de responsabilidade a validar juridicamente]</Pending>. Nada nestes
            Termos afasta direitos que não possam ser limitados por lei.
          </p>
        </>
      ),
    },
    {
      id: "dados-pessoais",
      title: "Tratamento de dados pessoais",
      content: (
        <p>
          O tratamento de dados pessoais segue a <Link href={LEGAL_ROUTES.privacy} className={link}>Política de
          Privacidade</Link> e a LGPD. Em relação aos dados dos clientes e profissionais cadastrados pela barbearia, a
          barbearia é a controladora e o Agendas Pro atua como operador. No cadastro, registramos a versão destes Termos e
          da Política de Privacidade aceita e a data do aceite.
        </p>
      ),
    },
    {
      id: "alteracoes",
      title: "Alterações nos termos",
      content: (
        <p>
          Estes Termos podem ser atualizados. A versão e a data da última atualização aparecem no topo da página. Mudanças
          relevantes serão comunicadas pelo painel ou por e-mail antes de entrarem em vigor e, quando necessário, será
          solicitado um novo aceite. Continuar usando a plataforma após a vigência significa concordar com a nova versão.
        </p>
      ),
    },
    {
      id: "suporte",
      title: "Canais de suporte",
      content: (
        <Bullets
          items={[
            <>E-mail: {supportEmail}.</>,
            info.contact_whatsapp ? <>WhatsApp: {info.contact_whatsapp}.</> : <>WhatsApp: <Pending>[número de WhatsApp de suporte]</Pending>.</>,
            <>Horário de atendimento: <Pending>[dias e horário de atendimento]</Pending>.</>,
            <>Mais informações na página de <Link href={LEGAL_ROUTES.support} className={link}>Suporte</Link>.</>,
          ]}
        />
      ),
    },
    {
      id: "legislacao",
      title: "Legislação aplicável e foro",
      content: (
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de{" "}
          <Pending>[cidade/UF do foro]</Pending> para resolver questões relacionadas a eles, ressalvados os casos em que a lei
          determinar outro foro.
        </p>
      ),
    },
  ];

  return (
    <LegalPage
      title="Termos de Uso"
      updatedAt={LEGAL_UPDATED_AT}
      version={TERMS_VERSION}
      intro={<p>Regras para usar o Agendas Pro. Escrevemos de forma direta para que fique claro o que a plataforma faz e o que cabe a cada parte.</p>}
      sections={sections}
    />
  );
}
