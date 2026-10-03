import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isPushConfigured, sendToMany, type PushSubscriptionLike } from '@/lib/push';
import { listSubscriptions, removeSubscription } from '@/lib/push-store';
import { ADMIN_COOKIE, verifySessionValue } from '@/lib/admin-auth';
import { messageOfTheDay } from '@/lib/motivation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET|POST /api/push/cron — lembrete diário (20:00 BRT / 23:00 UTC).
 *
 * Disparado pelo Vercel Cron (vercel.json → crons) com header
 * `Authorization: Bearer $CRON_SECRET`, OU manualmente por um operador
 * logado no /admin (cookie dr_admin). Dupla porta = flexibilidade local.
 */

function authorized(req: Request, cookieValue: string | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth === `Bearer ${secret}`) return true;
  }
  return verifySessionValue(cookieValue);
}

async function handle(req: Request) {
  const store = await cookies();
  if (!authorized(req, store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, error: 'não autorizado' }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'VAPID ausente — push desativado (fail-closed).' },
      { status: 503 },
    );
  }

  const subs = (await listSubscriptions()) as PushSubscriptionLike[];
  if (subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, expired: 0, total: 0 });
  }

  const { sent, expiredEndpoints } = await sendToMany(subs, {
    title: 'Diário da Riqueza 💛',
    body: `${messageOfTheDay(new Date())} — registre o dia e mantenha a sequência!`,
    url: '/',
    tag: 'dr-reminder',
  });

  // Higiene: remove inscrições mortas (404/410) para não estourar o limite
  for (const endpoint of expiredEndpoints) {
    await removeSubscription(endpoint);
  }

  return NextResponse.json({
    ok: true,
    sent,
    expired: expiredEndpoints.length,
    total: subs.length,
  });
}

export const GET = handle;
export const POST = handle;
