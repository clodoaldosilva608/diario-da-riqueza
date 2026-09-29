/**
 * Montagem do payload de exportação a partir dos dados locais.
 * Escopos: dia / mês / ano / diário completo.
 */

import { db } from '@/db';
import type { ExportPayload } from '@/types';

export type ExportScope =
  | { kind: 'dia'; date: string }
  | { kind: 'mes'; year: number; month: number } // month 0-11
  | { kind: 'ano'; year: number }
  | { kind: 'completo' };

export async function buildPayload(scope: ExportScope): Promise<ExportPayload> {
  const [profile, allEntries, allBudget, goals, dreams, studies, attachments] = await Promise.all([
    db.profile.get('profile'),
    db.entries.orderBy('date').reverse().toArray(),
    db.budget.orderBy('date').reverse().toArray(),
    db.goals.toArray(),
    db.dreams.toArray(),
    db.studies.toArray(),
    db.attachments.toArray(),
  ]);

  let entries = allEntries;
  let budget = allBudget;
  let scopeLabel = 'Diário completo';

  if (scope.kind === 'dia') {
    entries = allEntries.filter((e) => e.date === scope.date);
    budget = allBudget.filter((b) => b.date === scope.date);
    const [y, m, d] = scope.date.split('-');
    scopeLabel = `Dia ${d}/${m}/${y}`;
  } else if (scope.kind === 'mes') {
    const prefix = `${scope.year}-${String(scope.month + 1).padStart(2, '0')}`;
    entries = allEntries.filter((e) => e.date.startsWith(prefix));
    budget = allBudget.filter((b) => b.date.startsWith(prefix));
    scopeLabel = `${MESES[scope.month]} de ${scope.year}`;
  } else if (scope.kind === 'ano') {
    entries = allEntries.filter((e) => e.date.startsWith(String(scope.year)));
    budget = allBudget.filter((b) => b.date.startsWith(String(scope.year)));
    scopeLabel = `Ano de ${scope.year}`;
  }

  return {
    profile,
    entries,
    budget,
    goals,
    dreams,
    studies,
    attachments,
    generatedAt: new Date().toISOString(),
    scopeLabel,
  };
}

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
