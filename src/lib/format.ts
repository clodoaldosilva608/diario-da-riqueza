/**
 * Formatação e helpers de data (pt-BR)
 */

import type { BudgetEntry } from '@/types';

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatCompactBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: value >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 100000 ? 1 : 2,
  }).format(value || 0);
}

/** 'yyyy-MM-dd' -> dd/mm */
export function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** 'yyyy-MM-dd' -> data longa pt-BR: 12 de março de 2026 */
export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Saldo de um mês considerando lançamentos 'unica' e 'mensal' */
export function monthlyTotals(
  budget: BudgetEntry[],
  year: number,
  month: number, // 0-11
): { income: number; expense: number; balance: number } {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const currentPrefix = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  let income = 0;
  let expense = 0;
  for (const b of budget) {
    if (b.frequency === 'unica') {
      if (b.date.startsWith(prefix)) {
        if (b.type === 'receita') income += b.value;
        else expense += b.value;
      }
    } else {
      // mensal: conta em todos os meses a partir do lançamento
      if (b.date.slice(0, 7) <= prefix && prefix <= currentPrefix) {
        if (b.type === 'receita') income += b.value;
        else expense += b.value;
      }
    }
  }
  return { income, expense, balance: income - expense };
}

/** Dias restantes até a data-alvo */
export function daysUntil(targetISO: string): number {
  const [y, m, d] = targetISO.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
