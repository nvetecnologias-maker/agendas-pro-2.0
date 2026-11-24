/**
 * Versões vigentes dos documentos legais.
 * Ao alterar o texto de um documento, atualize a versão (data) correspondente:
 * o cadastro grava a versão aceita em public.legal_acceptances.
 */
export const TERMS_VERSION = "2026-11-24";
export const PRIVACY_VERSION = "2026-11-24";

/** Data exibida como "Última atualização" nas páginas */
export const LEGAL_UPDATED_AT = "24 de novembro de 2026";

export const LEGAL_ROUTES = {
  terms: "/termos-de-uso",
  privacy: "/politica-de-privacidade",
  support: "/suporte",
} as const;

/**
 * Dados oficiais da empresa. Preencha antes da publicação definitiva:
 * aparecem no rodapé e substituem os campos pendentes dos documentos.
 */
export const COMPANY: { legalName: string | null; cnpj: string | null } = {
  legalName: null,
  cnpj: null,
};
