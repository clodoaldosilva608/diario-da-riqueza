/**
 * Diário da Riqueza — Motor de cálculo do Painel Financeiro Mensal
 *
 * Tudo derivado dos dados locais (orçamento + diário), seguindo as MESMAS
 * convenções de recorrência do monthlyTotals (format.ts):
 * - 'unica' conta apenas no mês do lançamento;
 * - 'mensal' recorre todo mês a partir do lançamento, nunca além do mês
 *   corrente (o painel não projeta o futuro como se tivesse acontecido).
 *
 * Status de liquidação: `paid === false` = pendente; undefined = liquidado
 * (compatibilidade total com registros anteriores ao campo).
 */

import type { BudgetEntry, CategoryNature } from '@/types';
import { NATURE_LABELS } from '@/types';

/* ============================== NATUREZA DAS CATEGORIAS ============================== */

/** Categorias que sempre são essenciais (taxonomia do importador + comuns BR) */
const NATURE_RULES: Array<[RegExp, CategoryNature]> = [
  // Investimentos e futuro — primeiro, para "poupança para metas" não cair em essenciais
  [/investi|tesouro|cdb|a[çc][õo]es|fundo|aporte|poupan|reserva|previd[eê]ncia|meta|sonho|cripto/i, 'investimento'],
  // Essenciais — moradia, comida, saúde, transporte, educação, dívidas
  [/aluguel|casa|moradia|condom[ií]nio|iptu|g[aá]s|luz|energia|[aá]gua|internet|telefone|celular|wifi/i, 'essenciais'],
  [/mercado|supermercado|hortifruti|padaria|a[çc]ougue|alimenta|feira|marmita/i, 'essenciais'],
  [/sa[uú]de|farm[aá]cia|drogaria|hospital|cl[ií]nica|m[eé]dico|dentista|plano de sa[uú]de|rem[eé]dio|academia/i, 'essenciais'],
  [/transporte|combust[ií]vel|gasolina|[óo]nibus|m[eé]tro|uber|99|ped[aá]gio|estacionamento|posto/i, 'essenciais'],
  [/educa[çc][ãa]o|escola|faculdade|curso|universidade|mensalidade|livro|livraria|estudo/i, 'essenciais'],
  [/d[ií]vida|empr[eé]stimo|financiamento|fatura|juros|cart[oã]o de cr[eé]dito|das\b|imposto/i, 'essenciais'],
  [/sal[aá]rio|freelance|vendas|renda/i, 'essenciais'], // receitas ignoradas no bloco de saídas, mas não poluem
  // Não essenciais — lifestyle
  [/lazer|viagem|passeio|restaurante|ifood|rappi|delivery|bar\b|balada|cinema|streaming|netflix|spotify|assinatura|jogo|steam|playstation|show|teatro|presente|roupa|beleza|sal[ãa]o|barbearia|pet\b|doa[çc][ãa]o/i, 'nao_essenciais'],
];

/**
 * Classifica uma categoria livre do orçamento em natureza macro.
 * Sem correspondência → não essencial (dinheiro sem papel claro definido).
 */
export function categoryNature(category: string): CategoryNature {
  const c = category.trim();
  if (!c) return 'nao_essenciais';
  for (const [re, nature] of NATURE_RULES) {
    if (re.test(c)) return nature;
  }
  return 'nao_essenciais';
}

export function natureLabel(n: CategoryNature): string {
  return NATURE_LABELS[n];
}

/* ============================== SCORE DE SAÚDE FINANCEIRA ============================== */

export interface ScoreInput {
  /** Receitas líquidas do mês (todas, incl. recorrências) */
  income: number;
  /** Despesas totais do mês */
  expense: number;
  /** Saldo = income − expense */
  saldo: number;
  /** Dias do mês com registro no diário */
  diaryDays: number;
  /** Dias considerados (passado = dias no mês; mês corrente = dias decorridos) */
  daysConsidered: number;
}

export interface ScoreResult {
  /** 0–100 — null quando o mês não tem nenhum lançamento (nada a pontuar) */
  score: number | null;
  tone: ScoreTone;
  label: string;
  /** Decomposição para o popover explicativo */
  parts: Array<{ label: string; points: number; max: number; detail: string }>;
}

export type ScoreTone = 'critical' | 'building' | 'prosperous' | 'none';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Score de saúde financeira do mês (0–100), legível e explicável:
 * - 45 pts taxa de poupança (saldo/receitas; 20%+ = cheio);
 * - 15 pts saldo do mês positivo;
 * - 25 pts comprometimento da renda (despesas ≤ 70% da receita = cheio);
 * - 15 pts consistência de registro no diário (método!).
 */
export function financeScore(input: ScoreInput): ScoreResult {
  const { income, expense, saldo, diaryDays, daysConsidered } = input;

  /* Mês sem nenhuma movimentação: nada a pontuar — estado honesto, não nota baixa */
  if (income === 0 && expense === 0) {
    return {
      score: null,
      tone: 'none',
      label: 'Mês sem lançamentos',
      parts: [
        { label: 'Sem dados', points: 0, max: 100, detail: 'Registre entradas e saídas no Orçamento para o mês pontuar.' },
      ],
    };
  }

  const rate = income > 0 ? saldo / income : saldo > 0 ? 1 : -1;
  const p1 = clamp01(rate / 0.2) * 45;
  const p2 = saldo > 0 ? 15 : saldo === 0 ? 7 : 0;
  const commitment = income > 0 ? expense / income : 2;
  const p3 = clamp01((0.9 - commitment) / 0.2) * 25;
  const consistency = daysConsidered > 0 ? clamp01(diaryDays / daysConsidered) : 0.5;
  const p4 = consistency * 15;

  const score = Math.round(clamp01((p1 + p2 + p3 + p4) / 100) * 100);
  const tone: ScoreTone = score >= 75 ? 'prosperous' : score >= 40 ? 'building' : 'critical';
  const label = tone === 'prosperous' ? 'Mês próspero' : tone === 'building' ? 'Mês em construção' : 'Mês crítico';

  const fmtPct = (n: number) => `${Math.round(n * 100)}%`;
  return {
    score,
    tone,
    label,
    parts: [
      {
        label: 'Taxa de poupança',
        points: Math.round(p1),
        max: 45,
        detail: income > 0 ? `Você poupou ${fmtPct(rate)} da receita — 20% ou mais vale nota cheia.` : 'Sem receita no mês, a poupança não pontua.',
      },
      {
        label: 'Saldo do mês',
        points: p2,
        max: 15,
        detail: saldo > 0 ? 'Entrou mais do que saiu — saldo positivo.' : saldo === 0 ? 'Empate entre entradas e saídas.' : 'Saiu mais do que entrou — saldo negativo.',
      },
      {
        label: 'Comprometimento',
        points: Math.round(p3),
        max: 25,
        detail: income > 0 ? `Despesas comprometem ${fmtPct(commitment)} da receita — até 70% mantém a nota cheia.` : 'Sem receita no mês para medir o comprometimento.',
      },
      {
        label: 'Consistência no método',
        points: Math.round(p4),
        max: 15,
        detail: daysConsidered > 0 ? `${diaryDays} de ${daysConsidered} dia(s) com registro no diário.` : 'Registre o mês no diário para pontuar aqui.',
      },
    ],
  };
}

/* ============================== AGREGAÇÕES DO MÊS ============================== */

export interface MonthSlice {
  category: string;
  total: number;
  pct: number;
}

export interface AccountSummary {
  account: string;
  /** Saldo acumulado da conta até o FIM do mês selecionado */
  saldo: number;
  /** Entradas do mês selecionado */
  entradas: number;
  /** Saídas do mês selecionado */
  saidas: number;
}

export interface PanelMonthData {
  /** prefixo 'yyyy-MM' do mês */
  prefix: string;
  income: number;
  expense: number;
  saldo: number;
  receivedIncome: number;
  pendingIncome: number;
  paidExpense: number;
  unpaidExpense: number;
  invested: number;
  byCategory: MonthSlice[];
  byNature: Array<{ nature: CategoryNature; total: number; pct: number }>;
  byAccount: MonthSlice[];
  accounts: AccountSummary[];
  budgetVsActual: Array<{ category: string; budget: number; actual: number }>;
  daily: Array<{ day: string; entradas: number; saidas: number }>;
  diaryDays: number;
  daysConsidered: number;
  daysInMonth: number;
}

/** Último dia do mês (1-based) */
export function daysInMonthOf(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Tipo de mês em relação a hoje */
export function monthPhase(year: number, month: number): 'past' | 'current' | 'future' {
  const now = new Date();
  const target = year * 12 + month;
  const cur = now.getFullYear() * 12 + now.getMonth();
  return target < cur ? 'past' : target === cur ? 'current' : 'future';
}

/** Lançamentos "ativos" no mês — mesma regra do monthlyTotals (sem o teto do mês corrente aqui; quem chama decide) */
export function entriesInMonth(budget: BudgetEntry[], year: number, month: number): BudgetEntry[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const now = new Date();
  const currentPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const out: BudgetEntry[] = [];
  for (const b of budget) {
    if (b.frequency === 'unica') {
      if (b.date.startsWith(prefix)) out.push(b);
    } else {
      // mensal: recorre a partir do lançamento, nunca além do mês corrente
      if (b.date.slice(0, 7) <= prefix && prefix <= currentPrefix) out.push(b);
    }
  }
  return out;
}

/** Liquidação: undefined = liquidado (compat com registros antigos) */
export function isSettled(b: BudgetEntry): boolean {
  return b.paid !== false;
}

/**
 * Agrega TUDO que o Painel precisa sobre um mês.
 * `budget` e `diaryDates` chegam completos (todas as datas) — a função filtra.
 */
export function panelMonthData(
  budget: BudgetEntry[],
  diaryDates: string[],
  year: number,
  month: number,
): PanelMonthData {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const dim = daysInMonthOf(year, month);
  const phase = monthPhase(year, month);
  const rows = entriesInMonth(budget, year, month);

  let income = 0;
  let expense = 0;
  let receivedIncome = 0;
  let pendingIncome = 0;
  let paidExpense = 0;
  let unpaidExpense = 0;
  let invested = 0;
  const catMap = new Map<string, number>();
  const natureMap = new Map<CategoryNature, number>();
  const accMap = new Map<string, number>();

  for (const b of rows) {
    const settled = isSettled(b);
    if (b.type === 'receita') {
      income += b.value;
      if (settled) receivedIncome += b.value;
      else pendingIncome += b.value;
    } else {
      expense += b.value;
      if (settled) paidExpense += b.value;
      else unpaidExpense += b.value;
      const nature = categoryNature(b.category);
      catMap.set(b.category, (catMap.get(b.category) ?? 0) + b.value);
      natureMap.set(nature, (natureMap.get(nature) ?? 0) + b.value);
      if (nature === 'investimento') invested += b.value;
      const acc = (b.account ?? '').trim();
      if (acc) accMap.set(acc, (accMap.get(acc) ?? 0) + b.value);
    }
  }

  const byCategory: MonthSlice[] = [...catMap.entries()]
    .map(([category, total]) => ({
      category,
      total,
      pct: expense > 0 ? (total / expense) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const byNature = (['essenciais', 'nao_essenciais', 'investimento'] as CategoryNature[])
    .map((nature) => {
      const total = natureMap.get(nature) ?? 0;
      return { nature, total, pct: expense > 0 ? (total / expense) * 100 : 0 };
    })
    .filter((n) => n.total > 0);

  const byAccount: MonthSlice[] = [...accMap.entries()]
    .map(([account, total]) => ({ category: account, total, pct: expense > 0 ? (total / expense) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  /* Contas: saldo acumulado até o fim do mês selecionado */
  const endPrefix = prefix; // acumula até o mês selecionado
  const now = new Date();
  const currentPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const capPrefix = endPrefix < currentPrefix ? endPrefix : currentPrefix; // futuro não projeta
  const accSaldo = new Map<string, number>();
  for (const b of budget) {
    const acc = (b.account ?? '').trim();
    if (!acc) continue;
    // 'unica' e 'mensal' ativas acumulam igualmente até o teto (futuro não projeta)
    const active = b.date.slice(0, 7) <= capPrefix;
    if (!active) continue;
    accSaldo.set(acc, (accSaldo.get(acc) ?? 0) + (b.type === 'receita' ? b.value : -b.value));
  }
  const accounts: AccountSummary[] = [...new Set([...accSaldo.keys(), ...accMap.keys()])].map((account) => ({
    account,
    saldo: accSaldo.get(account) ?? 0,
    entradas: rows
      .filter((b) => (b.account ?? '').trim() === account && b.type === 'receita')
      .reduce((s, b) => s + b.value, 0),
    saidas: rows
      .filter((b) => (b.account ?? '').trim() === account && b.type === 'despesa')
      .reduce((s, b) => s + b.value, 0),
  })).sort((a, b) => b.saldo - a.saldo);

  /* Orçamento vs realizado: orçado = recorrências mensais ativas no mês, por categoria */
  const budgetMap = new Map<string, number>();
  for (const b of budget) {
    if (b.type !== 'despesa' || b.frequency !== 'mensal') continue;
    const active =
      b.date.slice(0, 7) <= prefix && (phase !== 'future' || prefix <= currentPrefix);
    if (!active) continue;
    budgetMap.set(b.category, (budgetMap.get(b.category) ?? 0) + b.value);
  }
  const budgetCategories = new Set([...budgetMap.keys(), ...catMap.keys()]);
  const budgetVsActual = [...budgetCategories]
    .map((category) => {
      const budget = budgetMap.get(category) ?? 0;
      const actual = catMap.get(category) ?? 0;
      return { category, budget, actual };
    })
    .filter((r) => r.budget > 0 || r.actual > 0)
    .sort((a, b) => b.actual - a.actual || b.budget - a.budget);

  /* Série diária: soma por dia (não cumulativa) — "soma por dia do mês" */
  const dayIncome = new Array<number>(dim + 1).fill(0);
  const dayExpense = new Array<number>(dim + 1).fill(0);
  for (const b of rows) {
    if (b.frequency !== 'unica') continue; // recorrências não têm dia conhecido no mês
    const d = parseInt(b.date.slice(8, 10), 10);
    if (!d || d > dim) continue;
    if (b.type === 'receita') dayIncome[d] += b.value;
    else dayExpense[d] += b.value;
  }
  const daily = Array.from({ length: dim }, (_, i) => ({
    day: String(i + 1),
    entradas: dayIncome[i + 1],
    saidas: dayExpense[i + 1],
  }));

  const diaryDays = diaryDates.filter((d) => d.startsWith(prefix)).length;
  const daysConsidered = phase === 'past' ? dim : phase === 'current' ? Math.min(new Date().getDate(), dim) : 0;

  return {
    prefix,
    income,
    expense,
    saldo: income - expense,
    receivedIncome,
    pendingIncome,
    paidExpense,
    unpaidExpense,
    invested,
    byCategory,
    byNature,
    byAccount,
    accounts,
    budgetVsActual,
    daily,
    diaryDays,
    daysConsidered,
    daysInMonth: dim,
  };
}

/* ============================== QUANTO POSSO GASTAR HOJE ============================== */

export interface Allowance {
  /** Valor disponível para hoje (ou 0 se estourou) */
  perDay: number;
  /** Total ainda disponível no mês (recebido − pago) */
  available: number;
  /** Dias restantes no mês, incluindo hoje */
  daysLeft: number;
  /** true = saldo disponível negativo */
  overBudget: boolean;
}

/**
 * "Quanto você pode gastar hoje": dinheiro JÁ RECEBIDO menos o JÁ PAGO,
 * dividido pelos dias restantes do mês (hoje incluso).
 * Retorna null para meses passados/futuros ou sem receita recebida.
 */
export function dailyAllowance(data: PanelMonthData, phase: 'past' | 'current' | 'future'): Allowance | null {
  if (phase !== 'current') return null;
  const today = new Date().getDate();
  const daysLeft = Math.max(1, data.daysInMonth - today + 1);
  const available = data.receivedIncome - data.paidExpense;
  return {
    perDay: Math.max(0, available / daysLeft),
    available,
    daysLeft,
    overBudget: available < 0,
  };
}
