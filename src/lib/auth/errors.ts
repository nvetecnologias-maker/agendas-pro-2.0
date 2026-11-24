/** Traduz erros do Supabase Auth para mensagens claras (sem revelar se o e-mail existe) */
export function authErrorMessage(code: string | undefined, fallback?: string): string {
  switch (code) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
    case "user_already_exists":
    case "email_exists":
      return "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.";
    case "weak_password":
      return "Senha fraca. Use pelo menos 8 caracteres com letras e números.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
    case "same_password":
      return "A nova senha precisa ser diferente da atual.";
    case "otp_expired":
      return "O link expirou. Solicite um novo.";
    default:
      return fallback ?? "Não foi possível concluir agora. Tente novamente em instantes.";
  }
}
