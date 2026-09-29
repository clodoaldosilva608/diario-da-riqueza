/**
 * Exportação Markdown (.md) — texto puro, sem dependências.
 */

import { formatBRL } from '@/lib/format';
import { GOAL_CATEGORY_LABELS, MOOD_LABELS, STUDY_AREA_LABELS } from '@/types';
import type { ExportPayload } from '@/types';

export function generateMarkdown(payload: ExportPayload): string {
  const L: string[] = [];
  const p = payload.profile;

  L.push(`# 📓 Diário da Riqueza`);
  L.push('');
  L.push(`> **${p?.journalName ?? 'Meu Diário da Riqueza'}** — ${payload.scopeLabel}`);
  L.push(`> Gerado em ${new Date(payload.generatedAt).toLocaleString('pt-BR')}`);
  L.push('');
  if (p) {
    L.push(`- **Treinando:** ${p.name}`);
    L.push(`- **Meta financeira:** ${formatBRL(p.yearGoal)}`);
    L.push(`- **Data-alvo:** ${p.targetDate.split('-').reverse().join('/')}`);
    L.push('');
  }

  if (payload.goals.length > 0 || payload.dreams.length > 0) {
    L.push('## 🌟 Sonhos e Objetivos');
    L.push('');
    if (payload.dreams.length > 0) {
      L.push('### Sonhos');
      L.push('');
      for (const d of payload.dreams) {
        L.push(`- [${d.achieved ? 'x' : ' '}] ${d.title}`);
      }
      L.push('');
    }
    if (payload.goals.length > 0) {
      L.push('### Metas');
      L.push('');
      L.push('| Meta | Categoria | Status | Progresso |');
      L.push('|------|-----------|--------|-----------|');
      for (const g of payload.goals) {
        const prog = g.targetValue
          ? `${Math.round((g.currentValue / g.targetValue) * 100)}%`
          : String(g.currentValue);
        L.push(
          `| ${g.title} | ${GOAL_CATEGORY_LABELS[g.category]} | ${g.status === 'concluida' ? '✅' : '🔄'} | ${prog} |`,
        );
      }
      L.push('');
    }
  }

  L.push('## 📅 Registros Diários');
  L.push('');
  if (payload.entries.length === 0) {
    L.push('_Nenhum registro neste período._');
    L.push('');
  }
  for (const e of payload.entries) {
    L.push(`### ${e.date.split('-').reverse().join('/')}`);
    L.push('');
    if (e.wakeTime) L.push(`- **Acordou:** ${e.wakeTime}`);
    if (e.exerciseDone) L.push(`- **Exercício:** ${e.exercise ?? 'Sim'}`);
    if (e.meals) L.push(`- **Alimentação:** ${e.meals}`);
    if (e.studyTopic) L.push(`- **Estudo:** ${e.studyTopic} — ${e.studySummary ?? ''}`);
    if (e.productiveActions) L.push(`- **Ações produtivas:** ${e.productiveActions}`);
    L.push(`- **Financeiro:** +${formatBRL(e.income)} / -${formatBRL(e.expense)}`);
    if (e.thoughts) L.push(`- **Reflexões:** ${e.thoughts}`);
    if (e.mood) L.push(`- **Humor:** ${MOOD_LABELS[e.mood]}${e.energy ? ` • Energia ${e.energy}/10` : ''}`);
    L.push(`- 💪 **Em prática:** ${e.practice}`);
    L.push('');
  }

  if (payload.budget.length > 0) {
    L.push('## 💰 Orçamento');
    L.push('');
    L.push('| Data | Tipo | Categoria | Descrição | Valor |');
    L.push('|------|------|-----------|-----------|-------|');
    for (const b of payload.budget) {
      L.push(
        `| ${b.date.split('-').reverse().join('/')} | ${b.type === 'receita' ? '🟢 Receita' : '🔴 Despesa'} | ${b.category} | ${b.description} | ${formatBRL(b.value)} |`,
      );
    }
    L.push('');
  }

  const concluidos = payload.studies.filter((s) => s.status === 'concluido');
  if (concluidos.length > 0) {
    L.push('## 📚 Estudos Concluídos');
    L.push('');
    for (const s of concluidos) {
      L.push(`- **${s.topic}** (${STUDY_AREA_LABELS[s.area]})${s.notes ? ` — ${s.notes}` : ''}`);
    }
    L.push('');
  }

  return L.join('\n');
}
