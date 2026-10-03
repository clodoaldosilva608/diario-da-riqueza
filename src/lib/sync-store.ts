import 'server-only';

/**
 * STORE dos cofres de sincronização — 3 camadas (KV → arquivo → memória).
 *
 * O servidor NUNCA vê a senha: guarda apenas {vaultId → envelope cifrado}.
 * Limite: 5 MB por blob, 2.000 cofres. vaultId é a chave (DR-XXXX-…).
 */

import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { kvGet, kvSet, isKVConfigured } from './kv';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'sync-vaults.json');
const KV_KEY_PREFIX = 'dr:sync:vault:';
const MAX_BLOB_BYTES = 5 * 1024 * 1024;
const MAX_VAULTS = 2000;

export interface SyncVault {
  vaultId: string;
  iv: string;
  blob: string;
  updatedAt: string;
}

let memoryMap = new Map<string, SyncVault>();
let memoryOnly = false;

export function syncPersistenceMode(): 'kv' | 'arquivo' | 'memoria' {
  if (isKVConfigured()) return 'kv';
  return memoryOnly ? 'memoria' : 'arquivo';
}

function validVaultId(id: string): boolean {
  return /^DR-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/.test(id);
}

export function validEnvelopeSize(envelope: { iv: string; blob: string }): boolean {
  try {
    return (
      Buffer.byteLength(envelope.iv, 'utf8') <= 64 &&
      Buffer.byteLength(envelope.blob, 'utf8') <= MAX_BLOB_BYTES
    );
  } catch {
    return false;
  }
}

async function loadMap(): Promise<Map<string, SyncVault>> {
  if (isKVConfigured()) {
    // No modo KV cada cofre é uma chave própria — o mapa em disco é fallback
    // apenas quando não há KV. Para listagem evitamos SCAN (não exposto aqui).
    return memoryMap;
  }
  try {
    const raw = await readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, SyncVault>;
    const map = new Map<string, SyncVault>();
    for (const [k, v] of Object.entries(parsed)) {
      if (validVaultId(k) && typeof v?.blob === 'string') map.set(k, v);
    }
    memoryMap = map;
    return map;
  } catch {
    return memoryMap;
  }
}

export async function getVault(vaultId: string): Promise<SyncVault | null> {
  const id = vaultId.trim().toUpperCase();
  if (!validVaultId(id)) return null;
  if (isKVConfigured()) {
    const raw = await kvGet(KV_KEY_PREFIX + id);
    if (raw) {
      try {
        const v = JSON.parse(raw) as SyncVault;
        if (typeof v.blob === 'string') return v;
      } catch {
        /* cai para memória */
      }
    }
    return memoryMap.get(id) ?? null;
  }
  const map = await loadMap();
  return map.get(id) ?? null;
}

export async function putVault(vaultId: string, iv: string, blob: string): Promise<boolean> {
  const id = vaultId.trim().toUpperCase();
  if (!validVaultId(id) || !validEnvelopeSize({ iv, blob })) return false;
  const vault: SyncVault = { vaultId: id, iv, blob, updatedAt: new Date().toISOString() };
  memoryMap.set(id, vault);
  if (isKVConfigured()) {
    const ok = await kvSet(KV_KEY_PREFIX + id, JSON.stringify(vault));
    if (ok) return true;
  }
  try {
    const map = await loadMap();
    map.set(id, vault);
    // Limite duro de cofres (mais antigos fora)
    if (map.size > MAX_VAULTS) {
      const sorted = [...map.values()].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      for (const old of sorted.slice(0, map.size - MAX_VAULTS)) map.delete(old.vaultId);
    }
    const obj: Record<string, SyncVault> = {};
    for (const [k, v] of map) obj[k] = v;
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(FILE, JSON.stringify(obj), 'utf8');
    return true;
  } catch {
    memoryOnly = true;
    return true; // dados em memória desta instância
  }
}
