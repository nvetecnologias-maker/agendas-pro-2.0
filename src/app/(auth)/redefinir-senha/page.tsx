import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Nova senha · Agendas Pro" };

export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading title="Crie uma nova senha" subtitle="Escolha uma senha forte que você não usa em outros sites." />
      <ResetPasswordForm />
    </>
  );
}
