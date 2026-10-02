import { NextResponse } from 'next/server';
import { isPushConfigured, type PushSubscriptionLike } from '@/lib/push';
import { upsertSubscription } from '@/lib/push-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/push/subscribe — registra a inscrição deste navegador.
 * Corpo: subscription PushSubscriptionJSON do browser. Sem PII — só o
 * endpoint opaco do serviço de push + chaves públicas efêmeras.
 */
export async function POST(req: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Push não configurado no servidor.' },
      { status: 503 },
    );
  }
  try {
    const body = (await req.json()) as { subscription?: PushSubscriptionLike };
    const sub = body.subscription;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return NextResponse.json({ ok: false, error: 'Inscrição inválida.' }, { status: 400 });
    }
    const total = await upsertSubscription(sub);
    return NextResponse.json({ ok: true, total });
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo inválido.' }, { status: 400 });
  }
}
