import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { BookingFlow } from "@/components/booking/booking-flow";
import { Unavailable } from "@/components/booking/unavailable";
import { RESERVED_SLUGS } from "@/lib/slug";
import { brandColor, type PublicPage } from "@/lib/public-booking/types";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/;

const load = cache(async (slug: string): Promise<PublicPage | null> => {
  if (!SLUG.test(slug) || RESERVED_SLUGS.has(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_barbershop", { p_slug: slug });
  if (error) throw new Error("Falha ao carregar a barbearia");
  return (data as unknown as PublicPage) ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await load(slug.toLowerCase());
  if (!page) return { title: "Barbearia não encontrada" };
  if (page.status !== "ok") return { title: page.name, robots: { index: false } };
  const { shop } = page;
  const description = shop.description?.slice(0, 160) ?? `Agende seu horário na ${shop.name} em poucos toques.`;
  return {
    title: `${shop.name} · Agende online`,
    description,
    robots: page.accepting ? undefined : { index: false },
    openGraph: { title: shop.name, description, images: shop.cover_url ? [shop.cover_url] : shop.logo_url ? [shop.logo_url] : undefined },
    other: { "theme-color": brandColor(shop.branding) },
  };
}

export default async function PublicBookingPage({ params, searchParams }: Props) {
  const [{ slug }, { preview }] = await Promise.all([params, searchParams]);
  const page = await load(slug.toLowerCase());
  if (!page) notFound();
  if (page.status !== "ok") return <Unavailable name={page.name} logo={page.logo_url} />;
  // membros sempre veem o aviso de pré-visualização; visitantes nunca
  const isPreview = page.is_member && (preview === "1" || !page.accepting);
  return <BookingFlow data={page} preview={isPreview} />;
}
