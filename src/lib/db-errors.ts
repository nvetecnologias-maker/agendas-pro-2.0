/** Traduz erros do banco (validações AP_* e códigos do Postgres) em mensagens claras */
const AP: Record<string, string> = {
  AP_OUTSIDE_HOURS: "Esse horário está fora do expediente do profissional ou da barbearia.",
  AP_BLOCKED: "Esse horário está bloqueado (folga, feriado ou bloqueio).",
  AP_CONFLICT: "Esse horário acabou de ser ocupado. Escolha outro.",
  AP_PROFESSIONAL_INACTIVE: "Esse profissional está inativo.",
  AP_SERVICE_NOT_OFFERED: "Esse profissional não realiza o serviço escolhido.",
  AP_SERVICE_NOT_FOUND: "Serviço não encontrado.",
  AP_SERVICE_INACTIVE: "Esse serviço está inativo.",
  AP_FORBIDDEN: "Você não tem permissão para isso.",
};

export function dbErrorMessage(error: { code?: string; message?: string } | null | undefined, fallback = "Não foi possível salvar. Tente novamente."): string {
  if (!error) return fallback;
  const msg = error.message ?? "";
  const ap = Object.keys(AP).find((k) => msg.includes(k));
  if (ap) return AP[ap];
  if (msg.includes("PLAN_LIMIT_SERVICES")) {
    return "Seu plano atingiu o limite de serviços ativos. Desative um serviço ou faça upgrade em Minha assinatura.";
  }
  if (msg.includes("PLAN_LIMIT")) {
    return "Seu plano atingiu o limite de profissionais ativos. Faça upgrade em Minha assinatura.";
  }
  switch (error.code) {
    case "23P01":
      return AP.AP_CONFLICT;
    case "23505":
      return "Já existe um registro com esses dados (ex.: telefone ou link repetido).";
    case "23503":
      return "Esse item está ligado a outros registros e não pode ser removido. Desative-o.";
    case "23514":
      return "Algum valor está fora do permitido. Confira os campos.";
    case "42501":
      return "Sua assinatura não permite esta ação agora, ou você não tem permissão.";
    default:
      return fallback;
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
