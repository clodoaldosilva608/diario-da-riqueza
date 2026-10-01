/**
 * POST /api/cakto/webhook — recebe eventos da plataforma Cakto.
 *
 * Autenticação: token compartilhado na query string (?key=CAKTO_WEBHOOK_TOKEN)
 * comparado em tempo constante. A Cakto não assina criptograficamente os
 * webhooks; o segredo na URL + HTTPS + shape mínimo são a defesa prática
 * (e o handler é idempotente/sem efeitos financeiros).
 *
 * Fase 1 (sem banco): valida, registra no log do servidor e responde 200
 * rápido — o Mural dos Fundadores lê o estado VIVO da API da Cakto, não
 * depende do webhook. O webhook existe para auditoria e para a Fase 2
 * (banco + moderação de nomes + e-mails de agradecimento).
 *
 * Fase 2 (TODO): persistir eventos em banco; disparar recompensas.
 */

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { looksLikeCaktoEvent } from '@/lib/cakto';

export const dynamic = 'force-dynamic';

function tokenValid(received: string | null): boolean {
  const expected = process.env.CAKTO_WEBHOOK_TOKEN;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!tokenValid(url.searchParams.get('key'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!looksLikeCaktoEvent(payload)) {
    return NextResponse.json({ error: 'invalid_shape' }, { status: 422 });
  }

  const p = payload as { event?: string; data?: Record<string, unknown> };
  const refId = p.data?.refId ?? p.data?.id ?? '';
  // Log estruturado (visível nos logs da Vercel) — sem PII além do refId
  console.log('[cakto-webhook]', JSON.stringify({
    event: p.event, refId, at: new Date().toISOString(),
  }));

  // Sempre 200: evita reenvios com backoff pela Cakto
  return NextResponse.json({ received: true });
}

export async function GET() {
  // Diagnóstico simples (sem expor nada sensível)
  return NextResponse.json({ ok: true, configured: Boolean(process.env.CAKTO_WEBHOOK_TOKEN) });
}
