/**
 * GET /api/founders — Mural dos Fundadores (público, read-only).
 *
 * Fonte da verdade: assinaturas da Cakto com product = Apoiador Fundador.
 * A regra anti-inadimplência é aplicada AQUI (server-side), nunca no cliente:
 * - active → nome no mural
 * - late   → nome no mural durante a carência de 7 dias (FOUNDER_GRACE_MS)
 * - paused/canceled/expired/inactive → fora
 *
 * Privacidade: só o nome FORMATADO (ex.: "Clodoaldo S."), mês de entrada e
 * nº da recorrência saem daqui. Nada de e-mail, documento ou valor pago.
 *
 * Cache: memória 5 min (stale 30 min) + CDN via Cache-Control
 * (s-maxage=300, stale-while-revalidate=1800). Credenciais Cakto ficam
 * server-side; esta rota nunca as expõe.
 */

import { NextResponse } from 'next/server';
import { caktoConfigured, getFounders } from '@/lib/cakto-server';
import { FOUNDER_GRACE_MS } from '@/lib/cakto';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!caktoConfigured()) {
    // App funciona normalmente; mural mostra estado vazio + CTA
    return NextResponse.json(
      { configured: false, graceDays: 7, founders: [] },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  try {
    const founders = await getFounders(Date.now());
    return NextResponse.json(
      { configured: true, graceDays: FOUNDER_GRACE_MS / 86_400_000, founders },
      {
        headers: {
          'Cache-Control':
            'public, s-maxage=300, stale-while-revalidate=1800',
        },
      },
    );
  } catch {
    // Cakto indisponível: resposta honesta (não fingir lista vazia definitiva)
    return NextResponse.json(
      { configured: true, unavailable: true, founders: [] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
