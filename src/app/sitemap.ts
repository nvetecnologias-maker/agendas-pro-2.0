import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://agendas-pro.vercel.app").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/cadastro", "/entrar", "/termos-de-uso", "/politica-de-privacidade", "/suporte"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
}
