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
};

export default nextConfig;
