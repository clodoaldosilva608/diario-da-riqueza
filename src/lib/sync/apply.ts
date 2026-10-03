/**
 * Aplicação do dump mesclado no Dexie — a parte cirúrgica do sync.
 *
 * Por que não restoreDump()? Porque os `id` locais (auto-increment) precisam
 * ser preservados quando o registro já existe (mesma uid) e atribuídos pelo
 * Dexie quando é novo. Este módulo faz a aplicação linha a linha:
 *
 * - dreams/goals/budget/studies/templates: por `uid` — existe? atualiza
 *   conteúdo mantendo o id local; não existe? adiciona (novo id);
 * - entries: por `date` (índice único) — mesma lógica;
 * - dreamDeposits: dreamId re-vinculado por `dreamUid` (sonhos vindos da
 *   nuvem são inseridos primeiro e o novo id é usado);
 * - xpEvents: dedupe por fingerprint de ação (append-only);
 * - achievements/deletedLog: bulkPut por chave (idempotente).
 */

import { db } from '@/db';
import type { Table, UpdateSpec } from 'dexie';
import type {
  AchievementRecord,
  BudgetEntry,
  DeletedLogEntry,
  DiaryEntry,
  Dream,
  DreamDeposit,
  EntryTemplate,
  Goal,
  Study,
  XPEvent,
} from '@/types';
import type { MergeableDump, MergeStats } from './merge';

interface WithUid {
  uid?: string;
  id?: number;
  updatedAt?: string;
}

type SyncableTable = 'dreams' | 'goals' | 'budget' | 'studies' | 'templates';

async function upsertByUid<T extends WithUid>(
  table: SyncableTable,
  rows: T[] | undefined,
  stats: MergeStats,
): Promise<void> {
  if (!rows?.length) return;
  const t = db[table] as unknown as Table<T, number>;
  for (const row of rows) {
    if (!row.uid) continue;
    const local = (await t.where('uid').equals(row.uid).first()) as T | undefined;
    if (local?.id) {
      await t.update(local.id, { ...row, id: local.id } as unknown as UpdateSpec<T>);
      stats.updated++;
    } else {
      const { id: _drop, ...clean } = row;
      await t.add(clean as T);
      stats.added++;
    }
  }
}

export async function applyMergedDump(merged: MergeableDump): Promise<MergeStats> {
  const stats: MergeStats = {
    added: 0,
    updated: 0,
    keptLocal: 0,
    removedByTombstone: 0,
    droppedDeposits: 0,
  };

  await db.transaction(
    'rw',
    [db.dreams, db.goals, db.budget, db.studies, db.templates, db.entries, db.xpEvents, db.achievements, db.deletedLog, db.dreamDeposits],
    async () => {
      /* 1. Tabelas por uid */
      await upsertByUid<Dream>('dreams', merged.dreams, stats);
      await upsertByUid<Goal>('goals', merged.goals, stats);
      await upsertByUid<BudgetEntry>('budget', merged.budget, stats);
      await upsertByUid<Study>('studies', merged.studies, stats);
      await upsertByUid<EntryTemplate>('templates', merged.templates, stats);

      /* 2. entries por date (índice único) */
      for (const row of merged.entries ?? []) {
        const local = await db.entries.where('date').equals(row.date).first();
        if (local?.id) {
          await db.entries.update(local.id, { ...row, id: local.id });
          stats.updated++;
        } else {
          const { id: _drop, ...clean } = row;
          await db.entries.add(clean as DiaryEntry);
          stats.added++;
        }
      }

      /* 3. perfil — updatedAt mais novo vence */
      const incomingProfile = merged.profile?.[0];
      if (incomingProfile) {
        const localProfile = await db.profile.get('profile');
        if (!localProfile || (incomingProfile.updatedAt ?? '') > (localProfile.updatedAt ?? '')) {
          await db.profile.put({ ...incomingProfile, id: 'profile' });
          stats.updated++;
        } else {
          stats.keptLocal++;
        }
      }

      /* 4. xpEvents — fingerprint de ação evita duplicar XP */
      const localXp = await db.xpEvents.toArray();
      const xpSeen = new Set(localXp.map((e) => `${e.type}:${e.date}:${e.amount}:${e.description ?? ''}`));
      const newXp: XPEvent[] = [];
      for (const ev of merged.xpEvents ?? []) {
        const k = `${ev.type}:${ev.date}:${ev.amount}:${ev.description ?? ''}`;
        if (!xpSeen.has(k)) {
          xpSeen.add(k);
          const { id: _drop, ...clean } = ev;
          newXp.push(clean as XPEvent);
        }
      }
      if (newXp.length) {
        await db.xpEvents.bulkAdd(newXp);
        stats.added += newXp.length;
      }

      /* 5. achievements + tombstones */
      const ach = (merged.achievements ?? []) as AchievementRecord[];
      if (ach.length) await db.achievements.bulkPut(ach);
      const tombs = (merged.deletedLog ?? []) as DeletedLogEntry[];
      if (tombs.length) await db.deletedLog.bulkPut(tombs);

      /* 6. depósitos — re-vincula dreamId pelo dreamUid */
      const localDreams = await db.dreams.toArray();
      const dreamByUid = new Map(localDreams.map((d) => [d.uid, d]));
      const validDeposits: DreamDeposit[] = [];
      for (const dep of merged.dreamDeposits ?? []) {
        let target = dep.dreamUid ? dreamByUid.get(dep.dreamUid) : undefined;
        if (!target && dep.dreamUid) {
          // sonho veio da nuvem mas ainda não existe localmente? procura nos mesclados
          const incoming = (merged.dreams ?? []).find((d) => d.uid === dep.dreamUid);
          if (incoming) {
            const { id: _drop, ...cleanDream } = incoming;
            const newId = await db.dreams.add(cleanDream as Dream);
            target = { ...incoming, id: newId };
            dreamByUid.set(incoming.uid, target);
          }
        }
        if (!target) {
          stats.droppedDeposits++;
          continue;
        }
        validDeposits.push({ ...dep, dreamId: target.id! });
      }
      // dedupe por (dreamId + createdAt)
      const existingDeposits = await db.dreamDeposits.toArray();
      const seenDeposits = new Set(existingDeposits.map((d) => `${d.dreamId}:${d.createdAt}`));
      const toAdd: DreamDeposit[] = [];
      for (const d of validDeposits) {
        const k = `${d.dreamId}:${d.createdAt}`;
        if (!seenDeposits.has(k)) {
          seenDeposits.add(k);
          const { id: _drop, ...clean } = d;
          toAdd.push(clean as DreamDeposit);
        }
      }
      if (toAdd.length) {
        await db.dreamDeposits.bulkAdd(toAdd);
        stats.added += toAdd.length;
      }
    },
  );

  return stats;
}
