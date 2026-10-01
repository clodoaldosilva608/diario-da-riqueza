import type { NextConfig } from "next";

/**
 * Headers de segurança aplicados a TODAS as rotas (deploy na Vercel).
 *
 * Porquê de cada um:
 * - CSP: limita a origem de scripts/estilos/imagens/conexões. 'unsafe-inline'
 *   e 'unsafe-eval' em script-src são necessários para o runtime do Next.js
 *   (hidratação inline) — o próximo passo de endurecimento é nonce por
 *   requisição (middleware). Nenhuma origem externa é usada pelo app
 *   (fontes next/font são self-hosted; QR Pix é PNG estático local).
 * - frame-ancestors 'none' + X-Frame-Options DENY: impede clickjacking
 *   (o app não deve ser embutido em iframes de terceiros).
 * - nosniff: impede MIME-sniffing de respostas.
 * - Referrer-Policy: não vaza URL (e query strings) para sites externos
 *   abertos nos botões (WhatsApp, site pessoal).
 * - Permissions-Policy: desliga APIs sensíveis que o app não usa.
 * - HSTS: força HTTPS (a Vercel já envia; reforçado aqui para self-host).
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
