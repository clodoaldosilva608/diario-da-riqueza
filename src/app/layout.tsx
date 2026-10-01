import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { ThemeBoot } from "@/components/pwa/ThemeBoot";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://diariodariqueza.vercel.app"),
  title: "Diário da Riqueza — Organize metas, orçamento e hábitos com consistência",
  description:
    "Diário da Riqueza: organize suas metas, orçamento, estudos e hábitos em uma ferramenta simples, gratuita e focada em consistência.",
  applicationName: "Diário da Riqueza",
  keywords: [
    "diário da riqueza",
    "metas pessoais",
    "metas financeiras",
    "orçamento pessoal",
    "hábitos",
    "organização pessoal",
    "diário diário",
    "funciona offline",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://diariodariqueza.vercel.app",
    siteName: "Diário da Riqueza",
    title: "Diário da Riqueza — Transforme seus objetivos em uma prática diária",
    description:
      "Organize metas, orçamento, estudos e hábitos para acompanhar sua evolução com clareza e consistência. Gratuito, offline e com seus dados no seu dispositivo.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diário da Riqueza — Transforme seus objetivos em uma prática diária",
    description:
      "Organize metas, orçamento, estudos e hábitos em uma ferramenta simples, gratuita e focada em consistência.",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Diário da Riqueza",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeBoot />
        {children}
        <Toaster position="top-center" richColors />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
