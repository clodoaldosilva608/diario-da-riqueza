/**
 * Diário da Riqueza — Gerador do vault Obsidian (PURO, sem browser/Dexie).
 *
 * Converte um snapshot dos dados em arquivos .md com frontmatter YAML,
 * wikilinks e um dashboard estático (MOC). O arquivo `_dados/diario-da-
 * riqueza.json` carrega o estado completo para o sync entre dispositivos.
 *
 * Convenções:
 * - Pastas e nomes de arquivo em ASCII (seguro em qualquer SO/unzip);
 *   títulos completos vivem no conteúdo e nos aliases dos wikilinks.
 * - O app só gerencia arquivos DENTRO da pasta `Diario_da_Riqueza/`.
 */

import { formatBRL } from '@/lib/format';
import {
  GOAL_CATEGORY_LABELS, MOOD_LABELS, STUDY_AREA_LABELS,
} from '@/types';
import type {
  Profile, DiaryEntry, Goal, Dream, Study, BudgetEntry,
  XPEvent, AchievementRecord, EntryTemplate, DeletedLogEntry,
} from '@/types';
import { computeLevel, computeStreak, computeRecordStreak } from '@/gamification/engine';
import { frontmatter, slugify, bar, escapeMd, tableCell, type VaultFile } from './markdown';

/* ============================== ESTRUTURA ============================== */

export const VAULT_NS = 'Diario_da_Riqueza';

export const VAULT_DIRS = {
  diario: '01-Diario',
  metas: '02-Metas',
  biblioteca: '03-Biblioteca',
  sonhos: '04-Sonhos',
  orcamento: '05-Orcamento',
  dados: '_dados',
} as const;

export const DATA_FILE = `${VAULT_DIRS.dados}/diario-da-riqueza.json`;
export const INDEX_FILE = `${VAULT_DIRS.dados}/indice-arquivos.json`;

/* ============================== SNAPSHOT ============================== */

export interface VaultSnapshot {
  profile?: Profile;
  entries: DiaryEntry[];
  budget: BudgetEntry[];
  goals: Goal[];
  dreams: Dream[];
  studies: Study[];
  xpEvents: XPEvent[];
  achievements: AchievementRecord[];
  templates: EntryTemplate[];
  deletedLog: DeletedLogEntry[];
  deviceId: string;
  geradoEm: string;
}

/* ============================== ESTADO (FASE 3) ============================== */

/** Formato do `_dados/diario-da-riqueza.json` */
export interface SyncStateFile {
  app: 'diario-da-riqueza';
  formato: 2;
  deviceId: string;
  geradoEm: string;
  dados: {
    profile: Profile[];
    entries: DiaryEntry[];
    goals: Goal[];
    budget: BudgetEntry[];
    studies: Study[];
    dreams: Dream[];
    templates: EntryTemplate[];
    xpEvents: XPEvent[];
    achievements: AchievementRecord[];
    /** Tombstones — deleções que devem se propagar entre dispositivos */
    deletions: DeletedLogEntry[];
  };
}

export function buildStateFile(snap: VaultSnapshot): string {
  const state: SyncStateFile = {
    app: 'diario-da-riqueza',
    formato: 2,
    deviceId: snap.deviceId,
    geradoEm: snap.geradoEm,
    dados: {
      profile: snap.profile ? [snap.profile] : [],
      entries: snap.entries,
      goals: snap.goals,
      budget: snap.budget,
      studies: snap.studies,
      dreams: snap.dreams,
      templates: snap.templates,
      xpEvents: snap.xpEvents,
      achievements: snap.achievements,
      deletions: snap.deletedLog,
    },
  };
  return JSON.stringify(state, null, 2);
}

export function parseStateFile(json: string): SyncStateFile | null {
  try {
    const parsed = JSON.parse(json) as SyncStateFile;
    if (parsed?.app !== 'diario-da-riqueza' || parsed?.formato !== 2 || !parsed.dados) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ============================== HELPERS ============================== */

const brl = (n: number) => formatBRL(n);
const ddmm = (iso: string) => iso.split('-').reverse().join('/');

function fmtBRLYaml(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Dedupe de nomes de arquivo dentro da mesma pasta */
class NamePool {
  private used = new Set<string>();
  next(base: string): string {
    let name = base;
    let i = 2;
    while (this.used.has(name)) name = `${base}-${i++}`;
    this.used.add(name);
    return name;
  }
}

function goalLink(title: string): string {
  return `[[${VAULT_DIRS.metas}/${slugify(title)}|${title}]]`;
}
function entryLink(date: string): string {
  return `[[${VAULT_DIRS.diario}/${date}|${ddmm(date)}]]`;
}

function activeGoals(goals: Goal[]): Goal[] {
  return goals
    .filter((g) => g.status === 'ativa')
    .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
}

function goalPct(g: Goal): number {
  if (!g.targetValue || g.targetValue <= 0) return 0;
  return Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
}

/* ============================== DASHBOARD ============================== */

function buildDashboard(snap: VaultSnapshot): string {
  const L: string[] = [];
  const p = snap.profile;
  const totalXP = snap.xpEvents.reduce((s, e) => s + e.amount, 0);
  const level = computeLevel(totalXP);
  const streak = computeStreak(snap.entries);
  const record = computeRecordStreak(snap.entries);
  const ativas = activeGoals(snap.goals);
  const concluidas = snap.goals.filter((g) => g.status === 'concluida');
  const estudosAtivos = snap.studies.filter((s) => s.status === 'estudando');
  const estudosOk = snap.studies.filter((s) => s.status === 'concluido');
  const ultimas = [...snap.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  L.push(frontmatter([
    ['app', 'diario-da-riqueza'],
    ['tipo', 'dashboard'],
    ['gerado-em', snap.geradoEm],
    ['tags', ['diario-riqueza', 'moc']],
  ]));
  L.push('');
  L.push(`# 📓 ${p?.journalName ?? 'Diário da Riqueza'} — Dashboard`);
  L.push('');
  L.push(`> MOC gerado pelo app. **Treinando:** ${p?.name ?? '—'} • Meta financeira: **${p ? brl(p.yearGoal) : '—'}** até **${p ? ddmm(p.targetDate) : '—'}**.`);
  L.push('');

  L.push('## 🏆 Progresso');
  L.push('');
  L.push(`- **XP total:** ${totalXP} — Nível **${level.name}**`);
  L.push(`- **Nível:** ${bar(level.progress)} ${level.progress}%`);
  L.push(`- **Streak atual:** ${streak} dia(s) • **Recorde:** ${record} dia(s)`);
  L.push(`- **Entradas no diário:** ${snap.entries.length}`);
  L.push('');

  L.push('## 🎯 Metas ativas');
  L.push('');
  if (ativas.length === 0) {
    L.push('_Nenhuma meta ativa._');
  } else {
    L.push('| Meta | Categoria | Progresso | Prazo |');
    L.push('|------|-----------|:---------:|-------|');
    for (const g of ativas) {
      const pct = goalPct(g);
      L.push(`| ${goalLink(g.title)} | ${GOAL_CATEGORY_LABELS[g.category]} | ${bar(pct)} | ${g.deadline ? ddmm(g.deadline) : '—'} |`);
    }
  }
  L.push('');
  if (concluidas.length > 0) {
    L.push(`**Concluídas (${concluidas.length}):** ${concluidas.map((g) => `✅ ${goalLink(g.title)}`).join(' • ')}`);
    L.push('');
  }

  L.push('## 🌟 Sonhos');
  L.push('');
  if (snap.dreams.length === 0) {
    L.push('_Nenhum sonho registrado._');
  } else {
    for (const d of snap.dreams) {
      L.push(`- [${d.achieved ? 'x' : ' '}] [[${VAULT_DIRS.sonhos}/${slugify(d.title)}|${d.title}]]`);
    }
  }
  L.push('');

  L.push('## 📚 Biblioteca');
  L.push('');
  if (estudosAtivos.length > 0) {
    L.push('**Em andamento:**');
    L.push('');
    for (const s of estudosAtivos) {
      L.push(`- ${bar(s.progress)} ${s.progress}% — [[${VAULT_DIRS.biblioteca}/${slugify(s.topic)}|${s.topic}]] (${STUDY_AREA_LABELS[s.area]})`);
    }
    L.push('');
  }
  L.push(
    estudosOk.length > 0
      ? `**Concluídos (${estudosOk.length}):** ${estudosOk.map((s) => `✅ [[${VAULT_DIRS.biblioteca}/${slugify(s.topic)}|${s.topic}]]`).join(' • ')}`
      : '_Nenhum estudo concluído ainda._',
  );
  L.push('');

  L.push('## 📅 Últimos registros');
  L.push('');
  if (ultimas.length === 0) {
    L.push('_Nenhuma entrada ainda — comece hoje._');
  } else {
    for (const e of ultimas) {
      L.push(`- ${entryLink(e.date)} — 💪 ${tableCell(e.practice).slice(0, 80)}${e.practice.length > 80 ? '…' : ''}`);
    }
  }
  L.push('');

  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const doMes = snap.budget.filter((b) => b.date.startsWith(mesAtual));
  const rec = doMes.filter((b) => b.type === 'receita').reduce((s, b) => s + b.value, 0);
  const des = doMes.filter((b) => b.type === 'despesa').reduce((s, b) => s + b.value, 0);
  L.push('## 💰 Orçamento do mês');
  L.push('');
  L.push(`- Receitas: **${brl(rec)}** • Despesas: **${brl(des)}** • Saldo: **${brl(rec - des)}**`);
  L.push(`- Detalhe: [[${VAULT_DIRS.orcamento}/${mesAtual}|${mesAtual}]]`);
  L.push('');
  L.push('---');
  L.push(`_Gerado pelo app Diário da Riqueza em ${new Date(snap.geradoEm).toLocaleString('pt-BR')}._`);
  L.push('_Sincronize pelo app para atualizar este dashboard._');
  return L.join('\n');
}

/* ============================== ENTRADA DIÁRIA ============================== */

export function buildEntryFile(e: DiaryEntry, goals: Goal[]): string {
  const L: string[] = [];
  L.push(frontmatter([
    ['app', 'diario-da-riqueza'],
    ['tipo', 'diario'],
    ['uid', e.uid ?? ''],
    ['id', e.id ?? 0],
    ['data', e.date],
    ['humor', e.mood ?? ''],
    ['energia', typeof e.energy === 'number' ? e.energy : ''],
    ['receita', fmtBRLYaml(e.income)],
    ['despesa', fmtBRLYaml(e.expense)],
    ['xp', e.xpEarned],
    ['criado-em', e.createdAt],
    ['editado-em', e.updatedAt ?? e.createdAt],
    ['tags', ['diario-riqueza']],
  ]));
  L.push('');
  L.push(`# 📔 Diário — ${ddmm(e.date)}`);
  L.push('');
  L.push('## Resumo do dia');
  L.push('');
  if (e.wakeTime) L.push(`- **Acordou:** ${e.wakeTime}`);
  if (e.exerciseDone) L.push(`- **Exercício:** ${e.exercise || 'Sim'}`);
  if (e.meals) L.push(`- **Alimentação:** ${e.meals}`);
  if (e.studyTopic) L.push(`- **Estudo:** ${e.studyTopic}${e.studySummary ? ` — ${e.studySummary}` : ''}`);
  L.push(`- **Financeiro:** +${brl(e.income)} / −${brl(e.expense)}`);
  if (e.mood) L.push(`- **Humor:** ${MOOD_LABELS[e.mood]}${typeof e.energy === 'number' ? ` • Energia ${e.energy}/10` : ''}`);
  L.push('');

  if (e.productiveActions?.trim()) {
    L.push('## Ações produtivas');
    L.push('');
    for (const line of e.productiveActions.split('\n').filter((l) => l.trim())) {
      L.push(line.startsWith('-') || /^\d+[.)]/.test(line.trim()) ? line : `- ${line}`);
    }
    L.push('');
  }

  L.push('## Reflexões');
  L.push('');
  L.push(e.thoughts?.trim() ? escapeMd(e.thoughts.trim()) : '_—_');
  L.push('');
  L.push('## Em prática');
  L.push('');
  L.push(e.practice?.trim() ? escapeMd(e.practice.trim()) : '_—_');
  L.push('');

  const ativas = activeGoals(goals);
  if (ativas.length > 0) {
    L.push('## Metas em foco');
    L.push('');
    for (const g of ativas.slice(0, 5)) {
      const pct = goalPct(g);
      const detalhe = g.targetValue ? ` (${brl(g.currentValue)} / ${brl(g.targetValue)})` : '';
      L.push(`- ${bar(pct)} ${pct}% — ${goalLink(g.title)}${detalhe}`);
    }
    L.push('');
  }
  return L.join('\n');
}

/* ============================== META / ESTUDO / SONHO ============================== */

function buildGoalFile(g: Goal): string {
  const pct = goalPct(g);
  const L: string[] = [];
  L.push(frontmatter([
    ['app', 'diario-da-riqueza'],
    ['tipo', 'meta'],
    ['uid', g.uid ?? ''],
    ['id', g.id ?? 0],
    ['categoria', g.category],
    ['status', g.status],
    ['alvo', typeof g.targetValue === 'number' ? fmtBRLYaml(g.targetValue) : ''],
    ['atual', fmtBRLYaml(g.currentValue)],
    ['prazo', g.deadline ?? ''],
    ['criado-em', g.createdAt],
    ['editado-em', g.updatedAt ?? g.createdAt],
    ['tags', ['diario-riqueza', 'meta']],
  ]));
  L.push('');
  L.push(`# 🎯 ${g.title}`);
  L.push('');
  if (g.description?.trim()) {
    L.push(`> ${g.description.trim().replace(/\n/g, '\n> ')}`);
    L.push('');
  }
  L.push(`**Categoria:** ${GOAL_CATEGORY_LABELS[g.category]} • **Status:** ${g.status === 'concluida' ? '✅ concluída' : '🔄 ativa'}`);
  L.push('');
  if (g.targetValue) {
    L.push(`**Progresso:** ${bar(pct)} ${pct}%`);
    L.push('');
    L.push(`**Atual:** ${brl(g.currentValue)} de ${brl(g.targetValue)}`);
    L.push('');
  }
  if (g.deadline) L.push(`**Prazo:** ${ddmm(g.deadline)}`);
  if (g.completedAt) L.push(`**Concluída em:** ${new Date(g.completedAt).toLocaleDateString('pt-BR')}`);
  L.push('');
  L.push(`_Voltar ao [[00-Dashboard|dashboard]]_`);
  return L.join('\n');
}

function buildStudyFile(s: Study): string {
  const L: string[] = [];
  L.push(frontmatter([
    ['app', 'diario-da-riqueza'],
    ['tipo', 'estudo'],
    ['uid', s.uid ?? ''],
    ['id', s.id ?? 0],
    ['area', s.area],
    ['status', s.status],
    ['progresso', s.progress],
    ['criado-em', s.createdAt],
    ['editado-em', s.updatedAt ?? s.createdAt],
    ['concluido-em', s.completedAt ?? ''],
    ['tags', ['diario-riqueza', 'estudo']],
  ]));
  L.push('');
  L.push(`# 📚 ${s.topic}`);
  L.push('');
  if (s.description?.trim()) {
    L.push(`> ${s.description.trim().replace(/\n/g, '\n> ')}`);
    L.push('');
  }
  L.push(`**Área:** ${STUDY_AREA_LABELS[s.area]} • **Status:** ${s.status === 'concluido' ? '✅ concluído' : s.status === 'estudando' ? '📖 estudando' : '⏳ não iniciado'} • **Progresso:** ${bar(s.progress)} ${s.progress}%`);
  L.push('');
  L.push('## O que aprendi');
  L.push('');
  L.push(s.notes?.trim() ? escapeMd(s.notes.trim()) : '_—_');
  L.push('');
  L.push(`_Voltar ao [[00-Dashboard|dashboard]]_`);
  return L.join('\n');
}

function buildDreamFile(d: Dream): string {
  const L: string[] = [];
  L.push(frontmatter([
    ['app', 'diario-da-riqueza'],
    ['tipo', 'sonho'],
    ['uid', d.uid ?? ''],
    ['id', d.id ?? 0],
    ['realizado', d.achieved],
    ['criado-em', d.createdAt],
    ['editado-em', d.updatedAt ?? d.createdAt],
    ['tags', ['diario-riqueza', 'sonho']],
  ]));
  L.push('');
  L.push(`# 🌟 ${d.title}`);
  L.push('');
  L.push(`- [${d.achieved ? 'x' : ' '}] Realizado`);
  L.push('');
  if (d.description?.trim()) {
    L.push(d.description.trim());
    L.push('');
  }
  L.push(`_Voltar ao [[00-Dashboard|dashboard]]_`);
  return L.join('\n');
}

/* ============================== ORÇAMENTO ============================== */

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function buildBudgetFile(mes: string, entries: BudgetEntry[]): string {
  const [y, m] = mes.split('-').map(parseInt);
  const ordenados = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const rec = ordenados.filter((b) => b.type === 'receita').reduce((s, b) => s + b.value, 0);
  const des = ordenados.filter((b) => b.type === 'despesa').reduce((s, b) => s + b.value, 0);
  const L: string[] = [];
  L.push(frontmatter([
    ['app', 'diario-da-riqueza'],
    ['tipo', 'orcamento'],
    ['mes', mes],
    ['receita', fmtBRLYaml(rec)],
    ['despesa', fmtBRLYaml(des)],
    ['saldo', fmtBRLYaml(rec - des)],
    ['tags', ['diario-riqueza', 'orcamento']],
  ]));
  L.push('');
  L.push(`# 💰 Orçamento — ${MESES[m - 1]} de ${y}`);
  L.push('');
  if (ordenados.length === 0) {
    L.push('_Nenhum lançamento neste mês._');
    return L.join('\n');
  }
  L.push('| Data | Tipo | Categoria | Descrição | Valor | Freq. |');
  L.push('|------|------|-----------|-----------|------:|-------|');
  for (const b of ordenados) {
    L.push(
      `| ${ddmm(b.date)} | ${b.type === 'receita' ? '🟢' : '🔴'} | ${tableCell(b.category)} | ${tableCell(b.description)} | ${b.type === 'receita' ? '+' : '−'}${brl(b.value)} | ${b.frequency === 'mensal' ? 'mensal' : 'única'} |`,
    );
  }
  L.push('');
  L.push(`**Receitas:** ${brl(rec)} • **Despesas:** ${brl(des)} • **Saldo:** ${brl(rec - des)}`);
  return L.join('\n');
}

/* ============================== GERADOR PRINCIPAL ============================== */

/** Gera todos os arquivos do vault a partir do snapshot (puro) */
export function buildVaultFiles(snap: VaultSnapshot): VaultFile[] {
  const files: VaultFile[] = [];
  const geradoEm = snap.geradoEm;

  // Dashboard
  files.push({ path: '00-Dashboard.md', content: buildDashboard(snap) });

  // Diário (ordem cronológica)
  const entradas = [...snap.entries].sort((a, b) => a.date.localeCompare(b.date));
  for (const e of entradas) {
    files.push({ path: `${VAULT_DIRS.diario}/${e.date}.md`, content: buildEntryFile(e, snap.goals) });
  }

  // Metas
  const poolMetas = new NamePool();
  for (const g of snap.goals) {
    files.push({
      path: `${VAULT_DIRS.metas}/${poolMetas.next(slugify(g.title))}.md`,
      content: buildGoalFile(g),
    });
  }

  // Biblioteca — apenas estudos com conteúdo do usuário (evita 20 seeds vazios)
  for (const s of snap.studies) {
    const iniciado = s.status !== 'nao_iniciado' || (s.notes?.trim().length ?? 0) > 0;
    if (!iniciado) continue;
    files.push({ path: `${VAULT_DIRS.biblioteca}/${slugify(s.topic)}.md`, content: buildStudyFile(s) });
  }

  // Sonhos
  const poolSonhos = new NamePool();
  for (const d of snap.dreams) {
    files.push({
      path: `${VAULT_DIRS.sonhos}/${poolSonhos.next(slugify(d.title))}.md`,
      content: buildDreamFile(d),
    });
  }

  // Orçamento por mês
  const porMes = new Map<string, BudgetEntry[]>();
  for (const b of snap.budget) {
    const mes = b.date.slice(0, 7);
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes)!.push(b);
  }
  for (const [mes, items] of [...porMes.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    files.push({ path: `${VAULT_DIRS.orcamento}/${mes}.md`, content: buildBudgetFile(mes, items) });
  }

  // Estado para sync multi-dispositivo (Fase 3)
  files.push({ path: DATA_FILE, content: buildStateFile(snap) });

  return files;
}
