import 'server-only';

/**
 * STORE de inscrições push — 3 camadas com degradação honesta:
 * 1. KV REST (Upstash/Vercel KV) quando as env vars existem → persistência
 *    REAL na Vercel (recomendado para produção);
 * 2. arquivo data/push-subscriptions.json (preview/self-host);
 * 3. memória da instância (última linha, com aviso no painel).
 *
 * Cada inscrição: { endpoint, keys:{p256dh,auth}, createdAt }. Endpoint é a
 * chave natural (único por navegador). Limite duro de 5.000 inscrições.
 */

import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { kvGet, kvSet, isKVConfigured } from './kv';
import type { PushSubscriptionLike } from './push';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'push-subscriptions.json');
const KV_KEY = 'dr:push:subscriptions';
const MAX_SUBS = 5000;

interface StoredSub extends PushSubscriptionLike {
  createdAt: string;
}

let memoryList: StoredSub[] = [];
let memoryOnly = false;

/** Onde as inscrições estão sendo gravadas agora (diagnóstico p/ admin) */
export function pushPersistenceMode(): 'kv' | 'arquivo' | 'memoria' {
  if (isKVConfigured()) return 'kv';
  return memoryOnly ? 'memoria' : 'arquivo';
}

/** Coerção defensiva de inscrição desconhecida */
function coerce(raw: unknown): StoredSub | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const endpoint = typeof r.endpoint === 'string' ? r.endpoint : '';
  const keys = r.keys as Record<string, unknown> | undefined;
  if (!endpoint.startsWith('https://') || endpoint.length > 500) return null;
  if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return null;
  if (keys.p256dh.length > 300 || keys.auth.length > 300) return null;
  return {
    endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
  };
}

async function loadList(): Promise<StoredSub[]> {
  // 1) KV
  if (isKVConfigured()) {
    const raw = await kvGet(KV_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown[];
        memoryList = parsed.map(coerce).filter((s): s is StoredSub => s !== null);
        return memoryList;
      } catch {
        /* JSON corrompido no KV → segue para arquivo/memória */
      }
    }
  }
  // 2) Arquivo
  try {
    const raw = await readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown[];
    memoryList = parsed.map(coerce).filter((s): s is StoredSub => s !== null);
    return memoryList;
  } catch {
    return memoryList;
  }
}

async function persist(list: StoredSub[]): Promise<void> {
  memoryList = list;
  const json = JSON.stringify(list);
  if (isKVConfigured()) {
    const ok = await kvSet(KV_KEY, json);
    if (ok) return;
  }
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(FILE, json, 'utf8');
  } catch {
    memoryOnly = true; // Vercel EROFS → memória
  }
}

export async function listSubscriptions(): Promise<StoredSub[]> {
  return loadList();
}

export async function countSubscriptions(): Promise<number> {
  return (await loadList()).length;
}

/** Insere/atualiza inscrição (endpoint = chave). Devolve o total atual. */
export async function upsertSubscription(sub: PushSubscriptionLike): Promise<number> {
  const list = await loadList();
  const existing = list.findIndex((s) => s.endpoint === sub.endpoint);
  const entry: StoredSub = { ...sub, createdAt: new Date().toISOString() };
  if (existing >= 0) list[existing] = entry;
  else list.push(entry);
  await persist(list.slice(-MAX_SUBS));
  return list.length;
}

/** Remove por endpoint (unsubscripção ou 404/410 do serviço de push) */
export async function removeSubscription(endpoint: string): Promise<void> {
  const list = await loadList();
  await persist(list.filter((s) => s.endpoint !== endpoint));
}
