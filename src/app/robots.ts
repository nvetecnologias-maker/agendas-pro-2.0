import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://agendas-pro.vercel.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/painel", "/super-admin", "/onboarding", "/auth", "/api", "/design-system"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
