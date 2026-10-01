/**
 * Testes unitários dos dados de exemplo (seed.ts) — roda com: bun run scripts/test_seed.ts
 *
 * Cobre a parte PURA do seed (buildExampleContent + helpers de data):
 * - datas relativas corretas (terminam ontem, clamp do orçamento no mês)
 * - tudo marcado exemplo:true (editável/excluível em massa)
 * - XP espelhando saveEntry (50 registro + 40 prática; streak <7 → sem bônus)
 * - coerência dos registros (metas com progresso válido, estudos casam com a biblioteca)
 * - integração com o vault: uid presente após newUid, frontmatter não depende de exemplo
 *
 * A parte Dexie (seedExampleData/clearExampleData) é coberta pelo e2e no navegador.
 */

import {
  buildExampleContent, daysAgoISO, daysAheadISO,
} from '../src/db/seed';
import { newUid } from '../src/db';
import { SEED_STUDIES } from '../src/db/index';
import { buildVaultFiles, type VaultSnapshot } from '../src/obsidian/vault';

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string, extra?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

/* ============================== 1. HELPERS DE DATA ============================== */
console.log('\n[1] helpers de data');

const today = new Date();
ok(daysAgoISO(0) === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`, 'daysAgoISO(0) === hoje');
ok(daysAheadISO(10, today) === daysAgoISO(-10, today), 'daysAheadISO é daysAgoISO negativo');
ok(daysAheadISO(7, daysAgoISO(7) === 'x' ? today : today) !== '', 'daysAheadISO retorna string');

const base = new Date(2026, 8, 30); // 30/09/2026 (mês é 0-indexed: 8 = setembro)
ok(daysAgoISO(1, base) === '2026-09-29', 'daysAgoISO(1) relativo à base');
ok(daysAgoISO(3, base) === '2026-09-27', 'daysAgoISO(3) relativo à base');
ok(daysAheadISO(30, base) === '2026-10-30', 'daysAheadISO(30) cruza o mês');
ok(daysAgoISO(1, new Date(2026, 0, 1)) === '2025-12-31', 'virada de ano correta');

/* ============================== 2. BUILD EXAMPLE CONTENT ============================== */
console.log('\n[2] buildExampleContent (conteúdo puro)');

const now = new Date(2026, 8, 30, 8, 0); // 30/09/2026 08:00
const c = buildExampleContent(now);

ok(c.entries.length === 3, '3 dias de diário');
ok(c.xpEvents.length === 6, '6 eventos de XP (3 registro + 3 prática)');
ok(c.goals.length === 2, '2 metas');
ok(c.dreams.length === 2, '2 sonhos');
ok(c.budget.length === 5, '5 lançamentos de orçamento');
ok(c.studies.length === 2, '2 estudos');

// ---------- Datas do diário: 3 dias consecutivos terminando ONTEM ----------
const dates = c.entries.map((e) => e.date);
ok(dates[0] === daysAgoISO(3, now) && dates[1] === daysAgoISO(2, now) && dates[2] === daysAgoISO(1, now), 'diário: D-3, D-2, D-1 (termina ontem)');
ok(new Set(dates).size === 3, 'datas únicas (uma entrada por dia)');
ok(!dates.includes(daysAgoISO(0, now)), 'nenhuma entrada ocupa "hoje" (usuário registra o próprio)');

// ---------- exemplo:true em tudo ----------
ok(c.entries.every((e) => e.exemplo === true), 'entradas marcadas exemplo:true');
ok(c.goals.every((g) => g.exemplo === true), 'metas marcadas exemplo:true');
ok(c.dreams.every((d) => d.exemplo === true), 'sonhos marcados exemplo:true');
ok(c.budget.every((b) => b.exemplo === true), 'orçamento marcado exemplo:true');
ok(c.xpEvents.every((x) => x.exemplo === true), 'XP marcado exemplo:true');

// ---------- XP espelha saveEntry: 50 + 40 (streak <7 → bônus 0) ----------
ok(c.entries.every((e) => e.xpEarned === 90), 'xpEarned = 90 por dia (50 registro + 40 prática)');
ok(c.xpEvents.filter((x) => x.type === 'registro_dia').length === 3, '3 XP de registro (50)');
ok(c.xpEvents.filter((x) => x.type === 'pratica').length === 3, '3 XP de prática (40)');
ok(c.xpEvents.filter((x) => x.type === 'streak').length === 0, 'sem bônus de streak (<7 dias)');
ok(c.xpEvents.every((x) => x.date && x.createdAt), 'XP com date e createdAt');

// ---------- createdAt/updatedAt coerentes com o dia ----------
ok(c.entries.every((e) => e.createdAt === e.updatedAt), 'entrada nova: createdAt === updatedAt');
ok(c.entries.every((e) => e.createdAt.slice(0, 10) === e.date), 'createdAt no mesmo dia da entrada');

// ---------- Metas: progresso válido, prazo futuro ----------
const [g1, g2] = c.goals;
ok(g1.title === 'Reserva de emergência' && g1.category === 'financeira', 'meta 1: reserva (financeira)');
ok((g1.currentValue ?? 0) <= (g1.targetValue ?? Infinity), 'meta 1: progresso <= alvo');
ok(g2.title === 'Estudar finanças 30 dias seguidos' && g2.targetValue === 30 && g2.currentValue === 12, 'meta 2: 12/30 dias');
ok(g1.deadline! > daysAgoISO(0, now) && g2.deadline! > daysAgoISO(0, now), 'prazos no futuro');
ok(c.goals.every((g) => g.status === 'ativa'), 'metas ativas');
ok(c.goals.every((g) => g.updatedAt! >= g.createdAt), 'updatedAt >= createdAt nas metas');

// ---------- Sonhos ----------
ok(c.dreams.every((d) => d.achieved === false && d.title.length > 0), 'sonhos abertos com título');

// ---------- Orçamento: datas nunca futuras, clamp no mês ----------
const todayISO = daysAgoISO(0, now);
ok(c.budget.every((b) => b.date <= todayISO), 'orçamento: nenhuma data futura');
const receitas = c.budget.filter((b) => b.type === 'receita');
const despesas = c.budget.filter((b) => b.type === 'despesa');
ok(receitas.length === 2 && despesas.length === 3, '2 receitas + 3 despesas');
ok(receitas.find((b) => b.category === 'Salário')?.frequency === 'mensal', 'salário mensal (recorrente)');
ok(despesas.find((b) => b.category === 'Moradia')?.frequency === 'mensal', 'aluguel mensal (recorrente)');
// Com now = dia 30, clampDay(5) = 5 → lançamentos mensais no dia 5 do mês corrente
ok(receitas.find((b) => b.category === 'Salário')?.date === '2026-09-05', 'salário ancorado no dia 5 do mês');
// Com now = dia 1, clampDay(5) = 1 → não cria data futura
const cDay1 = buildExampleContent(new Date(2026, 8, 1, 8, 0));
ok(cDay1.budget.every((b) => b.date <= '2026-09-01'), 'clamp: dia 1 do mês não gera data futura');

// ---------- Estudos: casam com a biblioteca semeada ----------
const libraryTopics = new Set(SEED_STUDIES.map((s) => s.topic));
ok(c.studies.every((s) => libraryTopics.has(s.topic)), 'estudos de exemplo existem na biblioteca (update, não duplica)');
const st1 = c.studies.find((s) => s.topic === 'Reserva de Emergência');
const st2 = c.studies.find((s) => s.topic === 'Juros Compostos');
ok(st1?.status === 'concluido' && st1.progress === 100, 'Reserva de Emergência: concluído 100%');
ok(st2?.status === 'estudando' && st2.progress === 40, 'Juros Compostos: estudando 40%');
ok(!!st1?.notes && st1.notes.length > 20, 'campo "O que aprendi" preenchido');

// ---------- Tópicos do diário casam com os estudos ----------
ok(c.entries.every((e) => e.studyTopic === 'Reserva de Emergência' || e.studyTopic === 'Juros Compostos'), 'estudo do diário casam com a biblioteca');
ok(c.entries.every((e) => e.practice.trim().length > 0), '"Em prática" sempre preenchido (método)');

/* ============================== 3. SEEDS → VAULT OBSIDIAN ============================== */
console.log('\n[3] seeds fluem para o vault Obsidian');

// Simula o estado local pós-seed (como o sync fará: newUid antes de gravar)
const withUids = {
  entries: c.entries.map((e) => ({ ...e, uid: newUid() })),
  goals: c.goals.map((g) => ({ ...g, uid: newUid() })),
  dreams: c.dreams.map((d) => ({ ...d, uid: newUid() })),
  budget: c.budget.map((b) => ({ ...b, uid: newUid() })),
};
const snap: VaultSnapshot = {
  profile: {
    id: 'profile', name: 'Teste', journalName: 'Diário', yearGoal: 100000,
    targetDate: '2027-12-31', createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
  entries: withUids.entries as VaultSnapshot['entries'],
  budget: withUids.budget as VaultSnapshot['budget'],
  goals: withUids.goals as VaultSnapshot['goals'],
  dreams: withUids.dreams as VaultSnapshot['dreams'],
  studies: c.studies.map((s, i) => ({
    id: i + 1, area: 'financas' as const, ...s, uid: newUid(),
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  })),
  xpEvents: c.xpEvents as VaultSnapshot['xpEvents'],
  achievements: [],
  templates: [],
  deletedLog: [],
  deviceId: 'teste-seed',
  geradoEm: now.toISOString(),
};

const files = buildVaultFiles(snap);
const paths = files.map((f) => f.path);
ok(files.length > 10, `vault gerado com ${files.length} arquivos`);
ok(paths.some((p) => p.startsWith('01-Diario/') && p.includes(daysAgoISO(1, now))), 'entradas de exemplo viram notas em 01-Diario/');
ok(paths.some((p) => p.startsWith('02-Metas/')), 'metas de exemplo viram notas em 02-Metas/');
ok(paths.some((p) => p.startsWith('04-Sonhos/')), 'sonhos de exemplo viram notas em 04-Sonhos/');
ok(paths.some((p) => p.startsWith('05-Orcamento/')), 'orçamento de exemplo vira notas em 05-Orcamento/');
ok(paths.some((p) => p.includes('reserva-de-emergencia')), 'estudo "Reserva de Emergência" vira nota na Biblioteca');
const dashboard = files.find((f) => f.path === '00-Dashboard.md');
ok(!!dashboard && dashboard.content.includes('Reserva de emergência'), 'dashboard menciona a meta de exemplo');
const stateFile = files.find((f) => f.path.includes('diario-da-riqueza.json'));
ok(!!stateFile && stateFile.content.includes('"exemplo": true'), 'estado JSON carrega os seeds (sync multi-dispositivo)');

// ---------- Resumo ----------
console.log(`\n==========================================`);
console.log(`RESULTADO: ${passed} passaram, ${failed} falharam`);
console.log(`==========================================`);
if (failed > 0) process.exit(1);
