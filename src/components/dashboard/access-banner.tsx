import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import type { AccessLevel } from "@/types/database";

/** Aviso global conforme a situação da assinatura (regras da seção 11) */
export function AccessBanner({ access }: { access: AccessLevel }) {
  if (access === "full") return null;
  const content = {
    grace: { tone: "warning" as const, title: "Pagamento pendente", text: "Sua assinatura venceu. Você está no período de tolerância: regularize para não perder o acesso." },
    billing_only: { tone: "warning" as const, title: "Assinatura inativa", text: "Seus dados estão preservados. Escolha um plano para voltar a operar." },
    blocked: { tone: "danger" as const, title: "Conta suspensa", text: "O acesso operacional está bloqueado e seus dados estão preservados. Regularize ou fale com o suporte." },
  }[access];
  return (
    <Alert tone={content.tone} title={content.title}>
      {content.text}{" "}
      <Link href="/painel/assinatura" className="font-medium text-sky hover:underline">Ir para Minha assinatura</Link>
    </Alert>
  );
}
