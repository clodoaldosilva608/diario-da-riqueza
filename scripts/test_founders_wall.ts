/**
 * test_founders_wall.ts — testes do mural de fundadores e das métricas
 * do painel (puros, sem rede):
 * - founder-showcase: 75 nomes únicos no formato de privacidade,
 *   Fundador Ouro em primeiro lugar, meses determinísticos (janela
 *   deslizante de 11 meses), merge com assinaturas reais sem duplicar;
 * - metrics do dashboard: série de receita mensal (zero-fill),
 *   ticket médio e MRR estimado.
 *
 * Executar: bun scripts/test_founders_wall.ts
 */

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean) {
  if (cond) {
    passed += 1;
  } else {
    failed += 1;
    failures.push(name);
    console.error(`  ✗ ${name}`);
  }
}

import type { FounderEntry } from '../src/lib/cakto';
import {
  FOUNDER_OURO_MONTHS_BACK, FOUNDER_OURO_NAME, FOUNDER_SHOWCASE_COUNT,
  FOUNDER_SHOWCASE_NAMES, SHOWCASE_MONTHS, monthLabelOffset,
  showcasePeriod, showcaseSince, wallDisplayCount, wallDisplayEntries,
} from '../src/lib/founder-showcase';
import {
  averageTicket, monthlyRevenueSeries, mrrEstimate,
} from '../src/app/admin/(dash)/metrics';

/* ============================== SHOWCASE: NOMES ============================== */

console.log('== founder-showcase: nomes da comunidade ==');
check('75 nomes na camada comunidade', FOUNDER_SHOWCASE_NAMES.length === 75 && FOUNDER_SHOWCASE_COUNT === 75);
check('todos únicos', new Set(FOUNDER_SHOWCASE_NAMES).size === 75);
const NAME_RE = /^\p{Lu}[\p{Ll}]+(?: [\p{Lu}][\p{Ll}]+)* \p{Lu}\.$/u;
check('todos no formato de privacidade "Nome S."',
  FOUNDER_SHOWCASE_NAMES.every((n) => NAME_RE.test(n)));
check('nenhum vazio/curto demais',
  FOUNDER_SHOWCASE_NAMES.every((n) => n.length >= 5));
check('janela cobre 11 meses', SHOWCASE_MONTHS === 11);

/* ============================== MESES DETERMINÍSTICOS ============================== */

console.log('== founder-showcase: meses e recorrência ==');
// agora fixo: 2/out/2026 (data do desenvolvimento)
const now = new Date(2026, 9, 2).getTime();
check('mês corrente', monthLabelOffset(now, 0) === 'out/2026');
check('mês anterior', monthLabelOffset(now, 1) === 'set/2026');
check('10 meses atrás', monthLabelOffset(now, 10) === 'dez/2025');
check('11 meses atrás', monthLabelOffset(now, 11) === 'nov/2025');
check('primeiro showcase é o mais antigo (dez/2025)', showcaseSince(0, now) === 'dez/2025');
check('recorrência do mais antigo = 11', showcasePeriod(0, now) === 11);
check('último showcase é o mês corrente (out/2026)', showcaseSince(74, now) === 'out/2026');
check('recorrência do mais recente = 1', showcasePeriod(74, now) === 1);
check('índice 7 entra no 2º mês (jan/2026, mês 10)', showcaseSince(7, now) === 'jan/2026' && showcasePeriod(7, now) === 10);
check('recorrência decresce com o índice', showcasePeriod(0, now) > showcasePeriod(30, now) && showcasePeriod(30, now) > showcasePeriod(74, now));

/* ============================== MURAL: MONTAGEM ============================== */

console.log('== wallDisplayEntries (montagem do mural) ==');
const empty: FounderEntry[] = [];
const wall0 = wallDisplayEntries(empty, now);
check('mural nunca fica vazio', wall0.length === FOUNDER_SHOWCASE_COUNT + 1);
check('Fundador Ouro é o primeiro', wall0[0]!.name === FOUNDER_OURO_NAME && wall0[0]!.tier === 'ouro');
check('Ouro com 11 meses de história (dez/2025)', wall0[0]!.since === 'dez/2025' && wall0[0]!.period === FOUNDER_OURO_MONTHS_BACK + 1);
check('Ouro nunca pendente', wall0[0]!.pending === false);
check('camada comunidade presente', wall0.filter((e) => e.tier === 'comunidade').length === 75);
check('ordem: ouro → comunidade → reais', wall0.slice(1).every((e) => e.tier === 'comunidade'));

const real: FounderEntry[] = [
  { name: 'Bruno C.', since: 'out/2026', period: 1, pending: false },     // colide com showcase
  { name: 'Helena Verdadeira X.', since: 'set/2026', period: 2, pending: false },
  { name: 'Fulano Pending Z.', since: 'out/2026', period: 1, pending: true },
  { name: '', since: 'out/2026', period: 1, pending: false },             // nome vazio: fora
];
const wall1 = wallDisplayEntries(real, now);
check('real que colide com showcase não duplica', wall1.filter((e) => e.name === 'Bruno C.').length === 1);
check('reais novos entram no fim com tier "real"', wall1[wall1.length - 2]!.name === 'Helena Verdadeira X.' && wall1[wall1.length - 2]!.tier === 'real');
check('total = 76 + 2 reais novos', wall1.length === 78);
check('pendente real preserva o selo', wall1.some((e) => e.name === 'Fulano Pending Z.' && e.pending && e.tier === 'real'));
check('nome vazio é ignorado', !wall1.some((e) => e.name === ''));
check('sem duplicatas no mural montado', new Set(wall1.map((e) => e.name)).size === wall1.length);
check('wallDisplayCount confere', wallDisplayCount(real, now) === 78 && wallDisplayCount(empty, now) === 76);

/* ============================== MÉTRICAS DO DASHBOARD ============================== */

console.log('== metrics: série mensal, ticket médio, MRR ==');
const series0 = monthlyRevenueSeries([], now, 6);
check('6 buckets mesmo sem vendas', series0.length === 6);
check('rótulos dos últimos 6 meses', series0.map((b) => b.label).join(',') === 'mai/26,jun/26,jul/26,ago/26,set/26,out/26');
check('buckets zerados quando sem vendas', series0.every((b) => b.value === 0 && b.count === 0));

const iso = (y: number, m: number, d: number) => new Date(y, m, d, 12).toISOString();
const orders = [
  { status: 'approved', amount: 15, createdAt: iso(2026, 8, 15) }, // set/2026
  { status: 'approved', amount: 5, createdAt: iso(2026, 8, 20) },  // set/2026
  { status: 'pending', amount: 50, createdAt: iso(2026, 8, 3) },   // ignorado (não aprovado)
  { status: 'approved', amount: 9.9, createdAt: iso(2026, 9, 1) }, // out/2026
  { status: 'approved', amount: 99, createdAt: iso(2026, 3, 10) }, // fora da janela (abr/2026)
  { status: 'refused', amount: 7, createdAt: 'data inválida' },    // ignorado
];
const series1 = monthlyRevenueSeries(orders, now, 6);
check('soma por mês correta', series1.find((b) => b.label === 'set/26')?.value === 20);
check('contagem por mês correta', series1.find((b) => b.label === 'set/26')?.count === 2);
check('outubro recebe a recorrência', series1.find((b) => b.label === 'out/26')?.value === 9.9);
check('pedido fora da janela é ignorado', series1.every((b) => b.value !== 99));
check('meses sem vendas permanecem zerados', series1.find((b) => b.label === 'mai/26')?.value === 0);

check('ticket médio é sem janela: (15+5+9.9+99)/4', Math.abs(averageTicket(orders as never) - (15 + 5 + 9.9 + 99) / 4) < 1e-9);
check('ticket médio vazio = 0', averageTicket([]) === 0);
check('ticket médio ignora não aprovados', Math.abs(averageTicket([
  { status: 'approved', amount: 10 },
  { status: 'pending', amount: 90 },
] as never) - 10) < 1e-9);
check('MRR 0 com 0 assinaturas', mrrEstimate(0) === 0);
check('MRR 3 × 9,90', Math.abs(mrrEstimate(3) - 29.7) < 1e-9);
check('MRR não negativo', mrrEstimate(-2) === 0);

/* ============================== RESULTADO ============================== */

console.log('==========================================');
console.log(`RESULTADO: ${passed} passaram, ${failed} falharam`);
console.log('==========================================');
if (failed > 0) {
  console.error('Falhas:', failures.join(' | '));
  process.exit(1);
}
