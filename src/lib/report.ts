/**
 * Relatório mensal — "Seu mês em números".
 *
 * Calcula tudo que o método pede para a revisão semanal/mensal:
 * financeiro, consistência, estudos, XP e cofrinhos — com comparação
 * automática contra o mês anterior (inspiração: Ghostfolio/Actual).
 * Função pura → testável e reutilizada pela view e pelo PDF.
 */

import { monthlyTotals } from '@/lib/format';
import type { BudgetEntry, DiaryEntry, Study, XPEvent, DreamDeposit } from '@/types';

export interface MonthlyReportInput {
  year: number;
  /** 0-11 (getMonth) */
  month: number;
  entries: DiaryEntry[];
  budget: BudgetEntry[];
  studies: Study[];
  xpEvents: XPEvent[];
  deposits: DreamDeposit[];
  /** Nome do usuário (para o PDF/selo) */
  userName?: string;
}

export interface TopCategory {
  name: string;
  total: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  /* Financeiro */
  income: number;
  expense: number;
  balance: number;
  savingRate: number;
  /* Consistência */
  daysRegistered: number;
  practiceDays: number;
  exerciseDays: number;
  productiveDays: number;
  /* Estudos e XP */
  studiesCompleted: number;
  xpGained: number;
  bestDay: { date: string; xp: number } | null;
  /* Cofrinhos */
  depositTotal: number;
  depositCount: number;
  /* Top categorias de despesa */
  topCategories: TopCategory[];
  /* Comparações vs mês anterior (null = sem base comparável) */
  comparison: {
    balance: number | null;
    daysRegistered: number | null;
    expense: number | null;
  } | null;
}

/** Últimos 'n' dias com maior XP dentro do mês */
function bestDayOfMonth(xpEvents: XPEvent[], year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const byDate = new Map<string, number>();
  for (const ev of xpEvents) {
    if (ev.date.startsWith(prefix)) {
      byDate.set(ev.date, (byDate.get(ev.date) ?? 0) + ev.amount);
    }
  }
  let best: { date: string; xp: number } | null = null;
  for (const [date, xp] of byDate) {
    if (!best || xp > best.xp) best = { date, xp };
  }
  return best;
}

export function buildMonthlyReport(input: MonthlyReportInput): MonthlyReport {
  const { year, month, entries, budget, studies, xpEvents, deposits } = input;

  const totals = monthlyTotals(budget, year, month);
  const savingRate = totals.income > 0 ? Math.round((totals.balance / totals.income) * 100) : 0;

  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEntries = entries.filter((e) => e.date.startsWith(prefix));

  // Mês anterior (pode ser do ano anterior)
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevTotals = monthlyTotals(budget, prevYear, prevMonth);
  const prevPrefix = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
  const prevEntriesCount = entries.filter((e) => e.date.startsWith(prevPrefix)).length;

  // Top categorias de despesa do mês (lançamentos 'unica' do mês + rateio
  // das 'mensal' não faz sentido para gastos variáveis — mensal entra como total)
  const catMap = new Map<string, number>();
  for (const b of budget) {
    if (b.type !== 'despesa') continue;
    if (b.frequency === 'unica' && !b.date.startsWith(prefix)) continue;
    catMap.set(b.category, (catMap.get(b.category) ?? 0) + b.value);
  }
  const topCategories: TopCategory[] = [...catMap.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const monthDeposits = deposits.filter((d) => d.date.startsWith(prefix));

  // Base comparável: só compara se houver qualquer dado no mês anterior
  const hasPrevBase =
    prevTotals.income > 0 || prevTotals.expense > 0 || prevEntriesCount > 0;

  return {
    year,
    month,
    income: totals.income,
    expense: totals.expense,
    balance: totals.balance,
    savingRate,
    daysRegistered: monthEntries.length,
    practiceDays: monthEntries.filter((e) => e.practice?.trim()).length,
    exerciseDays: monthEntries.filter((e) => e.exerciseDone).length,
    productiveDays: monthEntries.filter((e) => (e.productiveActions ?? '').trim()).length,
    studiesCompleted: studies.filter(
      (s) => s.status === 'concluido' && (s.completedAt ?? '').startsWith(prefix),
    ).length,
    xpGained: xpEvents
      .filter((ev) => ev.date.startsWith(prefix))
      .reduce((s, ev) => s + ev.amount, 0),
    bestDay: bestDayOfMonth(xpEvents, year, month),
    depositTotal: monthDeposits.reduce((s, d) => s + d.amount, 0),
    depositCount: monthDeposits.length,
    topCategories,
    comparison: hasPrevBase
      ? {
          balance: totals.balance - prevTotals.balance,
          daysRegistered: monthEntries.length - prevEntriesCount,
          expense: totals.expense - prevTotals.expense,
        }
      : null,
  };
}

/** Rótulo do mês em pt-BR (parcelado com MONTH_NAMES da view) */
export function reportMonthLabel(year: number, month: number): string {
  const names = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return `${names[month]} de ${year}`;
}
