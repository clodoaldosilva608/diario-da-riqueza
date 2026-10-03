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

/**
 * Converte texto digitado por usuários BR em número.
 *
 * Aceita: "77,50" • "1.234,56" • "R$ 1.234,56" • "77.5" • "1,234.56" •
 * "(1.234,56)" (contábil negativo) • "-77,50". Regra do último separador:
 * quando há "." e ",", o ÚLTIMO é o decimal (padrão BR vs en-US).
 *
 * Retorna NaN para vazio/inválido — callers decidem o fallback (|| 0 etc.).
 * Motivação: <input type="number"> saneia vírgula para "" no React,
 * apagando silenciosamente o que o usuário digitou (bug real de E2E).
 */
export function parseBRLNumber(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return raw;
  if (raw == null) return NaN;
  let s = String(raw).trim().replace(/[R$\s\u00A0]/g, '');
  if (!s) return NaN;
  const negative = s.startsWith('-') || (/^\(.*\)$/.test(s));
  s = s.replace(/[()\-\+]/g, '');
  // Extrai a 1ª sequência numérica (tolera ruído: "abc12,3def" → "12,3")
  const m = s.match(/[\d.,]+/);
  if (!m) return NaN;
  s = m[0];
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.') // 1.234,56 (BR)
      : s.replace(/,/g, ''); // 1,234.56 (en)
  } else if (hasComma) {
    s = s.replace(/,/g, '.'); // 77,50 → 77.50
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return NaN;
  return negative ? -n : n;
}

/**
 * Número → texto editável pt-BR para inputs de valor (MoneyInput).
 * 100000.5 → "100.000,50" • 20000 → "20.000,00" • -77.5 → "-77,50".
 * Complemento de parseBRLNumber: carregar dados salvos de volta no input
 * sem exibir "100000.5" (formato en-US cru) para o usuário BR.
 * SEMPRE com centavos: "20.000" (só milhar) voltaria a parsear como 20
 * (ponto isolado = decimal) — corrompendo o valor num editar→salvar.
 */
export function numberToBR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
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
