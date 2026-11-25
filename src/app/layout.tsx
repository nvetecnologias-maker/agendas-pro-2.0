import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");
const DESCRIPTION =
  "Sistema de agendamento online e gestão para barbearias: clientes marcam horário pelo celular e você controla profissionais, serviços, clientes e financeiro em um só painel.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Agendas Pro",
  title: { default: "Agendas Pro · Agendamento online e gestão para barbearias", template: "%s" },
  description: DESCRIPTION,
  keywords: ["agendamento online", "barbearia", "agenda para barbeiro", "sistema para barbearia", "gestão de barbearia"],
  authors: [{ name: "Agendas Pro" }],
  creator: "Agendas Pro",
  publisher: "Agendas Pro",
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Agendas Pro",
    title: "Agendas Pro · Agendamento online e gestão para barbearias",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Agendas Pro · Agendamento online e gestão para barbearias",
    description: DESCRIPTION,
  },
  appleWebApp: { title: "Agendas Pro", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#030B20",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}>{children}</body>
    </html>
  );
}
