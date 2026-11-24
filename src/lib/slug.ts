/** Endereços que não podem virar link de barbearia (rotas do sistema) */
export const RESERVED_SLUGS = new Set([
  "painel", "entrar", "cadastro", "recuperar-senha", "redefinir-senha", "auth", "api", "onboarding",
  "super-admin", "admin", "termos", "privacidade", "design-system", "planos", "ajuda", "suporte",
  "termos-de-uso", "politica-de-privacidade", "manifest", "brand", "icon", "apple-icon",
  "blog", "sobre", "contato", "app", "www", "static", "_next", "favicon", "robots", "sitemap",
  "agendar", "agenda", "b", "checkout", "assinatura", "webhooks", "login", "logout",
]);
