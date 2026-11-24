/** Formato devolvido por get_public_barbershop / get_public_appointment */
export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  image_url: string | null;
  professional_ids: string[] | null;
};
export type PublicProfessional = { id: string; name: string; photo_url: string | null; bio: string | null; specialties: string[] };
export type PublicHour = { weekday: number; starts_at: string; ends_at: string };
export type Branding = { primary?: string; gallery?: string[]; show_professionals?: boolean; welcome?: string };
export type PublicShop = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  timezone: string;
  phone: string | null;
  whatsapp: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  social_links: Record<string, string> | null;
  logo_url: string | null;
  cover_url: string | null;
  branding: Branding | null;
  min_advance_minutes: number;
  max_advance_days: number;
  cancellation_min_hours: number;
  cancellation_policy: string | null;
  auto_confirm: boolean;
};
export type PublicPage =
  | { status: "unavailable"; name: string; logo_url: string | null }
  | {
      status: "ok";
      accepting: boolean;
      is_member: boolean;
      shop: PublicShop;
      services: PublicService[];
      professionals: PublicProfessional[];
      hours: PublicHour[];
    };

export type PublicAppointment = {
  token: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
  starts_at: string;
  ends_at: string;
  price_cents: number;
  duration_minutes: number;
  service_name: string;
  professional_name: string;
  customer_name: string;
  can_cancel: boolean;
  shop: Pick<PublicShop, "name" | "slug" | "timezone" | "whatsapp" | "phone" | "logo_url" | "branding" | "cancellation_min_hours" | "address_street" | "address_number" | "address_district" | "address_city" | "address_state">;
};

export type Slot = { professional_id: string; starts_at: string; ends_at: string };

const HEX = /^#[0-9a-f]{6}$/i;
/** Cor da marca com fallback para o azul da plataforma */
export function brandColor(b: Branding | null | undefined) {
  return b?.primary && HEX.test(b.primary) ? b.primary : "#2467F2";
}
/** Texto legível sobre a cor da marca (preto ou branco, pelo contraste WCAG) */
export function onBrand(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return (1.05) / (L + 0.05) >= (L + 0.05) / 0.05 ? "#FFFFFF" : "#030B20";
}

export function shopAddress(s: Partial<PublicShop>) {
  const line1 = [s.address_street, s.address_number].filter(Boolean).join(", ");
  const line2 = [s.address_district, [s.address_city, s.address_state].filter(Boolean).join(" - ")].filter(Boolean).join(" · ");
  return { line1, line2, full: [line1, line2].filter(Boolean).join(" · ") };
}
export function mapsLink(s: Partial<PublicShop>) {
  const q = [s.address_street, s.address_number, s.address_district, s.address_city, s.address_state].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}
