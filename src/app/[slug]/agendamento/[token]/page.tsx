import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ManageBooking } from "@/components/booking/manage-booking";
import type { PublicAppointment } from "@/lib/public-booking/types";

export const metadata: Metadata = { title: "Meu agendamento", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ManageBookingPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  if (!UUID.test(token)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_appointment", { p_token: token });
  const appt = data as unknown as PublicAppointment | null;
  if (!appt || appt.shop.slug !== slug.toLowerCase()) notFound();
  return <ManageBooking initial={appt} />;
}
