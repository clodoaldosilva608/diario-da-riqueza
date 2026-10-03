import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isPushConfigured, sendToMany, type PushSubscriptionLike } from '@/lib/push';
import { listSubscriptions, removeSubscription, pushPersistenceMode } from '@/lib/push-store';
import { ADMIN_COOKIE, verifySessionValue } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/push/send — envio manual do operador (cookie dr_admin).
 *
 * Corpos aceitos:
 * - {title, body, url?}: mensagem livre
 * - {}: reenvia o aviso ATIVO do Portal de Notícias (se existir)
 *
 * Retorna estatísticas + modo de persistência (kv/arquivo/memória) para o
 * painel mostrar avisos honestos sobre alcance real.
 */

async function isAdmin(cookieValue: string | undefined): Promise<boolean> {
  return verifySessionValue(cookieValue);
}

export async function POST(req: Request) {
  const store = await cookies();
  if (!(await isAdmin(store.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, error: 'não autorizado' }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Push não configurado: adicione VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nas env vars da Vercel.',
      },
      { status: 503 },
    );
  }

  let title = '';
  let body = '';
  let url = '/';
  try {
    const raw = (await req.json()) as {
      title?: string;
      body?: string;
      url?: string;
    };
    title = (raw.title ?? '').trim().slice(0, 80);
    body = (raw.body ?? '').trim().slice(0, 220);
    if (raw.url && /^\/[a-z0-9\-/]*$/i.test(raw.url)) url = raw.url;
  } catch {
    /* corpo opcional — vazio = usar aviso ativo */
  }

  // Sem título no corpo → usa o aviso ativo do Portal de Notícias
  if (!title) {
    const { listAnnouncements } = await import('@/lib/announcements-store');
    const active = (await listAnnouncements()).find((a) => a.active);
    if (active) {
      title = active.title.slice(0, 80);
      body = active.message.slice(0, 220);
      url = active.linkUrl?.startsWith('/') ? active.linkUrl : '/';
    } else {
      return NextResponse.json(
        { ok: false, error: 'Sem mensagem e sem aviso ativo no Portal de Notícias.' },
        { status: 400 },
      );
    }
  }

  const subs = (await listSubscriptions()) as PushSubscriptionLike[];
  const { sent, expiredEndpoints } = await sendToMany(subs, {
    title,
    body,
    url,
    tag: 'dr-admin',
  });
  for (const endpoint of expiredEndpoints) {
    await removeSubscription(endpoint);
  }

  return NextResponse.json({
    ok: true,
    sent,
    expired: expiredEndpoints.length,
    total: subs.length,
    persistence: pushPersistenceMode(),
  });
}
