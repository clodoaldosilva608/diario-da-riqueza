import 'server-only';

/**
 * Portal de Notícias — PERSISTÊNCIA (SERVER-ONLY). ⚠️ Nunca importar em client.
 *
 * Estratégia pensada para os DOIS ambientes do projeto:
 *
 * 1. Preview / self-host (sandbox): filesystem gravável → avisos em
 *    data/announcements.json e binários em data/media/<chave>. Persiste de
 *    verdade entre requisições e restarts.
 *
 * 2. Vercel (serverless): filesystem de leitura — qualquer WRITE lança
 *    EROFS. Aqui a store degrada com honestidade: mantém o estado EM
 *    MEMÓRIA na instância quente (funciona enquanto a lambda viver),
 *    sinaliza persistenceMode() === 'memoria' para o painel exibir o
 *    aviso, e a LEITURA continua funcionando do arquivo semeado no repo.
 *    (Para persistência real na Vercel o próximo passo é plugar um
 *    KV/Blob externo — a interface desta store já isola isso.)
 *
 * Formato do JSON: um array de Announcement (src/lib/announcements.ts).
 * Binários NUNCA inline: saveMedia() grava o arquivo e devolve a chave.
 */

import { randomUUID } from 'crypto';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import type { Announcement, AnnouncementMedia } from './announcements';
import { ANNOUNCEMENT_LIMITS } from './announcements';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'announcements.json');
const MEDIA_DIR = path.join(DATA_DIR, 'media');

/* ============================== CACHE / FALLBACK ============================== */

/** Cache do último estado conhecido (fonte p/ fallback de escrita). */
let memoryList: Announcement[] = [];
/** Binários recebidos quando o disco não está gravável (Vercel). */
const memoryMedia = new Map<string, { buf: Buffer; ext: string }>();
/** True quando pelo menos um write caiu na memória nesta instância. */
let memoryOnly = false;

/** Onde os avisos estão sendo gravados agora. */
export function persistenceMode(): 'arquivo' | 'memoria' {
  return memoryOnly ? 'memoria' : 'arquivo';
}

/* ============================== LISTA ============================== */

/** Converte um valor desconhecido em Announcement válido (ou descarta). */
function coerce(raw: unknown): Announcement | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max: number): string =>
    typeof v === 'string' ? v.slice(0, max) : '';
  const media = (v: unknown): AnnouncementMedia | undefined => {
    if (!v || typeof v !== 'object') return undefined;
    const m = v as Record<string, unknown>;
    if (typeof m.key !== 'string' || !m.key) return undefined;
    return {
      key: m.key.slice(0, 120),
      name: typeof m.name === 'string' ? m.name.slice(0, 120) : 'arquivo',
      size: typeof m.size === 'number' && m.size >= 0 ? m.size : 0,
    };
  };
  const title = str(r.title, ANNOUNCEMENT_LIMITS.title);
  const message = str(r.message, ANNOUNCEMENT_LIMITS.message);
  if (!title && !message) return null;
  return {
    id: typeof r.id === 'string' && r.id ? r.id.slice(0, 64) : randomUUID(),
    title,
    message,
    linkUrl: str(r.linkUrl, 500) || undefined,
    linkLabel: str(r.linkLabel, ANNOUNCEMENT_LIMITS.linkLabel) || undefined,
    image: media(r.image),
    file: media(r.file),
    active: r.active === true,
    createdAt: str(r.createdAt, 40) || new Date().toISOString(),
    updatedAt: str(r.updatedAt, 40) || new Date().toISOString(),
  };
}

/**
 * Lista todos os avisos (ativos + rascunhos), mais recentes primeiro.
 * Nunca lança: disco ausente → []; JSON corrompido → []; erro grave →
 * cache em memória da instância.
 */
export async function listAnnouncements(): Promise<Announcement[]> {
  try {
    const raw = await readFile(DB_FILE, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('formato inválido');
    memoryList = parsed
      .map(coerce)
      .filter((a): a is Announcement => a !== null);
    return memoryList;
  } catch {
    // ENOENT (primeira execução) ou ambiente de leitura com falha:
    // devolve o que houver em memória (começa vazio).
    return memoryList;
  }
}

/** Persiste a lista inteira (read-modify-write por ação do painel). */
export async function saveAnnouncements(list: Announcement[]): Promise<void> {
  const trimmed = list.slice(0, ANNOUNCEMENT_LIMITS.maxItems);
  memoryList = trimmed;
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DB_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
  } catch {
    // Vercel (EROFS) ou qualquer falha de disco: segue em memória.
    memoryOnly = true;
  }
}

/* ============================== MÍDIA ============================== */

const EXT_RE = /^[a-z0-9]{1,8}$/;

/** Nome seguro para o arquivo em disco: UUID + extensão validada. */
function mediaFileName(ext: string): string {
  const safe = EXT_RE.test(ext) ? ext : 'bin';
  return `${randomUUID()}.${safe}`;
}

/** Chave → caminho (a chave já é o nome do arquivo; valida antes). */
function mediaPath(key: string): string | null {
  if (!/^[a-f0-9-]{36}\.[a-z0-9]{1,8}$/i.test(key)) return null;
  return path.join(MEDIA_DIR, path.basename(key));
}

/**
 * Grava um binário de mídia e devolve a chave pública dele.
 * Sem disco gravável → guarda em memória e sinaliza degradação.
 */
export async function saveMedia(
  buf: Buffer,
  ext: string,
): Promise<string> {
  const fileName = mediaFileName(ext);
  try {
    await mkdir(MEDIA_DIR, { recursive: true });
    await writeFile(path.join(MEDIA_DIR, fileName), buf);
    return fileName;
  } catch {
    memoryOnly = true;
    memoryMedia.set(fileName, { buf, ext: EXT_RE.test(ext) ? ext : 'bin' });
    return fileName;
  }
}

/** Remove um binário (arquivo + fallback em memória). Erros ignorados. */
export async function deleteMedia(key: string): Promise<void> {
  memoryMedia.delete(key);
  const p = mediaPath(key);
  if (!p) return;
  try {
    await rm(p, { force: true });
  } catch {
    /* arquivo já ausente / disco somente leitura: ok */
  }
}

/**
 * Lê um binário por chave. Ordem: arquivo em disco → fallback em memória.
 * Devolve null quando a chave é inválida ou o binário sumiu.
 */
export async function getMedia(
  key: string,
): Promise<{ buf: Buffer; ext: string } | null> {
  const p = mediaPath(key);
  if (!p) return null;
  const ext = key.split('.').pop() ?? 'bin';
  try {
    const buf = await readFile(p);
    return { buf, ext };
  } catch {
    const mem = memoryMedia.get(key);
    return mem ?? null;
  }
}
