/**
 * Diário da Riqueza — Motor de MERGE para sync multi-dispositivo (PURO).
 *
 * Regras (determinísticas e testáveis):
 * 1. Identidade = `uid` estável (UUID). O `id` local do Dexie NUNCA viaja.
 * 2. Last-write-wins por `updatedAt ?? createdAt` por registro.
 * 3. Deleções = tombstones. Tombstone mais novo que o registro → apaga.
 *    Registro editado depois do tombstone → sobrevive (recriado em outro
 *    dispositivo é caso legítimo).
 * 4. Mesma data no diário com uids diferentes = conflito real de usuário:
 *    vence a edição mais nova, contabilizado em `conflicts`.
 * 5. xpEvents não têm uid — dedupe por chave natural (tipo|data|descrição)
 *    para não inflar XP ao mesclar dispositivos.
 * 6. Conquistas: primeira unlockedAt vence (nunca "desbloqueia de novo").
 */

import type {
  Profile, DiaryEntry, Goal, BudgetEntry, Study, Dream,
  EntryTemplate, XPEvent, AchievementRecord, DeletedLogEntry,
} from '@/types';
import type { SyncTable } from '@/db';
import type { SyncStateFile } from './vault';

/* ============================== TIPOS ============================== */

export interface LocalTables {
  profile?: Profile;
  entries: DiaryEntry[];
  goals: Goal[];
  budget: BudgetEntry[];
  studies: Study[];
  dreams: Dream[];
  templates: EntryTemplate[];
  xpEvents: XPEvent[];
  achievements: AchievementRecord[];
  deletedLog: DeletedLogEntry[];
}

export interface MergeStats {
  added: number;
  updated: number;
  removed: number;
  conflicts: number;
  skipped: number;
  xpAdded: number;
  profileUpdated: boolean;
}

export interface MergePlan {
  adds: {
    entries: DiaryEntry[];
    goals: Goal[];
    budget: BudgetEntry[];
    studies: Study[];
    dreams: Dream[];
    templates: EntryTemplate[];
  };
  updates: {
    entries: DiaryEntry[];
    goals: Goal[];
    budget: BudgetEntry[];
    studies: Study[];
    dreams: Dream[];
    templates: EntryTemplate[];
  };
  /** Remoções locais vencidas por tombstone remoto */
  deletes: Array<{ table: SyncTable; id: number }>;
  /** Tombstones resultantes (união local ∪ remoto, deletedAt máximo) */
  deletions: DeletedLogEntry[];
  xpAdds: XPEvent[];
  achievements: AchievementRecord[];
  profile?: Profile;
  stats: MergeStats;
}

/* ============================== HELPERS ============================== */

type WithMeta = { uid?: string; id?: number; createdAt: string; updatedAt?: string };

const ts = (r: WithMeta): string => r.updatedAt ?? r.createdAt ?? '';
const stripId = <T extends { id?: number }>(r: T): T => {
  const copy = { ...r };
  delete copy.id;
  return copy;
};

const xpKey = (e: XPEvent) => `${e.type}|${e.date}|${e.description ?? ''}`;

/* ============================== MERGE ============================== */

interface TablePlan<T extends WithMeta> {
  adds: T[];
  updates: T[];
  removedIds: number[];
  added: number;
  updated: number;
  removed: number;
  conflicts: number;
  skipped: number;
}

function mergeTable<T extends WithMeta>(
  local: T[],
  remote: T[],
  tombstones: Map<string, string>, // uid → deletedAt
  naturalKey?: (r: T) => string,
): TablePlan<T> {
  const plan: TablePlan<T> = {
    adds: [], updates: [], removedIds: [], added: 0, updated: 0, removed: 0, conflicts: 0, skipped: 0,
  };
  const localByUid = new Map<string, T>();
  const localByNatural = new Map<string, T>();
  for (const r of local) {
    if (r.uid) localByUid.set(r.uid, r);
    if (naturalKey) localByNatural.set(naturalKey(r), r);
  }

  for (const rr of remote) {
    if (!rr.uid) { plan.skipped++; continue; }

    // Tombstone remoto/local mais novo que o registro remoto? → morto, ignore.
    const remoteDeath = tombstones.get(rr.uid);
    if (remoteDeath && remoteDeath > ts(rr)) { plan.skipped++; continue; }

    const match = localByUid.get(rr.uid);
    if (!match) {
      // Colisão de chave natural com uid diferente = mesmo "lugar" criado em
      // 2 dispositivos (ex.: mesmo dia do diário). Conflito: mais novo vence.
      const natural = naturalKey ? localByNatural.get(naturalKey(rr)) : undefined;
      if (natural && natural.uid !== rr.uid) {
        plan.conflicts++;
        if (ts(rr) > ts(natural)) {
          plan.updates.push({ ...rr, id: natural.id } as T);
          plan.updated++;
        } else {
          plan.skipped++;
        }
        continue;
      }
      const localDeath = tombstones.get(rr.uid);
      if (localDeath && localDeath > ts(rr)) { plan.skipped++; continue; }
      plan.adds.push(stripId(rr));
      plan.added++;
    } else if (ts(rr) > ts(match)) {
      plan.updates.push({ ...rr, id: match.id } as T);
      plan.updated++;
    } else {
      plan.skipped++;
    }
  }

  // Tombstones vencendo registros locais
  for (const r of local) {
    if (!r.uid || r.id === undefined) continue;
    const death = tombstones.get(r.uid);
    if (death && death > ts(r)) {
      plan.removedIds.push(r.id);
      plan.removed++;
    }
  }
  return plan;
}

/** Calcula o plano de mescla local ← remote (PURO — não toca no Dexie) */
export function computeMerge(local: LocalTables, remote: SyncStateFile): MergePlan {
  const d = remote.dados;

  // 1. União dos tombstones (deletedAt máximo por uid)
  const tombMap = new Map<string, DeletedLogEntry>();
  for (const t of [...(local.deletedLog ?? []), ...(d.deletions ?? [])]) {
    if (!t?.uid || !t?.table) continue;
    const prev = tombMap.get(t.key);
    if (!prev || t.deletedAt > prev.deletedAt) tombMap.set(t.key, t);
  }
  const tombstones = new Map<string, string>();
  for (const t of tombMap.values()) tombstones.set(`${t.table}:${t.uid}`, t.deletedAt);
  const tombFor = (table: SyncTable): Map<string, string> => {
    const m = new Map<string, string>();
    for (const [key, at] of tombstones) {
      if (key.startsWith(`${table}:`)) m.set(key.slice(table.length + 1), at);
    }
    return m;
  };

  const pEntries = mergeTable<DiaryEntry>(local.entries, d.entries ?? [], tombFor('entries'), (e) => `d:${e.date}`);
  const pGoals = mergeTable<Goal>(local.goals, d.goals ?? [], tombFor('goals'));
  const pBudget = mergeTable<BudgetEntry>(local.budget, d.budget ?? [], tombFor('budget'));
  const pStudies = mergeTable<Study>(local.studies, d.studies ?? [], tombFor('studies'));
  const pDreams = mergeTable<Dream>(local.dreams, d.dreams ?? [], tombFor('dreams'));
  const pTemplates = mergeTable<EntryTemplate>(local.templates, d.templates ?? [], tombFor('templates'));

  // 2. XP: dedupe por chave natural — só acrescenta o que falta
  const localXp = new Set(local.xpEvents.map(xpKey));
  const xpAdds: XPEvent[] = [];
  for (const e of d.xpEvents ?? []) {
    if (!localXp.has(xpKey(e))) {
      xpAdds.push(stripId(e));
    }
  }

  // 3. Conquistas: primeira vez vence
  const localAch = new Set(local.achievements.map((a) => a.key));
  const achievements = (d.achievements ?? []).filter((a) => a?.key && !localAch.has(a.key));

  // 4. Perfil: LWW
  const remoteProfile = (d.profile ?? [])[0];
  let profile: Profile | undefined;
  let profileUpdated = false;
  if (remoteProfile) {
    const localProfile = local.profile;
    if (!localProfile || (remoteProfile.updatedAt ?? '') > (localProfile.updatedAt ?? '')) {
      profile = { ...remoteProfile, id: 'profile' };
      profileUpdated = true;
    }
  }

  const stats: MergeStats = {
    added: pEntries.added + pGoals.added + pBudget.added + pStudies.added + pDreams.added + pTemplates.added,
    updated: pEntries.updated + pGoals.updated + pBudget.updated + pStudies.updated + pDreams.updated + pTemplates.updated,
    removed: pEntries.removed + pGoals.removed + pBudget.removed + pStudies.removed + pDreams.removed + pTemplates.removed,
    conflicts: pEntries.conflicts + pGoals.conflicts + pBudget.conflicts + pStudies.conflicts + pDreams.conflicts + pTemplates.conflicts,
    skipped: pEntries.skipped + pGoals.skipped + pBudget.skipped + pStudies.skipped + pDreams.skipped + pTemplates.skipped,
    xpAdded: xpAdds.length,
    profileUpdated,
  };

  return {
    adds: {
      entries: pEntries.adds, goals: pGoals.adds, budget: pBudget.adds,
      studies: pStudies.adds, dreams: pDreams.adds, templates: pTemplates.adds,
    },
    updates: {
      entries: pEntries.updates, goals: pGoals.updates, budget: pBudget.updates,
      studies: pStudies.updates, dreams: pDreams.updates, templates: pTemplates.updates,
    },
    deletes: [
      ...pEntries.removedIds.map((id) => ({ table: 'entries' as const, id })),
      ...pGoals.removedIds.map((id) => ({ table: 'goals' as const, id })),
      ...pBudget.removedIds.map((id) => ({ table: 'budget' as const, id })),
      ...pStudies.removedIds.map((id) => ({ table: 'studies' as const, id })),
      ...pDreams.removedIds.map((id) => ({ table: 'dreams' as const, id })),
      ...pTemplates.removedIds.map((id) => ({ table: 'templates' as const, id })),
    ],
    deletions: [...tombMap.values()],
    xpAdds,
    achievements,
    profile,
    stats,
  };
}
