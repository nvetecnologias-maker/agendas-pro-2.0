import { describe, expect, it } from "vitest";
import { signUpSchema } from "./auth";

const valid = {
  fullName: "João Silva",
  email: "JOAO@Teste.dev ",
  phone: "(11) 98888-7777",
  barbershopName: "Barbearia do João",
  password: "senha123",
  confirmPassword: "senha123",
  acceptLegal: "on",
};

describe("cadastro", () => {
  it("aceita dados válidos e normaliza e-mail e telefone", () => {
    const r = signUpSchema.parse(valid);
    expect(r.email).toBe("joao@teste.dev");
    expect(r.phone).toBe("11988887777");
  });
  it("recusa senhas diferentes", () => {
    const r = signUpSchema.safeParse({ ...valid, confirmPassword: "outra123" });
    expect(r.success).toBe(false);
  });
  it("recusa senha fraca", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "abc", confirmPassword: "abc" }).success).toBe(false);
  });
  it("exige aceite dos Termos e da Política (caixa não vem marcada)", () => {
    const r = signUpSchema.safeParse({ ...valid, acceptLegal: undefined });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path[0]).toBe("acceptLegal");
      expect(r.error.issues[0].message).toContain("Termos de Uso");
    }
    expect(signUpSchema.safeParse({ ...valid, acceptLegal: "off" }).success).toBe(false);
  });
  it("recusa telefone sem DDD", () => {
    expect(signUpSchema.safeParse({ ...valid, phone: "98888777" }).success).toBe(false);
  });
});
