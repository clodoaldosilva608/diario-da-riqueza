/**
 * Motor de Desafios da Semana — metas curtas com XP resgatável.
 *
 * Filosofia (Habitica adaptada): desafios pequenos, semanais e verificáveis
 * pelos PRÓPRIOS dados do app — nada de honor system. O XP é resgatado uma
 * única vez por desafio/semana (chave `challengeId:periodKey` no Dexie).
 *
 * A semana ISO (segunda → domingo) é o período; o selo compartilhável
 * (`ShareBadgeDialog`) transforma o progresso em material de divulgação.
 */

import type { BudgetEntry, DiaryEntry, DreamDeposit } from '@/types';

export interface ChallengeContext {
  entries: DiaryEntry[];
  budget: BudgetEntry[];
  deposits: DreamDeposit[];
}

export interface ChallengeDef {
  id: string;
  title: string;
  description: string;
  goal: number;
  xp: number;
  /** Como o progresso é medido dentro da semana ISO corrente */
  measure: (ctx: ChallengeContext) => number;
  /** Dica curta de como progredir */
  hint: string;
}

export interface EvaluatedChallenge extends ChallengeDef {
  current: number;
  /** Percentual 0-100 */
  pct: number;
  /** Alcançou a meta nesta semana */
  done: boolean;
  /** XP já resgatado nesta semana */
  claimed: boolean;
}

/* ============================== SEMANA ISO ============================== */

/** Chave da semana ISO: '2026-W40' (segunda → domingo) */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // dom = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // quinta da semana ISO
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Datas ('yyyy-MM-dd') que caem na semana ISO corrente */
export function isCurrentWeek(iso: string, ref: Date = new Date()): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return false;
  return isoWeekKey(new Date(y, m - 1, d)) === isoWeekKey(ref);
}

/* ============================== DESAFIOS ============================== */

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'registro-5',
    title: 'Semana completa de registros',
    description: 'Registre o dia em 5 dias desta semana',
    goal: 5,
    xp: 30,
    hint: 'Abra o diário e salve o registro — 5 minutos por dia bastam.',
    measure: ({ entries }) => entries.filter((e) => isCurrentWeek(e.date)).length,
  },
  {
    id: 'pratica-3',
    title: 'Teoria virando prática',
    description: 'Preencha "Em prática" em 3 dias desta semana',
    goal: 3,
    xp: 25,
    hint: 'No registro do dia, escreva a ação concreta que aplicou do que estudou.',
    measure: ({ entries }) =>
      entries.filter((e) => isCurrentWeek(e.date) && e.practice?.trim()).length,
  },
  {
    id: 'gastos-4',
    title: 'Olho vivo no dinheiro',
    description: 'Anote lançamentos no Orçamento em 4 dias distintos',
    goal: 4,
    xp: 25,
    hint: 'Anotou um gasto? Lance na hora — 30 segundos cada.',
    measure: ({ budget }) =>
      new Set(budget.filter((b) => isCurrentWeek(b.date)).map((b) => b.date)).size,
  },
  {
    id: 'cofrinho-1',
    title: 'Pague seu futuro primeiro',
    description: 'Faça pelo menos 1 depósito em um cofrinho de sonho',
    goal: 1,
    xp: 20,
    hint: 'Na aba Sonhos & Metas, use o cofrinho para guardar qualquer valor.',
    measure: ({ deposits }) => deposits.filter((d) => isCurrentWeek(d.date)).length,
  },
];

/** Avalia todos os desafios contra os dados atuais + resgates já feitos */
export function evaluateChallenges(
  ctx: ChallengeContext,
  claimedKeys: Set<string>,
  ref: Date = new Date(),
): EvaluatedChallenge[] {
  const periodKey = isoWeekKey(ref);
  return CHALLENGES.map((def) => {
    const current = Math.min(def.goal, def.measure(ctx));
    const done = current >= def.goal;
    const claimed = claimedKeys.has(`${def.id}:${periodKey}`);
    return {
      ...def,
      current,
      pct: Math.round((current / def.goal) * 100),
      done,
      claimed,
    };
  });
}

/** Total de XP disponível em resgates pendentes (desafios concluídos não resgatados) */
export function pendingChallengeXP(challenges: EvaluatedChallenge[]): number {
  return challenges.reduce((s, c) => s + (c.done && !c.claimed ? c.xp : 0), 0);
}
