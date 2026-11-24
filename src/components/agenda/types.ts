import type { AppointmentSource, AppointmentStatus } from "@/types/database";

export type AgendaView = "dia" | "semana" | "mes" | "lista";

export type AgendaAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  price_cents: number;
  duration_minutes: number;
  notes: string | null;
  cancel_reason: string | null;
  customer: { id: string; name: string; phone: string } | null;
  service: { id: string; name: string } | null;
  professional: { id: string; name: string } | null;
};

export type AgendaProfessional = { id: string; name: string; photo_url: string | null; is_active: boolean };
export type AgendaService = { id: string; name: string; price_cents: number; duration_minutes: number; is_active: boolean; professionalIds: string[] };
export type AgendaBlock = { id: string; professional_id: string | null; starts_at: string; ends_at: string; kind: string; reason: string | null };

export type AgendaPermissions = {
  manage: boolean;      // criar/editar/mudar status
  finance: boolean;     // registrar pagamento
  ownProfessionalId: string | null; // profissional logado (papel profissional)
};
