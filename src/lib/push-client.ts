'use client';

/**
 * push-client — fluxo de inscrição Web Push no navegador.
 *
 * Cadeia do lembrete diário:
 * permissão → pushManager.subscribe(VAPID) → POST /api/push/subscribe →
 * cron da Vercel (23:00 UTC / 20:00 BRT) → Service Worker exibe.
 *
 * Degradação honesta: se o navegador não suporta (iOS < 16.4, Firefox
 * sem permissão de SW push…) ou o servidor não tem VAPID configurado,
 * as funções retornam estado explicativo — a UI orienta o usuário.
 */

export interface PushStatus {
  supported: boolean;
  configured: boolean;
  publicKey: string | null;
  permission: NotificationPermission | 'unknown';
  subscribed: boolean;
  /** Motivo legível do estado atual (para a UI) */
  note?: string;
}

const SUB_STORAGE = 'dr_push_subscription';

/** base64url → Uint8Array (applicationServerKey do VAPID) */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Estado completo para a UI de Configurações */
export async function getPushStatus(): Promise<PushStatus> {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  if (!supported) {
    return {
      supported: false,
      configured: false,
      publicKey: null,
      permission: 'unknown',
      subscribed: false,
      note: 'Este navegador não suporta notificações push da web.',
    };
  }

  try {
    const res = await fetch('/api/push/status', { cache: 'no-store' });
    const server = (await res.json()) as {
      configured: boolean;
      publicKey: string | null;
    };
    const sub = await currentSubscription();
    return {
      supported: true,
      configured: server.configured,
      publicKey: server.publicKey,
      permission: Notification.permission,
      subscribed: Boolean(sub),
      note: !server.configured
        ? 'O servidor ainda não tem as chaves VAPID configuradas (env VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY na Vercel).'
        : undefined,
    };
  } catch {
    return {
      supported: true,
      configured: false,
      publicKey: null,
      permission: Notification.permission,
      subscribed: false,
      note: 'Não foi possível consultar o servidor de push agora.',
    };
  }
}

/** Ativa: permissão + inscrição + registro no servidor */
export async function enablePush(): Promise<{ ok: boolean; message: string }> {
  const status = await getPushStatus();
  if (!status.supported) return { ok: false, message: status.note ?? 'Navegador sem suporte.' };
  if (!status.configured || !status.publicKey) {
    return { ok: false, message: status.note ?? 'Push indisponível no servidor.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      ok: false,
      message: 'Permissão negada — libere notificações nas configurações do navegador.',
    };
  }

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(status.publicKey) as BufferSource,
  });

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!res.ok) {
    return { ok: false, message: 'Falha ao registrar a inscrição no servidor.' };
  }
  try {
    localStorage.setItem(SUB_STORAGE, JSON.stringify(sub.toJSON()));
  } catch {
    /* storage opcional */
  }
  return { ok: true, message: 'Lembretes push ativados! Você receberá o aviso diário às 20h.' };
}

/** Desativa: cancela no browser e no servidor */
export async function disablePush(): Promise<{ ok: boolean; message: string }> {
  const sub = await currentSubscription();
  if (sub) {
    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    } catch {
      /* segue para o unsubscribe local */
    }
    await sub.unsubscribe();
  }
  try {
    localStorage.removeItem(SUB_STORAGE);
  } catch {
    /* opcional */
  }
  return { ok: true, message: 'Lembretes push desativados neste dispositivo.' };
}

/** Envia notificação de teste para ESTA inscrição */
export async function sendTestPush(): Promise<{ ok: boolean; message: string }> {
  const sub = await currentSubscription();
  if (!sub) return { ok: false, message: 'Nenhuma inscrição ativa neste navegador.' };
  const res = await fetch('/api/push/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  const json = (await res.json()) as { ok: boolean; error?: string };
  return json.ok
    ? { ok: true, message: 'Notificação de teste enviada! Verifique o sistema operacional.' }
    : { ok: false, message: json.error ?? 'Falha no envio de teste.' };
}
