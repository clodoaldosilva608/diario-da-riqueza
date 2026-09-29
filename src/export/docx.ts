/**
 * Exportação Word (.docx) — biblioteca docx + Packer.toBlob
 */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from 'docx';
import { formatBRL } from '@/lib/format';
import { GOAL_CATEGORY_LABELS } from '@/types';
import type { ExportPayload } from '@/types';

const GOLD = 'B08D28';
const DARK = '18181B';

function heading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 4 },
    },
  });
}

function subheading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
  });
}

function para(text: string, bold = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold, size: 22 })],
    spacing: { after: 80 },
  });
}

function labeled(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22, color: DARK }),
      new TextRun({ text: value || '—', size: 22 }),
    ],
    spacing: { after: 60 },
  });
}

function cell(text: string, opts: { bold?: boolean; color?: string } = {}): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: opts.bold, size: 20, color: opts.color })],
      }),
    ],
  });
}

export async function generateDocx(payload: ExportPayload): Promise<Blob> {
  const children: Array<Paragraph | Table> = [];

  // Capa
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Diário da Riqueza', bold: true, size: 56, color: GOLD }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 2800, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: payload.profile?.journalName ?? 'Meu Diário da Riqueza', size: 30, color: DARK })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: payload.scopeLabel, size: 24, color: '666666' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({ children: [], pageBreakBefore: true }),
  );

  if (payload.profile) {
    children.push(heading('Visão Geral'));
    children.push(labeled('Nome', payload.profile.name));
    children.push(labeled('Meta financeira', formatBRL(payload.profile.yearGoal)));
    children.push(labeled('Data-alvo', payload.profile.targetDate.split('-').reverse().join('/')));
  }

  if (payload.goals.length > 0 || payload.dreams.length > 0) {
    children.push(heading('Sonhos e Metas'));
    if (payload.dreams.length > 0) {
      children.push(subheading('Sonhos'));
      payload.dreams.forEach((d) =>
        children.push(para(`${d.achieved ? '✓' : '○'} ${d.title}`, d.achieved)),
      );
    }
    if (payload.goals.length > 0) {
      children.push(subheading('Metas'));
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                cell('Meta', { bold: true, color: 'FFFFFF' }),
                cell('Categoria', { bold: true, color: 'FFFFFF' }),
                cell('Status', { bold: true, color: 'FFFFFF' }),
                cell('Progresso', { bold: true, color: 'FFFFFF' }),
              ],
            }),
            ...payload.goals.map(
              (g) =>
                new TableRow({
                  children: [
                    cell(g.title),
                    cell(GOAL_CATEGORY_LABELS[g.category]),
                    cell(g.status === 'concluida' ? 'Concluída' : 'Ativa'),
                    cell(
                      g.targetValue
                        ? `${Math.round((g.currentValue / g.targetValue) * 100)}%`
                        : String(g.currentValue),
                    ),
                  ],
                }),
            ),
          ],
        }),
      );
    }
  }

  children.push(heading('Registros Diários'));
  if (payload.entries.length === 0) {
    children.push(para('Nenhum registro neste período.', true));
  }
  for (const e of payload.entries) {
    children.push(
      subheading(
        `${e.date.split('-').reverse().join('/')}${e.mood ? ` — Humor: ${e.mood}` : ''}`,
      ),
    );
    children.push(labeled('Acordou', e.wakeTime ?? '—'));
    children.push(labeled('Exercício', e.exerciseDone ? `Sim — ${e.exercise ?? ''}` : 'Não'));
    if (e.meals) children.push(labeled('Alimentação', e.meals));
    if (e.studyTopic) children.push(labeled('Estudo', `${e.studyTopic}: ${e.studySummary ?? ''}`));
    if (e.productiveActions) children.push(labeled('Ações produtivas', e.productiveActions));
    children.push(
      labeled('Receita / Despesa', `${formatBRL(e.income)} / ${formatBRL(e.expense)}`),
    );
    if (e.thoughts) children.push(labeled('Reflexões', e.thoughts));
    children.push(labeled('EM PRÁTICA HOJE', e.practice));
  }

  if (payload.budget.length > 0) {
    children.push(heading('Orçamento'));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              cell('Data', { bold: true, color: 'FFFFFF' }),
              cell('Tipo', { bold: true, color: 'FFFFFF' }),
              cell('Categoria', { bold: true, color: 'FFFFFF' }),
              cell('Descrição', { bold: true, color: 'FFFFFF' }),
              cell('Valor', { bold: true, color: 'FFFFFF' }),
            ],
          }),
          ...payload.budget.map(
            (b) =>
              new TableRow({
                children: [
                  cell(b.date.split('-').reverse().join('/')),
                  cell(b.type === 'receita' ? 'Receita' : 'Despesa'),
                  cell(b.category),
                  cell(b.description),
                  cell(formatBRL(b.value)),
                ],
              }),
          ),
        ],
      }),
    );
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
