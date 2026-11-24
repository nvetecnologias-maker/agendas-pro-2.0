import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Agendas Pro · Gestão premium para barbearias", template: "%s" },
  description:
    "Organize seus horários, gerencie seus profissionais e acompanhe seus resultados em uma única plataforma.",
};

export const viewport: Viewport = { themeColor: "#030B20", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}>{children}</body>
    </html>
  );
}
