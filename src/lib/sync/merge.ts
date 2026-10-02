/**
 * Merge do sync multi-dispositivo.
 *
 * Estratégia (v1 profissional, sem CRDT):
 * - Tabelas sincronizáveis por `uid` (uid estável entre dispositivos):
 *   last-write-wins por `updatedAt`;
 * - entries: identidade por `date` (índice único &date do Dexie);
 * - dreamDeposits: vínculo por `dreamUid` (+ createdAt como desempate);
 *   depósitos cujo sonho não existe no estado mesclado são descartados;
 * - tombstones (deletedLog): união — registro apagado em qualquer lado
 *   permanece apagado (sem ressurreição);
 * - xpEvents: mesclados por fingerprint (type+date+amount+descrição) para
 *   somar cada ação uma única vez;
 * - profile: mais recente `updatedAt` vence (singleton);
 * - attachments/backups: ficam locais (binários pesados / específicos).
 */

import type {
  AchievementRecord,
  BudgetEntry,
  DeletedLogEntry,
  DiaryEntry,
  Dream,
  DreamDeposit,
  EntryTemplate,
  Goal,
  Profile,
  Study,
  XPEvent,
} from '@/types';

export interface MergeStats {
  added: number;
  updated: number;
  keptLocal: number;
  removedByTombstone: number;
  droppedDeposits: number;
}

/** Estrutura mínima que o merge precisa (FullDump com campos v4 opcionais) */
export interface MergeableDump {
  version: number;
  exportedAt: string;
  profile?: Profile[];
  dreams?: Dream[];
  goals?: Goal[];
  budget?: BudgetEntry[];
  studies?: Study[];
  entries?: DiaryEntry[];
  templates?: EntryTemplate[];
  xpEvents?: XPEvent[];
  achievements?: AchievementRecord[];
  deletedLog?: DeletedLogEntry[];
  dreamDeposits?: DreamDeposit[];
}

interface UidRow {
  uid?: string;
  updatedAt?: string;
}

function newer(a?: string, b?: string): boolean {
  return (a ?? '') > (b ?? '');
}

/** Merge last-write-wins por uid com bloqueio por tombstone */
function mergeByUid<T extends UidRow>(
  table: string,
  localRows: T[] | undefined,
  incomingRows: T[] | undefined,
  tombMap: Map<string, DeletedLogEntry>,
  stats: MergeStats,
): T[] {
  const map = new Map<string, T>();
  for (const row of localRows ?? []) {
    if (row.uid) map.set(row.uid, row);
  }
  for (const row of incomingRows ?? []) {
    if (!row.uid) continue;
    const cur = map.get(row.uid);
    if (!cur) {
      if (tombMap.has(`${table}:${row.uid}`)) {
        stats.removedByTombstone++;
        continue;
      }
      map.set(row.uid, row);
      stats.added++;
    } else if (newer(row.updatedAt, cur.updatedAt)) {
      map.set(row.uid, row);
      stats.updated++;
    } else {
      stats.keptLocal++;
    }
  }
  for (const key of tombMap.keys()) {
    if (!key.startsWith(`${table}:`)) continue;
    const uid = key.slice(table.length + 1);
    if (map.has(uid)) {
      map.delete(uid);
      stats.removedByTombstone++;
    }
  }
  return [...map.values()];
}

export function mergeDumps(
  local: MergeableDump,
  incoming: MergeableDump,
): { merged: MergeableDump; stats: MergeStats } {
  const stats: MergeStats = {
    added: 0,
    updated: 0,
    keptLocal: 0,
    removedByTombstone: 0,
    droppedDeposits: 0,
  };

  /* Tombstones: união das duas listas (mais recente vence) */
  const tombMap = new Map<string, DeletedLogEntry>();
  for (const t of [...(local.deletedLog ?? []), ...(incoming.deletedLog ?? [])]) {
    const prev = tombMap.get(t.key);
    if (!prev || newer(t.deletedAt, prev.deletedAt)) tombMap.set(t.key, t);
  }

  /* Perfis (singleton): updatedAt mais novo vence */
  const profile: Profile[] | undefined =
    local.profile && incoming.profile
      ? newer(incoming.profile[0]?.updatedAt, local.profile[0]?.updatedAt)
        ? incoming.profile
        : local.profile
      : local.profile ?? incoming.profile;

  /* Tabelas por uid */
  const dreams = mergeByUid<Dream>('dreams', local.dreams, incoming.dreams, tombMap, stats);
  const goals = mergeByUid<Goal>('goals', local.goals, incoming.goals, tombMap, stats);
  const budget = mergeByUid<BudgetEntry>('budget', local.budget, incoming.budget, tombMap, stats);
  const studies = mergeByUid<Study>('studies', local.studies, incoming.studies, tombMap, stats);
  const templates = mergeByUid<EntryTemplate>('templates', local.templates, incoming.templates, tombMap, stats);

  /* entries — identidade por 'date' */
  const entriesMap = new Map<string, DiaryEntry>();
  for (const row of local.entries ?? []) entriesMap.set(row.date, row);
  for (const row of incoming.entries ?? []) {
    const cur = entriesMap.get(row.date);
    if (!cur) {
      if (row.uid && tombMap.has(`entries:${row.uid}`)) {
        stats.removedByTombstone++;
        continue;
      }
      entriesMap.set(row.date, row);
      stats.added++;
    } else if (newer(row.updatedAt, cur.updatedAt)) {
      entriesMap.set(row.date, row);
      stats.updated++;
    } else {
      stats.keptLocal++;
    }
  }
  const entries = [...entriesMap.values()];

  /* dreamDeposits — por dreamUid + createdAt; órfãos descartados */
  const mergedDreamUids = new Set(dreams.map((d) => d.uid));
  const depMap = new Map<string, DreamDeposit>();
  const depKey = (d: DreamDeposit) => `${d.dreamUid ?? d.dreamId}:${d.createdAt}`;
  for (const d of local.dreamDeposits ?? []) depMap.set(depKey(d), d);
  for (const d of incoming.dreamDeposits ?? []) {
    if (!depMap.has(depKey(d))) {
      depMap.set(depKey(d), d);
      stats.added++;
    }
  }
  const allDeposits = [...depMap.values()];
  const dreamDeposits = allDeposits.filter((d) =>
    d.dreamUid ? mergedDreamUids.has(d.dreamUid) : true, // sem uid → resolvido no apply local
  );
  stats.droppedDeposits = allDeposits.length - dreamDeposits.length;

  /* xpEvents — fingerprint de ação (append-only) */
  const xpMap = new Map<string, XPEvent>();
  const xpKey = (e: XPEvent) => `${e.type}:${e.date}:${e.amount}:${e.description ?? ''}`;
  for (const e of local.xpEvents ?? []) xpMap.set(xpKey(e), e);
  for (const e of incoming.xpEvents ?? []) {
    if (!xpMap.has(xpKey(e))) {
      xpMap.set(xpKey(e), e);
      stats.added++;
    }
  }
  const xpEvents = [...xpMap.values()];

  /* achievements — por key (idempotente) */
  const achMap = new Map<string, AchievementRecord>();
  for (const a of local.achievements ?? []) achMap.set(a.key, a);
  for (const a of incoming.achievements ?? []) if (!achMap.has(a.key)) achMap.set(a.key, a);
  const achievements = [...achMap.values()];

  const merged: MergeableDump = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    dreams,
    goals,
    budget,
    studies,
    templates,
    entries,
    xpEvents,
    achievements,
    deletedLog: [...tombMap.values()],
    dreamDeposits,
  };

  return { merged, stats };
}
