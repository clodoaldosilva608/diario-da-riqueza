/// <reference types="bun-types" />
import { describe, expect, test } from 'bun:test';

import { isoWeekKey, isCurrentWeek, evaluateChallenges, CHALLENGES, pendingChallengeXP } from './challenges';
import { buildMonthlyReport } from '@/lib/report';
import { mergeDumps } from '@/lib/sync/merge';
import type { DiaryEntry, BudgetEntry, DreamDeposit, XPEvent } from '@/types';

/* ============================== DESAFIOS ============================== */

describe('isoWeekKey', () => {
  test('semana ISO estável (quinta define o ano)', () => {
    expect(isoWeekKey(new Date(2026, 0, 1))).toBe('2026-W01'); // quinta
    expect(isoWeekKey(new Date(2024, 11, 30))).toBe('2025-W01'); // segunda, ano ISO 2025
    expect(isoWeekKey(new Date(2026, 9, 2))).toMatch(/^2026-W\d{2}$/);
  });
});

describe('isCurrentWeek', () => {
  test('datas da mesma semana ISO', () => {
    const ref = new Date(2026, 9, 2); // sexta 02/10/2026
    const monday = new Date(ref);
    monday.setDate(ref.getDate() - ((ref.getDay() + 6) % 7)); // segunda
    expect(isCurrentWeek(monday.toISOString().slice(0, 10), ref)).toBe(true);
    expect(isCurrentWeek('2020-01-01', ref)).toBe(false);
  });
});

function entry(date: string, practice?: string): DiaryEntry {
  return {
    date,
    practice: practice ?? '',
    income: 0,
    expense: 0,
    xpEarned: 0,
    createdAt: new Date().toISOString(),
  } as DiaryEntry;
}

function budgetEntry(date: string): BudgetEntry {
  return {
    type: 'despesa',
    category: 'Teste',
    description: 'x',
    value: 10,
    date,
    frequency: 'unica',
    createdAt: new Date().toISOString(),
  };
}

describe('evaluateChallenges', () => {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);

  test('progresso vazio → 0/para todos', () => {
    const r = evaluateChallenges({ entries: [], budget: [], deposits: [] }, new Set());
    expect(r.length).toBe(CHALLENGES.length);
    expect(r.every((c) => c.current === 0 && !c.done && !c.claimed)).toBe(true);
  });

  test('conta apenas a semana corrente', () => {
    const entries = [entry(iso, 'apliquei'), entry('2020-01-01', 'antigo')];
    const r = evaluateChallenges({ entries, budget: [], deposits: [] }, new Set());
    const pratica = r.find((c) => c.id === 'pratica-3')!;
    expect(pratica.current).toBe(1);
  });

  test('done quando atinge a meta e claimed via chave', () => {
    const entries = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      return entry(d.toISOString().slice(0, 10));
    });
    const week = isoWeekKey(today);
    const r1 = evaluateChallenges({ entries, budget: [], deposits: [] }, new Set());
    const reg = r1.find((c) => c.id === 'registro-5')!;
    expect(reg.done).toBe(true);
    expect(reg.claimed).toBe(false);
    expect(pendingChallengeXP(r1)).toBeGreaterThan(0);

    const r2 = evaluateChallenges({ entries, budget: [], deposits: [] }, new Set([`registro-5:${week}`]));
    expect(r2.find((c) => c.id === 'registro-5')!.claimed).toBe(true);
  });
});

/* ============================== RELATÓRIO ============================== */

describe('buildMonthlyReport', () => {
  const xp: XPEvent[] = [
    { type: 'registro_dia', amount: 50, date: '2025-09-05', createdAt: '2025-09-05T10:00:00Z' },
    { type: 'registro_dia', amount: 50, date: '2025-09-06', createdAt: '2025-09-06T10:00:00Z' },
    { type: 'registro_dia', amount: 50, date: '2025-08-01', createdAt: '2025-08-01T10:00:00Z' },
  ];
  const budget: BudgetEntry[] = [
    { ...budgetEntry('2025-09-10'), type: 'receita', category: 'Salário', value: 3000 },
    { ...budgetEntry('2025-09-11'), type: 'despesa', category: 'Alimentação', value: 400 },
    { ...budgetEntry('2025-09-12'), type: 'despesa', category: 'Transporte', value: 200 },
    { ...budgetEntry('2025-08-11'), type: 'despesa', category: 'Alimentação', value: 1000 },
  ];
  const entries: DiaryEntry[] = [entry('2025-09-05', 'apliquei'), entry('2025-09-06')];
  const deposits: DreamDeposit[] = [
    { dreamId: 1, amount: 150, date: '2025-09-15', createdAt: new Date().toISOString() },
  ];

  test('agregações do mês com comparação ao anterior', () => {
    const r = buildMonthlyReport({
      year: 2025, month: 8, // setembro (0-based)
      entries, budget, studies: [], xpEvents: xp, deposits,
    });
    expect(r.income).toBe(3000);
    expect(r.expense).toBe(600);
    expect(r.balance).toBe(2400);
    expect(r.daysRegistered).toBe(2);
    expect(r.practiceDays).toBe(1);
    expect(r.xpGained).toBe(100);
    expect(r.depositTotal).toBe(150);
    expect(r.depositCount).toBe(1);
    expect(r.topCategories[0]).toEqual({ name: 'Alimentação', total: 400 });
    expect(r.comparison).not.toBeNull();
    expect(r.comparison!.expense).toBe(-400); // 600 - 1000
  });

  test('sem base no mês anterior → comparison null', () => {
    const r = buildMonthlyReport({
      year: 2030, month: 5, entries: [], budget: [], studies: [], xpEvents: [], deposits: [],
    });
    expect(r.comparison).toBeNull();
  });
});

/* ============================== MERGE SYNC ============================== */

describe('mergeDumps', () => {
  const now = new Date().toISOString();

  test('last-write-wins por uid + tombstone impede ressurreição', () => {
    const dreamLocal = { id: 1, uid: 'a', title: 'Local', achieved: false, createdAt: now, updatedAt: '2026-01-01' };
    const dreamNew = { uid: 'a', title: 'Atualizado na nuvem', achieved: true, createdAt: now, updatedAt: '2026-02-01' };
    const dreamTombstoned = { uid: 'b', title: 'Apagado', achieved: false, createdAt: now, updatedAt: now };

    const local = { version: 1, exportedAt: now, dreams: [dreamLocal] };
    const incoming = {
      version: 1,
      exportedAt: now,
      dreams: [dreamNew, dreamTombstoned],
      deletedLog: [{ key: 'dreams:b', table: 'dreams', uid: 'b', deletedAt: now }],
    };
    const { merged, stats } = mergeDumps(local, incoming);
    expect(merged.dreams!.length).toBe(1);
    expect(merged.dreams![0].title).toBe('Atualizado na nuvem');
    expect(stats.updated).toBe(1);
    expect(stats.removedByTombstone).toBe(1); // 'b' bloqueado
  });

  test('entries por date — mais novo vence', () => {
    const e1 = { ...entry('2025-09-05'), uid: 'e1', updatedAt: '2026-01-01' };
    const e1New = { ...entry('2025-09-05'), uid: 'e1', updatedAt: '2026-03-01' };
    const { merged, stats } = mergeDumps(
      { version: 1, exportedAt: now, entries: [e1] },
      { version: 1, exportedAt: now, entries: [e1New] },
    );
    expect(merged.entries!.length).toBe(1);
    expect(stats.updated).toBe(1);
  });

  test('depósitos órfãos (dreamUid inexistente) são descartados', () => {
    const dep: DreamDeposit = { dreamId: 9, dreamUid: 'nao-existe', amount: 10, date: '2025-09-01', createdAt: now };
    const { merged, stats } = mergeDumps(
      { version: 1, exportedAt: now, dreams: [], dreamDeposits: [dep] },
      { version: 1, exportedAt: now, dreams: [], dreamDeposits: [] },
    );
    expect(merged.dreamDeposits!.length).toBe(0);
    expect(stats.droppedDeposits).toBe(1);
  });
});
