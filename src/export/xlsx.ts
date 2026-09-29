/**
 * Exportação Excel (.xlsx) — SheetJS. Uma aba por domínio de dados.
 */

import * as XLSX from 'xlsx';
import { GOAL_CATEGORY_LABELS, MOOD_LABELS, STUDY_AREA_LABELS } from '@/types';
import type { ExportPayload } from '@/types';

type Row = Array<string | number>;

function sheetFromRows(rows: Row[]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = rows[0]?.map(() => ({ wch: 22 })) ?? [];
  return ws;
}

export function generateXLSX(payload: ExportPayload): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // ---- Resumo ----
  const profile = payload.profile;
  const resumo: Row[] = [
    ['Diário da Riqueza — Exportação'],
    ['Gerado em', new Date(payload.generatedAt).toLocaleString('pt-BR')],
    ['Escopo', payload.scopeLabel],
    [],
    ['Nome', profile?.name ?? ''],
    ['Diário', profile?.journalName ?? ''],
    ['Meta financeira (R$)', profile?.yearGoal ?? 0],
    ['Data-alvo', profile?.targetDate ?? ''],
    [],
    ['Registros no período', payload.entries.length],
    ['Receitas (R$)', payload.budget.filter((b) => b.type === 'receita').reduce((s, b) => s + b.value, 0)],
    ['Despesas (R$)', payload.budget.filter((b) => b.type === 'despesa').reduce((s, b) => s + b.value, 0)],
    ['Metas ativas', payload.goals.filter((g) => g.status === 'ativa').length],
    ['Metas concluídas', payload.goals.filter((g) => g.status === 'concluida').length],
    ['Estudos concluídos', payload.studies.filter((s) => s.status === 'concluido').length],
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows(resumo), 'Resumo');

  // ---- Diário ----
  const diario: Row[] = [
    [
      'Data', 'Acordou', 'Exercício', 'Fez exercício?', 'Alimentação', 'Tema de estudo',
      'Resumo do aprendizado', 'Ações produtivas', 'Receita (R$)', 'Despesa (R$)',
      'Reflexões', 'EM PRÁTICA', 'Humor', 'Energia', 'XP do dia',
    ],
    ...payload.entries.map((e) => [
      e.date, e.wakeTime ?? '', e.exercise ?? '', e.exerciseDone ? 'Sim' : 'Não', e.meals ?? '',
      e.studyTopic ?? '', e.studySummary ?? '', e.productiveActions ?? '', e.income, e.expense,
      e.thoughts ?? '', e.practice, e.mood ? MOOD_LABELS[e.mood] : '', e.energy ?? '', e.xpEarned,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows(diario), 'Diário');

  // ---- Orçamento ----
  const orcamento: Row[] = [
    ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Recorrência'],
    ...payload.budget.map((b) => [
      b.date,
      b.type === 'receita' ? 'Receita' : 'Despesa',
      b.category,
      b.description,
      b.value,
      b.frequency === 'mensal' ? 'Mensal' : 'Única',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows(orcamento), 'Orçamento');

  // ---- Metas ----
  const metas: Row[] = [
    ['Meta', 'Categoria', 'Status', 'Valor atual', 'Valor-alvo', 'Prazo', 'Descrição'],
    ...payload.goals.map((g) => [
      g.title,
      GOAL_CATEGORY_LABELS[g.category],
      g.status === 'concluida' ? 'Concluída' : 'Ativa',
      g.currentValue,
      g.targetValue ?? '',
      g.deadline ?? '',
      g.description ?? '',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows(metas), 'Metas');

  // ---- Sonhos ----
  const sonhos: Row[] = [
    ['Sonho', 'Realizado?', 'Descrição'],
    ...payload.dreams.map((d) => [d.title, d.achieved ? 'Sim' : 'Não', d.description ?? '']),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows(sonhos), 'Sonhos');

  // ---- Estudos ----
  const estudos: Row[] = [
    ['Área', 'Tema', 'Status', 'Progresso (%)', 'O que aprendi', 'Concluído em'],
    ...payload.studies.map((s) => [
      STUDY_AREA_LABELS[s.area],
      s.topic,
      s.status === 'nao_iniciado' ? 'Não iniciado' : s.status === 'estudando' ? 'Estudando' : 'Concluído',
      s.progress,
      s.notes ?? '',
      s.completedAt ? s.completedAt.slice(0, 10) : '',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows(estudos), 'Estudos');

  return wb;
}

export function xlsxToBlob(wb: XLSX.WorkBook): Blob {
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
