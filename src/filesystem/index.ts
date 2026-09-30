/**
 * Diário da Riqueza — File System Access API
 *
 * Cria a pasta `Diario_da_Riqueza` no dispositivo do usuário com subpastas
 * /Backups, /Exportacoes, /Anexos e /Impressoes. Persiste o DirectoryHandle
 * no IndexedDB para reconexão automática em visitas futuras.
 *
 * Fallback: navegadores sem suporte (Firefox/Safari) recebem downloads
 * automáticos com mensagem clara.
 */

import { db } from '@/db';
import type { SaveDestination } from '@/types';

/* ============================== TIPOS MÍNIMOS DA API ============================== */

export interface DirHandle {
  kind: 'directory';
  name: string;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<DirHandle>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileHandleLike>;
  values(): AsyncIterable<DirHandle | FileHandleLike>;
  queryPermission?(opts?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission?(opts?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  removeEntry?(name: string, opts?: { recursive?: boolean }): Promise<void>;
}

export interface FileHandleLike {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
  createWritable(opts?: { keepExistingData?: boolean }): Promise<WritableLike>;
}

export interface WritableLike {
  write(data: BufferSource | Blob | string): Promise<void>;
  close(): Promise<void>;
}

type PickerWindow = Window & {
  showDirectoryPicker?: (opts?: {
    id?: string;
    mode?: 'read' | 'readwrite';
    startIn?: string;
  }) => Promise<DirHandle>;
  showOpenFilePicker?: (opts?: {
    multiple?: boolean;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  }) => Promise<Array<FileHandleLike>>;
};

/* ============================== CONSTANTES ============================== */

export const ROOT_FOLDER_NAME = 'Diario_da_Riqueza';

export const SUBFOLDERS = ['Backups', 'Exportacoes', 'Anexos', 'Impressoes'] as const;
export type SubFolderName = (typeof SUBFOLDERS)[number];

/* ============================== DETECÇÃO / PERMISSÃO ============================== */

/** A API está disponível neste navegador? (Chrome/Edge/Opera desktop e Android) */
export function isFSAvailable(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/** Verifica (e opcionalmente solicita) permissão de leitura/escrita no handle */
export async function ensurePermission(
  handle: DirHandle,
  request = false,
): Promise<boolean> {
  try {
    const opts = { mode: 'readwrite' as const };
    if (handle.queryPermission && (await handle.queryPermission(opts)) === 'granted') {
      return true;
    }
    if (request && handle.requestPermission) {
      return (await handle.requestPermission(opts)) === 'granted';
    }
    return false;
  } catch {
    return false;
  }
}

/* ============================== CONEXÃO / ESTRUTURA ============================== */

/** Garante que a raiz e todas as subpastas existam */
export async function ensureFolderStructure(root: DirHandle): Promise<void> {
  for (const sub of SUBFOLDERS) {
    await root.getDirectoryHandle(sub, { create: true });
  }
}

export interface ConnectResult {
  ok: boolean;
  folderName?: string;
  error?: string;
}

/**
 * Abre o seletor de pasta, cria a estrutura `Diario_da_Riqueza` (ou usa a
 * pasta escolhida criando as subpastas nela) e persiste o handle.
 * DEVE ser chamado a partir de um gesto do usuário (clique).
 */
export async function connectRootFolder(): Promise<ConnectResult> {
  if (!isFSAvailable()) {
    return {
      ok: false,
      error:
        'Seu navegador não suporta pastas reais. O app usará downloads automáticos + armazenamento interno.',
    };
  }
  try {
    const picker = (window as PickerWindow).showDirectoryPicker!;
    const root = await picker({
      id: 'diario-da-riqueza',
      mode: 'readwrite',
      startIn: 'documents',
    });
    await ensureFolderStructure(root);
    await db.handles.put({
      key: 'root',
      handle: root,
      name: root.name,
      savedAt: new Date().toISOString(),
    });
    return { ok: true, folderName: root.name };
  } catch (err: unknown) {
    // AbortError = usuário cancelou
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, error: 'cancelled' };
    }
    return { ok: false, error: 'Não foi possível conectar a pasta. Tente novamente.' };
  }
}

/** Recupera o handle persistido e valida permissões (sem diálogo) */
export async function getStoredRoot(): Promise<DirHandle | null> {
  try {
    const stored = await db.handles.get('root');
    if (!stored) return null;
    const handle = stored.handle as DirHandle;
    if (!(await ensurePermission(handle))) return null;
    return handle;
  } catch {
    return null;
  }
}

/** Solicita permissão novamente (requer gesto do usuário) */
export async function reconnectStoredRoot(): Promise<DirHandle | null> {
  try {
    const stored = await db.handles.get('root');
    if (!stored) return null;
    const handle = stored.handle as DirHandle;
    if (await ensurePermission(handle, true)) return handle;
    return null;
  } catch {
    return null;
  }
}

/** Esquece a pasta conectada */
export async function forgetRootFolder(): Promise<void> {
  await db.handles.delete('root');
}

/* ============================== ESCRITA DE ARQUIVOS ============================== */

/** Salva um arquivo em uma subpasta. Fallback automático: download. */
export async function saveToFolder(
  sub: SubFolderName,
  filename: string,
  data: Blob | string,
  mime = 'application/octet-stream',
): Promise<SaveDestination> {
  const root = await getStoredRoot();
  if (root) {
    try {
      const subDir = await root.getDirectoryHandle(sub, { create: true });
      const fileHandle = await subDir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
      await writable.write(blob);
      await writable.close();
      return 'folder';
    } catch {
      // cai para download
    }
  }
  downloadFile(filename, data, mime);
  return 'download';
}

/** Download clássico (fallback universal) */
export function downloadFile(
  filename: string,
  data: Blob | string | Uint8Array,
  mime = 'application/octet-stream',
): void {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Lista arquivos de backup disponíveis na pasta /Backups */
export async function listBackupFiles(): Promise<Array<{ name: string; handle: FileHandleLike }>> {
  const root = await getStoredRoot();
  if (!root) return [];
  try {
    const backupDir = await root.getDirectoryHandle('Backups', { create: false });
    const files: Array<{ name: string; handle: FileHandleLike }> = [];
    for await (const entry of backupDir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        files.push({ name: entry.name, handle: entry as FileHandleLike });
      }
    }
    return files.sort((a, b) => b.name.localeCompare(a.name));
  } catch {
    return [];
  }
}

/** Lê o conteúdo de um arquivo a partir de um handle (mínimo: getFile) */
export async function readBackupFile(
  handle: { getFile(): Promise<File> } | FileHandleLike,
): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

/** Abre seletor de arquivo único (para restaurar backup manual) */
export async function pickJsonFile(): Promise<string | null> {
  const w = window as PickerWindow;
  if (w.showOpenFilePicker) {
    try {
      const [handle] = await w.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'Backup JSON', accept: { 'application/json': ['.json'] } }],
      });
      return readBackupFile(handle);
    } catch {
      return null;
    }
  }
  // Fallback: input file invisível
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? await file.text() : null);
    };
    input.click();
  });
}

/** Nome de arquivo padronizado para exportações/backups */
export function buildFileName(kind: string, ext: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  return `${kind}_${stamp}.${ext}`;
}
