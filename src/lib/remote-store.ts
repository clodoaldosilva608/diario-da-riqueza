import 'server-only';

/**
 * Armazenamento remoto unificado (server-side) — 2 backends, degradação honesta:
 * 1. Upstash / Vercel KV via REST (KV_REST_API_URL + KV_REST_API_TOKEN);
 * 2. Vercel Blob (BLOB_READ_WRITE_TOKEN) — first-party, sem conta externa.
 *
 * Complementa src/lib/kv.ts: quando o KV não está configurado, o Blob assume;
 * sem ambos, os stores caem para arquivo → memória (comportamento anterior).
 *
 * Nota: os backends são independentes — dados gravados no Blob só aparecem no
 * KV se migrados manualmente. A troca de backend é transparente para o app
 * porque cada leitura sempre vai direto ao backend ativo (sem cache longo).
 *
 * Segurança do Blob (store público): sync guarda apenas envelope CIFRADO no
 * cliente; push guarda endpoint + chaves efêmeras (inúteis sem a VAPID private,
 * que nunca sai do servidor). A URL do blob é não-ameritável (subdomínio
 * aleatório por store) e a listagem exige o token de escrita.
 */

import { head, put } from '@vercel/blob';
import { kvGet, kvSet, isKVConfigured } from './kv';

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export type RemoteMode = 'kv' | 'blob' | 'nenhum';

export function remoteMode(): RemoteMode {
  if (isKVConfigured()) return 'kv';
  if (BLOB_TOKEN) return 'blob';
  return 'nenhum';
}

/** Pathnames do Blob só aceitam [a-zA-Z0-9/_-] — chaves de KV usam ':'; converte. */
function blobPath(key: string): string {
  return key.replace(/:/g, '/');
}

/** GET key → string | null. null também quando nenhum backend configurado. */
export async function remoteGet(key: string): Promise<string | null> {
  if (isKVConfigured()) return kvGet(key);
  if (BLOB_TOKEN) {
    try {
      const meta = await head(blobPath(key));
      if (!meta) return null;
      const res = await fetch(meta.downloadUrl ?? meta.url, { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }
  return null;
}

/** SET key value. Retorna false se não havia backend ou a gravação falhou. */
export async function remoteSet(key: string, value: string): Promise<boolean> {
  if (isKVConfigured()) return kvSet(key, value);
  if (BLOB_TOKEN) {
    try {
      await put(blobPath(key), value, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
