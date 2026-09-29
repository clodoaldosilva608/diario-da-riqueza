/**
 * Diário da Riqueza — Motor de Gamificação
 * XP por ações, níveis estilo Haroldo Ochoa e conquistas (badges).
 * Sem infantilização: progresso sério, dourado e motivador.
 */

import type {
  AchievementContext,
  AchievementDef,
  DiaryEntry,
  LevelInfo,
} from '@/types';

/* ============================== NÍVEIS ============================== */

export const LEVELS: Array<{ name: string; minXP: number }> = [
  { name: 'Iniciante', minXP: 0 },
  { name: 'Disciplinado', minXP: 500 },
  { name: 'Construtor', minXP: 1500 },
  { name: 'Investidor', minXP: 3500 },
  { name: 'Visionário', minXP: 7000 },
  { name: 'Milionário', minXP: 15000 },
];

export function computeLevel(totalXP: number): LevelInfo {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXP >= LEVELS[i].minXP) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progress = next
    ? Math.min(100, Math.round(((totalXP - current.minXP) / (next.minXP - current.minXP)) * 100))
    : 100;
  return {
    index,
    name: current.name,
    minXP: current.minXP,
    nextXP: next ? next.minXP : null,
    progress,
  };
}

/* ============================== STREAK ============================== */

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * Streak atual: dias consecutivos com entrada, terminando hoje ou ontem.
 * @param entries entradas (qualquer ordem)
 */
export function computeStreak(entries: DiaryEntry[]): number {
  if (entries.length === 0) return 0;
  const days = new Set(entries.map((e) => e.date));
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Permite que o usuário ainda não tenha registrado hoje (streak continua válida)
  let cursor: Date;
  if (days.has(dateKey(today))) cursor = today;
  else if (days.has(dateKey(yesterday))) cursor = yesterday;
  else return 0;

  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak++;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Maior sequência histórica de dias consecutivos */
export function computeRecordStreak(entries: DiaryEntry[]): number {
  if (entries.length === 0) return 0;
  const days = [...new Set(entries.map((e) => e.date))].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + 'T12:00:00');
    const cur = new Date(days[i] + 'T12:00:00');
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    run = diff === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** Bônus de XP pela streak do dia (tiers) */
export function streakBonusXP(streak: number): number {
  if (streak >= 100) return 50;
  if (streak >= 30) return 25;
  if (streak >= 7) return 10;
  return 0;
}

/* ============================== CONQUISTAS ============================== */

function countDistinctMorningsBefore(entries: DiaryEntry[], hour: number): number {
  const set = new Set<string>();
  for (const e of entries) {
    if (e.wakeTime && e.wakeTime < `${String(hour).padStart(2, '0')}:00`) set.add(e.date);
  }
  return set.size;
}

/** Verifica 3 meses consecutivos de fluxo de caixa positivo (freq. mensal considerada) */
function threePositiveMonths(budget: AchievementContext['budget']): boolean {
  if (budget.length === 0) return false;
  const monthly = new Map<string, { inc: number; exp: number }>();
  const now = new Date();
  const mensal = budget.filter((b) => b.frequency === 'mensal');
  for (const b of budget.filter((b) => b.frequency === 'unica')) {
    const key = b.date.slice(0, 7);
    const m = monthly.get(key) ?? { inc: 0, exp: 0 };
    if (b.type === 'receita') m.inc += b.value;
    else m.exp += b.value;
    monthly.set(key, m);
  }
  // lançamentos mensais contam em todos os meses desde o lançamento
  for (const b of mensal) {
    const start = b.date.slice(0, 7);
    for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
      for (let m = 11; m >= 0; m--) {
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        if (key < start) continue;
        if (key > `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`) continue;
        const acc = monthly.get(key) ?? { inc: 0, exp: 0 };
        if (b.type === 'receita') acc.inc += b.value;
        else acc.exp += b.value;
        monthly.set(key, acc);
      }
    }
  }
  const sorted = [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b));
  let run = 0;
  for (const [, v] of sorted) {
    run = v.inc - v.exp > 0 ? run + 1 : 0;
    if (run >= 3) return true;
  }
  return false;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: 'primeiro_registro',
    title: 'Primeiro Passo',
    description: 'Registrou seu primeiro dia no diário.',
    icon: 'Feather',
    check: (c) => c.entries.length >= 1,
  },
  {
    key: 'streak_7',
    title: 'Chama de 7 Dias',
    description: 'Manteve 7 dias seguidos de consistência.',
    icon: 'Flame',
    check: (c) => c.recordStreak >= 7,
  },
  {
    key: 'streak_30',
    title: 'Imparável — 30 Dias',
    description: '30 dias seguidos treinando a mente da riqueza.',
    icon: 'Zap',
    check: (c) => c.recordStreak >= 30,
  },
  {
    key: 'streak_100',
    title: 'Lenda — 100 Dias',
    description: '100 dias seguidos. Você não é mais o mesmo.',
    icon: 'Crown',
    check: (c) => c.recordStreak >= 100,
  },
  {
    key: 'primeira_meta',
    title: 'Meta Atingida',
    description: 'Concluiu sua primeira meta categorizada.',
    icon: 'Target',
    check: (c) => c.goals.some((g) => g.status === 'concluida'),
  },
  {
    key: 'dez_metas',
    title: 'Arquiteto de Sonhos',
    description: 'Definiu 10 ou mais metas categorizadas.',
    icon: 'Map',
    check: (c) => c.goals.length >= 10,
  },
  {
    key: 'dez_estudos',
    title: 'Erudito — 10 Estudos',
    description: 'Concluiu 10 temas na biblioteca de estudos.',
    icon: 'BookOpen',
    check: (c) => c.studies.filter((s) => s.status === 'concluido').length >= 10,
  },
  {
    key: 'trinta_estudos',
    title: 'Biblioteca Viva — 30 Estudos',
    description: 'Concluiu 30 temas. Conhecimento virou hábito.',
    icon: 'GraduationCap',
    check: (c) => c.studies.filter((s) => s.status === 'concluido').length >= 30,
  },
  {
    key: 'caixa_positivo_3m',
    title: 'Caixa Positivo — 3 Meses',
    description: 'Orçamento positivo por 3 meses consecutivos.',
    icon: 'TrendingUp',
    check: (c) => threePositiveMonths(c.budget),
  },
  {
    key: 'xp_1000',
    title: 'Veterano — 1.000 XP',
    description: 'Acumulou 1.000 XP de esforço real.',
    icon: 'Medal',
    check: (c) => c.totalXP >= 1000,
  },
  {
    key: 'madrugador_5',
    title: 'Madrugador Elite',
    description: 'Acordou antes das 6h em 5 dias registrados.',
    icon: 'Sunrise',
    check: (c) => countDistinctMorningsBefore(c.entries, 6) >= 5,
  },
  {
    key: 'sonho_realizado',
    title: 'Sonho Virou Realidade',
    description: 'Marcou um sonho como realizado.',
    icon: 'Star',
    check: (c) => c.dreams.some((d) => d.achieved),
  },
];

/** Retorna conquistas ainda não desbloqueadas que agora passam no check */
export function findNewlyUnlocked(
  unlockedKeys: Set<string>,
  ctx: AchievementContext,
): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !unlockedKeys.has(a.key) && a.check(ctx));
}
