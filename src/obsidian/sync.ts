/**
 * Diário da Riqueza — Integração Obsidian (browser-side).
 *
 * Fase 1 — Exportar vault .zip (universal, inclusive mobile).
 * Fase 2 — Conectar a pasta do vault (File System Access) e espelhar os
 *          arquivos; edições de texto feitas no Obsidian (Reflexões / Em
 *          prática) são importadas de volta.
 * Fase 3 — Estado completo em `_dados/diario-da-riqueza.json` dentro do
 *          vault + merge LWW/tombstones ⇒ sincroniza entre dispositivos
 *          com o veículo de sync que o usuário já usa (iCloud, Syncthing,
 *          Obsidian Sync, Git…).
 *
 * O app NUNCA escreve fora da pasta `Diario_da_Riqueza/` do vault.
 */

import { db, ensureUids } from '@/db';
import { saveToFolder, buildFileName, downloadFile, isFSAvailable } from '@/filesystem';
import type { DirHandle, FileHandleLike, SaveDestination } from '@/filesystem';
import type { SyncTable } from '@/db';
import type { DiaryEntry } from '@/types';
import { buildVaultFiles, parseStateFile, VAULT_NS, DATA_FILE, INDEX_FILE, VAULT_DIRS, type VaultFile, type VaultSnapshot } from './vault';
import { computeMerge, type MergePlan } from './merge';
import { splitFrontmatter, extractSection } from './markdown';
import { getDeviceId } from './crypto';

const VAULT_HANDLE_KEY = 'vault';
const LAST_SYNC_KEY = 'dr_vault_last_sync';

export interface VaultSyncResult {
  at: string;
  files: number;
  merge: MergePlan['stats'] | null;
  mdImported: number;
}

/* ============================== CONEXÃO ============================== */

export function isVaultSupported(): boolean {
  return isFSAvailable();
}

/** Abre o seletor, cria a estrutura do vault e persiste o handle. Requer clique. */
export async function connectVault(): Promise<{ ok: boolean; folderName?: string; error?: string }> {
  if (!isVaultSupported()) {
    return { ok: false, error: 'Este navegador não suporta pastas reais. Use Chrome/Edge desktop (a exportação .zip funciona em qualquer navegador).' };
  }
  try {
    const picker = (window as unknown as {
      showDirectoryPicker?: (opts?: { id?: string; mode?: 'read' | 'readwrite'; startIn?: string }) => Promise<DirHandle>;
    }).showDirectoryPicker!;
    const root = await picker({ id: 'dr-vault', mode: 'readwrite', startIn: 'documents' });
    // Namespace do app dentro do vault escolhido
    await root.getDirectoryHandle(VAULT_NS, { create: true });
    await db.handles.put({
      key: VAULT_HANDLE_KEY,
      handle: root,
      name: root.name,
      savedAt: new Date().toISOString(),
    });
    return { ok: true, folderName: root.name };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return { ok: false, error: 'cancelled' };
    return { ok: false, error: 'Não foi possível conectar ao vault. Tente novamente.' };
  }
}

/** Handle persistido com permissão já concedida (sem diálogo) */
export async function getStoredVault(): Promise<DirHandle | null> {
  try {
    const stored = await db.handles.get(VAULT_HANDLE_KEY);
    if (!stored) return null;
    const handle = stored.handle as DirHandle;
    const perm = await handle.queryPermission?.({ mode: 'readwrite' });
    if (perm && perm !== 'granted') return null;
    return handle;
  } catch {
    return null;
  }
}

/** Solicita permissão de novo (requer gesto) */
export async function reconnectVault(): Promise<DirHandle | null> {
  try {
    const stored = await db.handles.get(VAULT_HANDLE_KEY);
    if (!stored) return null;
    const handle = stored.handle as DirHandle;
    const perm = await handle.queryPermission?.({ mode: 'readwrite' });
    if (perm === 'granted') return handle;
    const granted = await handle.requestPermission?.({ mode: 'readwrite' });
    return granted === 'granted' ? handle : null;
  } catch {
    return null;
  }
}

export async function forgetVault(): Promise<void> {
  await db.handles.delete(VAULT_HANDLE_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
}

export function lastVaultSync(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

/* ============================== SNAPSHOT ============================== */

export async function collectSnapshot(): Promise<VaultSnapshot> {
  const [profile, entries, budget, goals, dreams, studies, xpEvents, achievements, templates, deletedLog] =
    await Promise.all([
      db.profile.get('profile'),
      db.entries.toArray(),
      db.budget.toArray(),
      db.goals.toArray(),
      db.dreams.toArray(),
      db.studies.toArray(),
      db.xpEvents.toArray(),
      db.achievements.toArray(),
      db.templates.toArray(),
      db.deletedLog.toArray(),
    ]);
  return {
    profile,
    entries,
    budget,
    goals,
    dreams,
    studies,
    xpEvents,
    achievements,
    templates,
    deletedLog,
    deviceId: getDeviceId(),
    geradoEm: new Date().toISOString(),
  };
}

/* ============================== APLICAR MERGE ============================== */

export async function applyMerge(plan: MergePlan): Promise<void> {
  await db.transaction(
    'rw',
    [db.entries, db.goals, db.budget, db.studies, db.dreams, db.templates, db.xpEvents, db.achievements, db.deletedLog, db.profile],
    async () => {
      if (plan.adds.entries.length) await db.entries.bulkAdd(plan.adds.entries);
      if (plan.adds.goals.length) await db.goals.bulkAdd(plan.adds.goals);
      if (plan.adds.budget.length) await db.budget.bulkAdd(plan.adds.budget);
      if (plan.adds.studies.length) await db.studies.bulkAdd(plan.adds.studies);
      if (plan.adds.dreams.length) await db.dreams.bulkAdd(plan.adds.dreams);
      if (plan.adds.templates.length) await db.templates.bulkAdd(plan.adds.templates);

      if (plan.updates.entries.length) await db.entries.bulkPut(plan.updates.entries);
      if (plan.updates.goals.length) await db.goals.bulkPut(plan.updates.goals);
      if (plan.updates.budget.length) await db.budget.bulkPut(plan.updates.budget);
      if (plan.updates.studies.length) await db.studies.bulkPut(plan.updates.studies);
      if (plan.updates.dreams.length) await db.dreams.bulkPut(plan.updates.dreams);
      if (plan.updates.templates.length) await db.templates.bulkPut(plan.updates.templates);

      for (const del of plan.deletes) {
        const table: Record<SyncTable, { delete: (id: number) => Promise<void> }> = {
          entries: db.entries, goals: db.goals, budget: db.budget,
          studies: db.studies, dreams: db.dreams, templates: db.templates,
        };
        await table[del.table].delete(del.id);
      }
      if (plan.deletions.length) await db.deletedLog.bulkPut(plan.deletions);
      if (plan.xpAdds.length) await db.xpEvents.bulkAdd(plan.xpAdds);
      if (plan.achievements.length) await db.achievements.bulkPut(plan.achievements);
      if (plan.profile) await db.profile.put(plan.profile);
    },
  );
}

/* ============================== IMPORT DE EDIÇÕES DO OBSIDIAN ============================== */

const PLACEHOLDER = /^_—_$/;

/**
 * Lê os arquivos `01-Diario/*.md` editados no Obsidian (mtime > último sync)
 * e importa as seções de texto livre (Reflexões / Em prática) para o app.
 * Outros campos são autoridade do app — nunca sobrescritos pelo vault.
 */
async function importDiaryEdits(
  root: DirHandle,
  sinceMs: number,
): Promise<number> {
  const ns = await root.getDirectoryHandle(VAULT_NS, { create: true });
  let diarioDir: DirHandle;
  try {
    diarioDir = await ns.getDirectoryHandle(VAULT_DIRS.diario, { create: false });
  } catch {
    return 0;
  }
  const local = await db.entries.toArray();
  const byUid = new Map(local.filter((e) => e.uid).map((e) => [e.uid!, e]));

  let imported = 0;
  for await (const entry of diarioDir.values()) {
    if (entry.kind !== 'file' || !entry.name.endsWith('.md')) continue;
    const handle = entry as FileHandleLike;
    const file = await handle.getFile();
    if (sinceMs > 0 && file.lastModified <= sinceMs) continue; // sem edição nova

    const raw = await file.text();
    const { fm, body } = splitFrontmatter(raw);
    const uid = typeof fm.uid === 'string' ? fm.uid : '';
    const editedAt = typeof fm['editado-em'] === 'string' ? (fm['editado-em'] as string) : '';
    const target = uid ? byUid.get(uid) : undefined;
    if (!target || !target.id) continue;

    const newer = editedAt && editedAt > (target.updatedAt ?? target.createdAt);
    if (!newer) continue;

    const thoughts = extractSection(body, 'Reflexões') ?? target.thoughts ?? '';
    const practice = extractSection(body, 'Em prática') ?? target.practice ?? '';
    const cleanThoughts = PLACEHOLDER.test(thoughts.trim()) ? '' : thoughts.trim();
    const cleanPractice = PLACEHOLDER.test(practice.trim()) ? target.practice : practice.trim();
    const changed = cleanThoughts !== (target.thoughts ?? '') || cleanPractice !== target.practice;
    if (!changed) continue;

    await db.entries.update(target.id, {
      thoughts: cleanThoughts,
      practice: cleanPractice,
      updatedAt: editedAt || new Date().toISOString(),
    });
    imported++;
  }
  return imported;
}

/* ============================== ESCRITA DO VAULT ============================== */

async function putText(dir: DirHandle, name: string, content: string): Promise<void> {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(content);
  await w.close();
}

/** Espelha os arquivos no vault + limpa órfãos via índice + grava índice novo */
async function writeVault(root: DirHandle, files: VaultFile[]): Promise<void> {
  const ns = await root.getDirectoryHandle(VAULT_NS, { create: true });

  // 1. Lê índice anterior e remove arquivos órfãos (registros apagados no app)
  let previous: string[] = [];
  try {
    const idxHandle = await ns.getFileHandle(INDEX_FILE, { create: false });
    const prevJson = await (await idxHandle.getFile()).text();
    const parsed = JSON.parse(prevJson) as { arquivos?: string[] };
    previous = parsed.arquivos ?? [];
  } catch {
    /* primeira sincronização — nada a limpar */
  }
  const current = new Set(files.map((f) => f.path));
  for (const stale of previous) {
    if (current.has(stale)) continue;
    const [dirName, ...rest] = stale.split('/');
    if (rest.length === 0) continue;
    try {
      const sub = await ns.getDirectoryHandle(dirName, { create: false });
      await sub.removeEntry(rest.join('/'));
    } catch {
      /* já não existe — ok */
    }
  }

  // 2. Garante pastas e grava arquivos (sequencial — handles não gostam de corrida)
  const dirs = new Map<string, DirHandle>();
  const dirOf = async (name: string): Promise<DirHandle> => {
    if (!dirs.has(name)) dirs.set(name, await ns.getDirectoryHandle(name, { create: true }));
    return dirs.get(name)!;
  };
  for (const f of files) {
    const slash = f.path.indexOf('/');
    if (slash === -1) {
      await putText(ns, f.path, f.content);
    } else {
      const dir = await dirOf(f.path.slice(0, slash));
      await putText(dir, f.path.slice(slash + 1), f.content);
    }
  }

  // 3. Índice novo
  await putText(ns, INDEX_FILE, JSON.stringify({ geradoEm: new Date().toISOString(), arquivos: [...current] }, null, 2));
}

async function readDataFile(root: DirHandle): Promise<ReturnType<typeof parseStateFile>> {
  try {
    const ns = await root.getDirectoryHandle(VAULT_NS, { create: true });
    const fh = await ns.getFileHandle(DATA_FILE, { create: false });
    const json = await (await fh.getFile()).text();
    return parseStateFile(json);
  } catch {
    return null;
  }
}

/* ============================== FLUXO PRINCIPAL ============================== */

/**
 * Sync completo: merge do estado remoto → importa edições do Obsidian →
 * regenera e espelha os arquivos. Idempotente (LWW por timestamp).
 */
export async function syncVaultNow(): Promise<VaultSyncResult> {
  await ensureUids();
  const root = await getStoredVault();
  if (!root) {
    const reconnected = await reconnectVault();
    if (!reconnected) throw new Error('Vault não conectado — clique em "Conectar vault" primeiro.');
    return syncVaultWithRoot(reconnected);
  }
  return syncVaultWithRoot(root);
}

async function syncVaultWithRoot(root: DirHandle): Promise<VaultSyncResult> {
  const lastMs = parseInt(localStorage.getItem(LAST_SYNC_KEY) ?? '0', 10) || 0;

  // 1. Estado remoto (JSON) → merge para o banco local
  let mergeStats: VaultSyncResult['merge'] = null;
  const remote = await readDataFile(root);
  if (remote && remote.deviceId !== getDeviceId()) {
    const local = await collectSnapshot();
    const plan = computeMerge(local, remote);
    await applyMerge(plan);
    mergeStats = plan.stats;
  }

  // 2. Edições de texto feitas diretamente no Obsidian (arquivos .md)
  const mdImported = await importDiaryEdits(root, lastMs);

  // 3. Regenera e espelha a partir do estado mesclado
  const snapshot = await collectSnapshot();
  const files = buildVaultFiles(snapshot);
  await writeVault(root, files);

  const at = new Date().toISOString();
  localStorage.setItem(LAST_SYNC_KEY, at);
  return { at, files: files.length, merge: mergeStats, mdImported };
}

/* ============================== FASE 1 — ZIP ============================== */

const LEIA_ME = `# 📓 Diário da Riqueza — como usar este vault no Obsidian

Este pacote foi exportado pelo app **Diário da Riqueza** (PWA offline-first).

## Instalação (30 segundos)

1. Abra o **Obsidian**.
2. Escolha (ou crie) o seu **vault**.
3. Copie a pasta **${VAULT_NS}/** deste .zip para dentro da pasta do vault.
4. Pronto: abra **${VAULT_NS}/00-Dashboard.md** e explore pelos links.

## O que tem aqui

- **00-Dashboard.md** — resumo vivo do seu diário (XP, metas, streak, orçamento)
- **01-Diario/** — um arquivo por dia, com frontmatter pesquisável
- **02-Metas/** — cada meta com barra de progresso
- **03-Biblioteca/** — estudos iniciados no app ("O que aprendi")
- **04-Sonhos/** — sua lista de sonhos
- **05-Orcamento/** — um arquivo por mês
- **_dados/diario-da-riqueza.json** — estado completo do app (sync)

## Sincronizar entre dispositivos

O estado do app vive dentro de **${VAULT_NS}/_dados/**. Se o seu vault já
sincroniza (iCloud, OneDrive, Syncthing, Obsidian Sync, Git…), os dados do
app viajam junto. No app, conecte a pasta do vault em
**Configurações → Integração Obsidian** e toque em **Sincronizar agora**.

## Escrevendo no Obsidian

Nas entradas do diário, as seções **Reflexões** e **Em prática** são suas —
edite à vontade no Obsidian e elas voltam para o app na próxima sincronização.

> Nota: anexos (fotos/recibos) ficam apenas no dispositivo — não viajam no vault.
`;

/** Fase 1 — gera o vault completo e devolve como .zip (funciona em qualquer navegador) */
export async function exportVaultZip(): Promise<{ destination: SaveDestination; filename: string; files: number }> {
  await ensureUids();
  const snapshot = await collectSnapshot();
  const files = buildVaultFiles(snapshot);

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const ns = zip.folder(VAULT_NS);
  if (!ns) throw new Error('Falha ao montar o pacote.');
  for (const f of files) ns.file(f.path, f.content);
  zip.file('LEIA-ME - Como usar no Obsidian.md', LEIA_ME);

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const filename = buildFileName('DR_Vault_Obsidian', 'zip');

  let destination: SaveDestination = 'download';
  try {
    destination = await saveToFolder('Exportacoes', filename, blob, 'application/zip');
  } catch {
    downloadFile(filename, blob, 'application/zip');
    destination = 'download';
  }
  return { destination, filename, files: files.length };
}

/* ============================== AUTO-SYNC ============================== */

/**
 * Auto-sync silencioso no boot: só roda se o usuário ligou a opção, o vault
 * está conectado e a permissão ainda está concedida (sem diálogos).
 */
export async function maybeAutoVaultSync(): Promise<VaultSyncResult | null> {
  try {
    const root = await getStoredVault();
    if (!root) return null;
    return await syncVaultWithRoot(root);
  } catch {
    return null; // auto-sync nunca quebra a abertura do app
  }
}
