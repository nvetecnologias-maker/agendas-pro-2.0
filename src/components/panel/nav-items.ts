import type { Action } from "@/lib/permissions/matrix";

export type NavKey =
  | "overview" | "appointments" | "services" | "professionals" | "customers"
  | "finance" | "my-page" | "settings" | "subscription";

export const NAV_ITEMS: { key: NavKey; href: string; label: string; action: Action }[] = [
  { key: "overview", href: "/painel", label: "Visão geral", action: "dashboard.view" },
  { key: "appointments", href: "/painel/agendamentos", label: "Agendamentos", action: "appointments.view" },
  { key: "services", href: "/painel/servicos", label: "Serviços", action: "services.manage" },
  { key: "professionals", href: "/painel/profissionais", label: "Profissionais", action: "professionals.manage" },
  { key: "customers", href: "/painel/clientes", label: "Clientes", action: "customers.view" },
  { key: "finance", href: "/painel/financeiro", label: "Financeiro", action: "finance.view" },
  { key: "my-page", href: "/painel/minha-agenda", label: "Minha agenda", action: "public_page.manage" },
  { key: "settings", href: "/painel/configuracoes", label: "Configurações", action: "settings.manage" },
  { key: "subscription", href: "/painel/assinatura", label: "Minha assinatura", action: "subscription.view" },
];
