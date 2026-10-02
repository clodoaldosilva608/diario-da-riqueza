import 'server-only';

/**
 * KV simples via REST (Upstash / Vercel KV) — SEM dependências extras.
 *
 * Na Vercel o filesystem é somente-leitura; o par KV_REST_API_URL +
 * KV_REST_API_TOKEN (criados pela integração Vercel KV / Upstash ou
 * manualmente no dashboard da Upstash) dá persistência real às features
 * server-side (push subscriptions, cofres de sync, avisos do painel).
 *
 * Sem as env vars configuradas, isKVConfigured() === false e cada store
 * usa seu fallback local (arquivo → memória) com degradação honesta.
 */

const REST_URL = process.env.KV_REST_API_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN;

export function isKVConfigured(): boolean {
  return Boolean(REST_URL && REST_TOKEN);
}

interface UpstashResponse<T> {
  result: T;
  error?: string;
}

async function call<T>(command: string, ...args: string[]): Promise<T | null> {
  if (!isKVConfigured()) return null;
  const url = `${REST_URL!.replace(/\/$/, '')}/${command}${args.length ? '/' + args.map(encodeURIComponent).join('/') : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REST_TOKEN!}`,
      'Content-Type': 'text/plain',
    },
    body: args.length > 1 ? args[1] : undefined,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`KV ${command} falhou: ${res.status}`);
  const json = (await res.json()) as UpstashResponse<T>;
  if (json.error) throw new Error(`KV ${command}: ${json.error}`);
  return json.result;
}

/** GET key → string | null. null também quando KV não configurado. */
export async function kvGet(key: string): Promise<string | null> {
  try {
    return await call<string>('get', key);
  } catch {
    return null;
  }
}

/** SET key value (sempre grava; retorna false se caiu no erro silencioso) */
export async function kvSet(key: string, value: string): Promise<boolean> {
  try {
    await call('set', key, value);
    return true;
  } catch {
    return false;
  }
}

export async function kvDel(key: string): Promise<void> {
  try {
    await call('del', key);
  } catch {
    /* silencioso */
  }
}
