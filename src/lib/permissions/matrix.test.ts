import { describe, expect, it } from "vitest";
import { can } from "./matrix";

describe("matriz de permissões", () => {
  it("proprietário pode tudo com assinatura ativa", () => {
    expect(can("owner", "finance.manage")).toBe(true);
    expect(can("owner", "members.manage_admins")).toBe(true);
    expect(can("owner", "subscription.manage")).toBe(true);
  });

  it("administrador não gerencia assinatura nem outros administradores", () => {
    expect(can("admin", "services.manage")).toBe(true);
    expect(can("admin", "subscription.manage")).toBe(false);
    expect(can("admin", "members.manage_admins")).toBe(false);
  });

  it("profissional só opera os próprios agendamentos e não vê o financeiro", () => {
    expect(can("professional", "appointments.manage_own")).toBe(true);
    expect(can("professional", "appointments.manage_all")).toBe(false);
    expect(can("professional", "finance.view")).toBe(false);
    expect(can("professional", "services.manage")).toBe(false);
  });

  it("assinatura inativa: só leitura e cobrança", () => {
    expect(can("owner", "services.manage", "billing_only")).toBe(false);
    expect(can("owner", "appointments.view", "billing_only")).toBe(true);
    expect(can("owner", "subscription.manage", "billing_only")).toBe(true);
  });

  it("período de tolerância continua operando", () => {
    expect(can("owner", "appointments.manage_all", "grace")).toBe(true);
  });

  it("conta suspensa: bloqueia operação e leitura, permite regularizar", () => {
    expect(can("owner", "appointments.view", "blocked")).toBe(false);
    expect(can("owner", "subscription.manage", "blocked")).toBe(true);
  });

  it("sem papel, nada é permitido", () => {
    expect(can(null, "dashboard.view")).toBe(false);
  });
});
