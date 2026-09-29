/**
 * Hooks reativos de leitura do Dexie (useLiveQuery) + utilidades derivadas.
 * Componentes consomem estes hooks; nunca tocam no db diretamente.
 */

'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayISO } from '@/db';
import { computeStreak, computeRecordStreak, computeLevel } from '@/gamification/engine';
import { monthlyTotals } from '@/lib/format';
import { useMemo } from 'react';
import type { DiaryEntry, BudgetEntry } from '@/types';

export function useProfile() {
  return useLiveQuery(() => db.profile.get('profile'), [], undefined);
}

export function useEntries(year?: number) {
  return useLiveQuery(async () => {
    const all = await db.entries.orderBy('date').reverse().toArray();
    return year ? all.filter((e) => e.date.startsWith(String(year))) : all;
  }, [year], []);
}

export function useEntryByDate(date: string | null) {
  return useLiveQuery(
    async () => (date ? db.entries.where('date').equals(date).first() : undefined),
    [date],
    undefined,
  );
}

export function useAttachments(date: string | null) {
  return useLiveQuery(
    async () => (date ? db.attachments.where('entryDate').equals(date).toArray() : []),
    [date],
    [],
  );
}

export function useDreams() {
  return useLiveQuery(() => db.dreams.orderBy('createdAt').toArray(), [], []);
}

export function useGoals() {
  return useLiveQuery(() => db.goals.orderBy('createdAt').toArray(), [], []);
}

export function useBudget() {
  return useLiveQuery(() => db.budget.orderBy('date').reverse().toArray(), [], []);
}

export function useStudies() {
  return useLiveQuery(() => db.studies.orderBy('createdAt').toArray(), [], []);
}

export function useXpEvents() {
  return useLiveQuery(() => db.xpEvents.orderBy('createdAt').toArray(), [], []);
}

export function useAchievements() {
  return useLiveQuery(() => db.achievements.toArray(), [], []);
}

export function useTemplates() {
  return useLiveQuery(() => db.templates.orderBy('createdAt').toArray(), [], []);
}

export function useBackups() {
  return useLiveQuery(() => db.backups.orderBy('createdAt').reverse().toArray(), [], []);
}

/** Anos que possuem lançamentos/entradas (para o seletor de diários) */
export function useAvailableYears() {
  return useLiveQuery(async () => {
    const entryYears = await db.entries.toArray();
    const budgetYears = await db.budget.toArray();
    const set = new Set<number>([new Date().getFullYear()]);
    entryYears.forEach((e) => set.add(parseInt(e.date.slice(0, 4), 10)));
    budgetYears.forEach((b) => set.add(parseInt(b.date.slice(0, 4), 10)));
    return [...set].sort((a, b) => b - a);
  }, [], [new Date().getFullYear()]);
}

/* ============================== DERIVADOS ============================== */

export interface GamificationSnapshot {
  totalXP: number;
  streak: number;
  recordStreak: number;
  level: ReturnType<typeof computeLevel>;
  registeredToday: boolean;
}

export function useGamification(entries: DiaryEntry[]): GamificationSnapshot {
  const xpEvents = useXpEvents();
  return useMemo(() => {
    const totalXP = xpEvents.reduce((s, e) => s + e.amount, 0);
    const streak = computeStreak(entries);
    const recordStreak = computeRecordStreak(entries);
    return {
      totalXP,
      streak,
      recordStreak,
      level: computeLevel(totalXP),
      registeredToday: entries.some((e) => e.date === todayISO()),
    };
  }, [entries, xpEvents]);
}

export function useMonthlyBudgetSummary(budget: BudgetEntry[], year: number, month: number) {
  return useMemo(() => monthlyTotals(budget, year, month), [budget, year, month]);
}

/** Busca global simples no diário, metas e estudos */
export interface SearchHit {
  kind: 'entrada' | 'meta' | 'estudo' | 'sonho';
  id: string;
  title: string;
  snippet: string;
  date?: string;
}

export function useGlobalSearch(query: string): SearchHit[] {
  const entries = useEntries();
  const goals = useGoals();
  const studies = useStudies();
  const dreams = useDreams();

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const hits: SearchHit[] = [];

    for (const e of entries) {
      const haystack = [e.practice, e.thoughts, e.studySummary, e.productiveActions, e.studyTopic]
        .filter(Boolean)
        .join(' • ')
        .toLowerCase();
      if (haystack.includes(q)) {
        hits.push({
          kind: 'entrada',
          id: `entry-${e.date}`,
          title: `Diário — ${e.date.split('-').reverse().join('/')}`,
          snippet: haystack.slice(0, 120),
          date: e.date,
        });
      }
    }
    for (const g of goals) {
      if (`${g.title} ${g.description ?? ''}`.toLowerCase().includes(q)) {
        hits.push({
          kind: 'meta',
          id: `goal-${g.id}`,
          title: g.title,
          snippet: g.description ?? '',
        });
      }
    }
    for (const s of studies) {
      if (`${s.topic} ${s.description ?? ''} ${s.notes ?? ''}`.toLowerCase().includes(q)) {
        hits.push({
          kind: 'estudo',
          id: `study-${s.id}`,
          title: s.topic,
          snippet: (s.notes ?? s.description ?? '').slice(0, 120),
        });
      }
    }
    for (const d of dreams) {
      if (`${d.title} ${d.description ?? ''}`.toLowerCase().includes(q)) {
        hits.push({
          kind: 'sonho',
          id: `dream-${d.id}`,
          title: d.title,
          snippet: d.description ?? '',
        });
      }
    }
    return hits.slice(0, 30);
  }, [query, entries, goals, studies, dreams]);
}
