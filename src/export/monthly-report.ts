/**
 * PDF do Relatório Mensal — "Seu mês em números" em uma página caprichada
 * (identidade preto + dourado do projeto). Reutiliza o pipeline jsPDF
 * existente e o motor de cálculo src/lib/report.ts.
 */

import { jsPDF } from 'jspdf';
import { formatBRL } from '@/lib/format';
import { reportMonthLabel, type MonthlyReport } from '@/lib/report';

const GOLD: [number, number, number] = [176, 141, 40];
const DARK: [number, number, number] = [24, 24, 27];
const GREEN: [number, number, number] = [16, 185, 129];
const RED: [number, number, number] = [220, 80, 80];
const GREY: [number, number, number] = [120, 120, 130];

function metric(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  color: [number, number, number] = DARK,
) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...color);
  doc.text(value, x, y + 7);
}

function delta(doc: jsPDF, x: number, y: number, v: number | null, invert = false) {
  if (v === null) return;
  const good = invert ? v < 0 : v > 0;
  const sign = v > 0 ? '+' : '';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...(v === 0 ? GREY : good ? GREEN : RED));
  doc.text(`${sign}${typeof v === 'number' && Math.abs(v) >= 1000 ? formatBRL(v) : `${sign}${v}`}`, x, y);
}

export function generateMonthlyReportPDF(
  report: MonthlyReport,
  userName?: string,
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 18;

  /* ---- Faixa preta superior ---- */
  doc.setFillColor(12, 12, 14);
  doc.rect(0, 0, W, 34, 'F');
  doc.setTextColor(...GOLD);
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.text('Diário da Riqueza', M, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(230, 230, 235);
  doc.text(`Relatório mensal — ${reportMonthLabel(report.year, report.month)}`, M, 26);
  if (userName) {
    doc.setTextColor(170, 170, 180);
    doc.text(userName, W - M, 15, { align: 'right' });
  }
  doc.setTextColor(150, 150, 160);
  doc.text('diariodariqueza.vercel.app', W - M, 26, { align: 'right' });

  let y = 52;
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Dinheiro', M, y);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(M, y + 2, M + 30, y + 2);
  y += 10;

  /* ---- Métricas financeiras ---- */
  const col = (W - M * 2) / 4;
  metric(doc, M, y, 'Receitas', formatBRL(report.income), GREEN);
  metric(doc, M + col, y, 'Despesas', formatBRL(report.expense), RED);
  metric(
    doc,
    M + col * 2,
    y,
    'Saldo',
    formatBRL(report.balance),
    report.balance >= 0 ? GREEN : RED,
  );
  metric(doc, M + col * 3, y, 'Taxa de poupança', `${report.savingRate}%`);
  if (report.comparison) {
    delta(doc, M + col * 2, y + 14, report.comparison.balance);
    delta(doc, M + col, y + 14, report.comparison.expense, true);
  }
  y += 26;

  /* ---- Consistência ---- */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text('Consistência', M, y);
  doc.line(M, y + 2, M + 32, y + 2);
  y += 10;
  metric(doc, M, y, 'Dias registrados', String(report.daysRegistered));
  if (report.comparison && report.comparison.daysRegistered !== null) {
    delta(doc, M, y + 14, report.comparison.daysRegistered);
  }
  metric(doc, M + col, y, 'Dias com prática', String(report.practiceDays));
  metric(doc, M + col * 2, y, 'Dias de treino', String(report.exerciseDays));
  metric(doc, M + col * 3, y, 'Dias produtivos', String(report.productiveDays));
  y += 26;

  /* ---- Estudos, XP e cofrinhos ---- */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text('Evolução', M, y);
  doc.line(M, y + 2, M + 26, y + 2);
  y += 10;
  metric(doc, M, y, 'XP do mês', String(report.xpGained));
  metric(doc, M + col, y, 'Estudos concluídos', String(report.studiesCompleted));
  metric(doc, M + col * 2, y, 'Guardado no cofrinho', formatBRL(report.depositTotal));
  metric(doc, M + col * 3, y, 'Depósitos', String(report.depositCount));
  if (report.bestDay) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(
      `Melhor dia: ${report.bestDay.date.split('-').reverse().join('/')} (+${report.bestDay.xp} XP)`,
      M,
      y + 14,
    );
  }
  y += 30;

  /* ---- Top categorias ---- */
  if (report.topCategories.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text('Onde o dinheiro foi (top categorias)', M, y);
    doc.line(M, y + 2, M + 70, y + 2);
    y += 10;

    const max = report.topCategories[0]?.total ?? 1;
    const barMaxW = W - M * 2 - 55;
    for (const cat of report.topCategories) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text(cat.name, M, y);
      const bw = Math.max(2, (cat.total / max) * barMaxW);
      doc.setFillColor(...GOLD);
      doc.rect(M + 50, y - 3.4, bw, 4.6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(formatBRL(cat.total), M + 50 + bw + 3, y);
      y += 7.4;
    }
  }

  /* ---- Rodapé institucional ---- */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text(
    'Ferramenta de organização pessoal — não substitui orientação profissional.',
    M,
    285,
  );
  doc.text(
    'Gratuito e offline • Siga @dirio.da.riqueza8 no TikTok',
    W - M,
    285,
    { align: 'right' },
  );

  return doc;
}

/** Gera e baixa o PDF do relatório */
export function downloadMonthlyReportPDF(report: MonthlyReport, userName?: string): void {
  const doc = generateMonthlyReportPDF(report, userName);
  doc.save(`DR_Relatorio_${report.year}-${String(report.month + 1).padStart(2, '0')}.pdf`);
}
