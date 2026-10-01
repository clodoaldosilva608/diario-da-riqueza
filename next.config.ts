import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" é para execução self-hosted local; na Vercel o runtime próprio
  // assume o build (e .next/standalone não é usado).
  output: process.env.VERCEL ? undefined : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async redirects() {
    return [
      {
        // Atalho estável para a apresentação (landing page) — funciona também
        // para usuários já onboardados, que normalmente entram direto no app.
        source: "/landing",
        destination: "/?apresentacao=1",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
