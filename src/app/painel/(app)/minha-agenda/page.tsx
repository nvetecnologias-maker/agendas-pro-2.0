import type { Metadata } from "next";
import QRCode from "qrcode";
import { requirePanelAction } from "@/lib/panel/context";
import { getSiteUrl } from "@/lib/supabase/env";
import { MyPageClient } from "@/components/panel/my-page-client";

export const metadata: Metadata = { title: "Minha agenda · Agendas Pro" };

export default async function MyPage() {
  const panel = await requirePanelAction("public_page.manage");
  const { shop, supabase } = panel;
  const url = `${getSiteUrl()}/${shop.slug}`;
  const qrOpts = { margin: 1, color: { dark: "#030B20", light: "#FFFFFF" }, errorCorrectionLevel: "M" as const };
  const [qrSvg, qrPng, svc] = await Promise.all([
    QRCode.toString(url, { ...qrOpts, type: "svg" }),
    QRCode.toDataURL(url, { ...qrOpts, width: 1024 }),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("barbershop_id", shop.id).eq("is_active", true),
  ]);
  return (
    <MyPageClient
      url={url}
      slug={shop.slug}
      shopName={shop.name}
      published={!!shop.published_at}
      qrSvg={qrSvg}
      qrPng={qrPng}
      hasServices={(svc.count ?? 0) > 0}
      canOperate={panel.access === "full" || panel.access === "grace"}
    />
  );
}
