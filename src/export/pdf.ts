/**
 * Exportação PDF (jsPDF + jspdf-autotable) — caprichada, com capa opcional.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatBRL } from '@/lib/format';
import { GOAL_CATEGORY_LABELS, MOOD_LABELS } from '@/types';
import type { ExportPayload } from '@/types';

const GOLD: [number, number, number] = [176, 141, 40];
const DARK: [number, number, number] = [24, 24, 27];
const GREEN: [number, number, number] = [16, 185, 129];

export function generatePDF(payload: ExportPayload, withCover = false): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;

  if (withCover) {
    // ---- Capa premium preto + dourado ----
    doc.setFillColor(12, 12, 14);
    doc.rect(0, 0, pageW, pageH, 'F');
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.8);
    doc.rect(margin, margin, pageW - margin * 2, pageH - margin * 2);
    doc.setTextColor(...GOLD);
    doc.setFont('times', 'bold');
    doc.setFontSize(42);
    doc.text('Diário da Riqueza', pageW / 2, pageH / 2 - 30, { align: 'center' });
    doc.setDrawColor(...GOLD);
    doc.line(pageW / 2 - 30, pageH / 2 - 20, pageW / 2 + 30, pageH / 2 - 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.setTextColor(250, 250, 250);
    doc.text(payload.profile?.journalName ?? 'Meu Diário da Riqueza', pageW / 2, pageH / 2, {
      align: 'center',
    });
    if (payload.profile) {
      doc.setFontSize(12);
      doc.setTextColor(180, 180, 190);
      doc.text(
        `${payload.profile.name} • Meta: ${formatBRL(payload.profile.yearGoal)} até ${payload.profile.targetDate.split('-').reverse().join('/')}`,
        pageW / 2,
        pageH / 2 + 12,
        { align: 'center' },
      );
    }
    doc.setFontSize(10);
    doc.text(payload.scopeLabel, pageW / 2, pageH - margin - 10, { align: 'center' });
    doc.addPage();
  }

  // ---- Cabeçalho ----
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 24, 'F');
  doc.setTextColor(...GOLD);
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text('Diário da Riqueza', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 205);
  doc.text(payload.scopeLabel, pageW - margin, 12, { align: 'right' });

  let y = 34;
  doc.setTextColor(...DARK);

  // ---- Perfil / Meta ----
  if (payload.profile) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Visão Geral', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = [
      `Nome: ${payload.profile.name}`,
      `Diário: ${payload.profile.journalName}`,
      `Meta financeira: ${formatBRL(payload.profile.yearGoal)}`,
      `Data-alvo: ${payload.profile.targetDate.split('-').reverse().join('/')}`,
    ];
    lines.forEach((l) => {
      doc.text(l, margin, y);
      y += 5.5;
    });
    y += 4;
  }

  // ---- Metas e Sonhos (resumo) ----
  if (payload.goals.length > 0 || payload.dreams.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Sonhos e Metas', margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Tipo', 'Título', 'Categoria', 'Status', 'Progresso']],
      body: [
        ...payload.dreams.map((d) => [
          'Sonho',
          d.title,
          '—',
          d.achieved ? 'Realizado' : 'Em caminho',
          '—',
        ]),
        ...payload.goals.map((g) => [
          'Meta',
          g.title,
          GOAL_CATEGORY_LABELS[g.category],
          g.status === 'concluida' ? 'Concluída' : 'Ativa',
          g.targetValue
            ? `${Math.round((g.currentValue / g.targetValue) * 100)}%`
            : `${g.currentValue}`,
        ]),
      ],
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: DARK, textColor: [250, 250, 250] },
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ---- Entradas do diário ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Registros Diários', margin, y);
  y += 4;

  if (payload.entries.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('Nenhum registro neste período.', margin, y + 4);
    y += 10;
  }

  for (const e of payload.entries) {
    if (y > pageH - 50) {
      doc.addPage();
      y = 20;
    }
    const dateStr = e.date.split('-').reverse().join('/');
    doc.setFillColor(240, 240, 242);
    doc.rect(margin, y, pageW - margin * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(dateStr, margin + 2, y + 5);
    if (e.mood) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Humor: ${MOOD_LABELS[e.mood]}`, pageW - margin - 2, y + 5, { align: 'right' });
    }
    y += 11;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const fields: Array<[string, string]> = [
      ['Acordou', e.wakeTime ?? '—'],
      ['Exercício', e.exerciseDone ? `Sim — ${e.exercise ?? ''}` : 'Não'],
      ['Alimentação', e.meals ?? '—'],
      ['Estudo', e.studyTopic ? `${e.studyTopic}: ${e.studySummary ?? ''}` : '—'],
      ['Ações produtivas', e.productiveActions ?? '—'],
      ['Receita / Despesa', `${formatBRL(e.income)} / ${formatBRL(e.expense)}`],
      ['Reflexões', e.thoughts ?? '—'],
    ];
    for (const [label, value] of fields) {
      if (value === '—') continue;
      const wrapped = doc.splitTextToSize(value, pageW - margin * 2 - 32);
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(wrapped, margin + 34, y);
      y += wrapped.length * 4.6;
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 100, 60);
    const practice = doc.splitTextToSize(e.practice, pageW - margin * 2 - 40);
    doc.text('EM PRÁTICA:', margin + 2, y);
    doc.text(practice, margin + 40, y);
    doc.setTextColor(...DARK);
    y += practice.length * 4.6 + 6;
  }

  // ---- Orçamento do período ----
  if (payload.budget.length > 0) {
    if (y > pageH - 60) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Orçamento', margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Recorrência']],
      body: payload.budget.map((b) => [
        b.date.split('-').reverse().join('/'),
        b.type === 'receita' ? 'Receita' : 'Despesa',
        b.category,
        b.description,
        formatBRL(b.value),
        b.frequency === 'mensal' ? 'Mensal' : 'Única',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: DARK, textColor: [250, 250, 250] },
      columnStyles: { 4: { halign: 'right' } },
      margin: { left: margin, right: margin },
    });
  }

  // ---- Rodapé de página ----
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    doc.text(
      `Gerado pelo Diário da Riqueza • ${new Date(payload.generatedAt).toLocaleString('pt-BR')}`,
      margin,
      pageH - 8,
    );
    doc.setTextColor(...GREEN);
    doc.text(`Página ${i}/${pages}`, pageW - margin, pageH - 8, { align: 'right' });
  }

  return doc;
}
