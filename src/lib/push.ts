import 'server-only';

/**
 * PUSH — camada server-only de Web Push (VAPID) via `web-push`.
 *
 * Fail-closed e degradação honesta:
 * - Sem VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY em env → isPushConfigured()
 *   === false e toda a UI de push fica oculta/explicativa (o app funciona
 *   100% igual a antes).
 * - O assunto (VAPID_SUBJECT) segue a recomendação do protocolo.
 */

import webpush from 'web-push';

export interface PushSubscriptionLike {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY,
  );
}

export function getVapidPublicKey(): string | null {
  return isPushConfigured() ? process.env.VAPID_PUBLIC_KEY! : null;
}

let configured = false;
function ensureConfigured(): boolean {
  if (!isPushConfigured()) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:contato@diariodariqueza.vercel.app',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Rota aberta ao tocar (default '/') */
  url?: string;
  tag?: string;
}

/** Envia para UMA subscription. 404/410 → remove do array e devolve false. */
export async function sendToSubscription(
  sub: PushSubscriptionLike,
  payload: PushPayload,
): Promise<{ ok: boolean; expired: boolean }> {
  if (!ensureConfigured()) return { ok: false, expired: false };
  try {
    await webpush.sendNotification(
      sub as unknown as Parameters<typeof webpush.sendNotification>[0],
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 },
    );
    return { ok: true, expired: false };
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 404 || e.statusCode === 410) {
      return { ok: false, expired: true };
    }
    return { ok: false, expired: false };
  }
}

/** Envia para várias; devolve estatísticas + endpoints expirados (404/410) */
export async function sendToMany(
  subs: PushSubscriptionLike[],
  payload: PushPayload,
): Promise<{ sent: number; expiredEndpoints: string[] }> {
  let sent = 0;
  const expiredEndpoints: string[] = [];
  for (const sub of subs) {
    const r = await sendToSubscription(sub, payload);
    if (r.ok) sent++;
    if (r.expired) expiredEndpoints.push(sub.endpoint);
  }
  return { sent, expiredEndpoints };
}
