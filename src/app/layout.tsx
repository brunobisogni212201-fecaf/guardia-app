import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AntiScreenshot } from "@/components/AntiScreenshot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Guardiã — Prevenção da Violência Doméstica",
  description: "Tecnologia de IA para detecção de padrões de violência. Gratuito, sigiloso e anônimo. O silêncio não protege — a informação sim.",
  keywords: ["violência doméstica", "feminicídio", "proteção", "mulher", "prevenção"],
  openGraph: {
    title: "Guardiã — Prevenção da Violência Doméstica",
    description: "Analise conversas com IA para detectar padrões de abuso. Gratuito e sigiloso.",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AntiScreenshot />
        {children}
      </body>
    </html>
  );
}
