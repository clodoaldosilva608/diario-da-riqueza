/**
 * Testes do motor de cálculo do Painel Financeiro (lib/panel.ts)
 * bun test src/lib/panel.test.ts
 */
import { describe, expect, test } from 'bun:test';

import type { BudgetEntry } from '@/types';
import {
  categoryNature,
  dailyAllowance,
  daysInMonthOf,
  entriesInMonth,
  financeScore,
  monthPhase,
  panelMonthData,
} from './panel';

/* Dados fixos de teste: mês "fictício atual" é simulado via datas de 2025.
 * monthlyTotals/entriesInMonth limitam recorrências ao mês corrente REAL —
 * para tornar os testes determinísticos, usamos o MÊS REAL de hoje quando
 * o caso depende do teto, e meses passados de 2025 quando não depende. */

function be(p: Partial<BudgetEntry>): BudgetEntry {
  return {
    type: 'despesa',
    category: 'Outros',
    description: '',
    value: 100,
    date: '2025-01-10',
    frequency: 'unica',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...p,
  };
}

/* ============================== NATUREZA ============================== */

describe('categoryNature', () => {
  test('essenciais: moradia, mercado, saúde, transporte, educação, dívidas', () => {
    for (const c of ['Moradia', 'Aluguel/Casa', 'Mercado', 'Alimentação', 'Saúde', 'Transporte', 'Educação', 'Dívidas', 'Conta de energia']) {
      expect(categoryNature(c)).toBe('essenciais');
    }
  });
  test('investimento: investimentos, poupança, metas, tesouro', () => {
    for (const c of ['Investimentos', 'Poupar para metas', 'Tesouro Direto', 'Aporte mensal']) {
      expect(categoryNature(c)).toBe('investimento');
    }
  });
  test('não essenciais: lazer, viagem, streaming, presente', () => {
    for (const c of ['Lazer', 'Viagens', 'Streaming', 'Presentes', 'Restaurante']) {
      expect(categoryNature(c)).toBe('nao_essenciais');
    }
  });
  test('sem correspondência → não essenciais; vazia → não essenciais', () => {
    expect(categoryNature('Coisa estranha')).toBe('nao_essenciais');
    expect(categoryNature('')).toBe('nao_essenciais');
  });
  test('investimento vence quando a regra colide (poupança para metas ≠ essencial)', () => {
    expect(categoryNature('Poupança de viagem')).toBe('investimento');
  });
});

/* ============================== SCORE ============================== */

describe('financeScore', () => {
  test('mês exemplar: poupa 25%, despesas 75%, registrou tudo → nota alta', () => {
    const r = financeScore({ income: 10000, expense: 7500, saldo: 2500, diaryDays: 31, daysConsidered: 31 });
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.tone).toBe('prosperous');
    expect(r.label).toBe('Mês próspero');
  });

  test('mês crítico: gasta mais do que ganha e não registra → nota baixa', () => {
    const r = financeScore({ income: 5000, expense: 6500, saldo: -1500, diaryDays: 0, daysConsidered: 31 });
    expect(r.score).toBeLessThanOrEqual(10);
    expect(r.tone).toBe('critical');
  });

  test('clamp em 0 e 100', () => {
    const top = financeScore({ income: 1000, expense: 0, saldo: 1000, diaryDays: 30, daysConsidered: 30 });
    expect(top.score).toBe(100);
    const bottom = financeScore({ income: 1000, expense: 5000, saldo: -4000, diaryDays: 0, daysConsidered: 30 });
    expect(bottom.score).toBe(0);
  });

  test('faixa intermediária = "em construção"', () => {
    const r = financeScore({ income: 10000, expense: 8500, saldo: 1500, diaryDays: 10, daysConsidered: 30 });
    expect(r.tone).toBe('building');
    expect(r.label).toBe('Mês em construção');
  });

  test('decomposição soma exatamente 100 pontos possíveis', () => {
    const r = financeScore({ income: 100, expense: 50, saldo: 50, diaryDays: 5, daysConsidered: 10 });
    expect(r.parts.reduce((s, p) => s + p.max, 0)).toBe(100);
  });
});

/* ============================== HELPERS DE MÊS ============================== */

describe('helpers de mês', () => {
  test('daysInMonthOf', () => {
    expect(daysInMonthOf(2026, 0)).toBe(31);
    expect(daysInMonthOf(2026, 1)).toBe(28);
    expect(daysInMonthOf(2024, 1)).toBe(29);
    expect(daysInMonthOf(2026, 3)).toBe(30);
  });

  test('monthPhase distingue passado, corrente e futuro', () => {
    const now = new Date();
    expect(monthPhase(now.getFullYear(), now.getMonth())).toBe('current');
    expect(monthPhase(now.getFullYear() + 1, now.getMonth())).toBe('future');
    expect(monthPhase(2001, 0)).toBe('past');
  });
});

/* ============================== AGREGAÇÕES ============================== */

describe('entriesInMonth', () => {
  test("'unica' conta só no mês exato; 'mensal' recorre", () => {
    const budget = [
      be({ date: '2025-01-05', value: 100, frequency: 'unica' }),
      be({ date: '2024-06-01', value: 50, frequency: 'mensal' }),
    ];
    const jan = entriesInMonth(budget, 2025, 0);
    // mensal de 2024 recorre em jan/2025 somente se jan/2025 ≤ mês corrente real
    const capOk = new Date() >= new Date(2025, 1, 1); // hoje ≥ fev/2025?
    expect(jan.some((b) => b.frequency === 'unica')).toBe(true);
    expect(jan.some((b) => b.frequency === 'mensal')).toBe(capOk);
    const dec2024 = entriesInMonth(budget, 2024, 11);
    expect(dec2024).toHaveLength(1); // só a mensal
    expect(dec2024[0].frequency).toBe('mensal');
  });
});

describe('panelMonthData', () => {
  const diaryDates = ['2025-01-01', '2025-01-02', '2025-01-03'];

  test('totais, liquidação e saldo', () => {
    const budget = [
      be({ type: 'receita', category: 'Salário', value: 5000, date: '2025-01-05', account: 'Nubank' }),
      be({ type: 'receita', value: 1000, category: 'Freelance', date: '2025-01-20', paid: false, account: 'Nubank' }),
      be({ value: 1500, category: 'Moradia', date: '2025-01-10', account: 'Nubank' }),
      be({ value: 300, category: 'Mercado', date: '2025-01-12', account: 'Bradesco' }),
      be({ value: 200, category: 'Mercado', date: '2025-01-25', paid: false, account: 'Bradesco' }),
      be({ value: 300, category: 'Investimentos', date: '2025-01-15', account: 'Nubank' }),
      be({ value: 999, date: '2025-02-01', category: 'Outros' }), // fora do mês
    ];
    const d = panelMonthData(budget, diaryDates, 2025, 0);
    expect(d.income).toBe(6000);
    expect(d.expense).toBe(2300);
    expect(d.saldo).toBe(3700);
    expect(d.receivedIncome).toBe(5000);
    expect(d.pendingIncome).toBe(1000);
    expect(d.paidExpense).toBe(2100);
    expect(d.unpaidExpense).toBe(200);
    expect(d.invested).toBe(300);

    // por categoria: Mercado 500 (65,2%), Moradia 1500... ordem desc
    expect(d.byCategory[0].category).toBe('Moradia');
    expect(d.byCategory[0].total).toBe(1500);
    const mercado = d.byCategory.find((c) => c.category === 'Mercado');
    expect(mercado?.total).toBe(500);
    expect(Math.round(mercado!.pct)).toBe(22);

    // natureza
    const ess = d.byNature.find((n) => n.nature === 'essenciais');
    expect(ess?.total).toBe(2000); // moradia 1500 + mercado 500 (natureza olha o mês inteiro, pago ou não)
    const inv = d.byNature.find((n) => n.nature === 'investimento');
    expect(inv?.total).toBe(300);

    // contas: saldo acumulado conta TUDO (incl. a receber/não pago, como no resto do app)
    // Nubank = 5000 + 1000 − 1500 − 300 = 4200; Bradesco = −300 − 200
    const nu = d.accounts.find((a) => a.account === 'Nubank');
    expect(nu?.saldo).toBe(4200);
    expect(nu?.entradas).toBe(6000); // todas as receitas do mês na conta (recebidas + a receber)
    expect(nu?.saidas).toBe(1800);
    const br = d.accounts.find((a) => a.account === 'Bradesco');
    expect(br?.saldo).toBe(-500);
    expect(br?.saidas).toBe(500);

    // gastos por conta (mês): Nubank 1800, Bradesco 500
    expect(d.byAccount.find((a) => a.category === 'Nubank')?.total).toBe(1800);

    // série diária: receita dia 5 = 5000; despesa dia 10 = 1500
    expect(d.daily[4].entradas).toBe(5000);
    expect(d.daily[9].saidas).toBe(1500);
    expect(d.daily).toHaveLength(31);

    // consistência: 3 dias com registro
    expect(d.diaryDays).toBe(3);
    expect(d.daysConsidered).toBe(31);
  });

  test('orçamento vs realizado usa recorrências mensais como orçado', () => {
    const budget = [
      be({ type: 'receita', value: 5000, category: 'Salário', date: '2025-01-05' }),
      be({ value: 1200, category: 'Moradia', date: '2024-01-01', frequency: 'mensal' }), // orçado
      be({ value: 1500, category: 'Moradia', date: '2025-01-10' }), // realizado
      be({ value: 400, category: 'Mercado', date: '2025-01-11' }), // sem orçamento
    ];
    const d = panelMonthData(budget, [], 2025, 0);
    const moradia = d.budgetVsActual.find((r) => r.category === 'Moradia');
    expect(moradia?.budget).toBe(1200);
    // Realizado = recorrência mensal (1200, é a própria conta que se repete) + pontual (1500)
    expect(moradia?.actual).toBe(2700);
    const mercado = d.budgetVsActual.find((r) => r.category === 'Mercado');
    expect(mercado?.budget).toBe(0);
    expect(mercado?.actual).toBe(400);
  });

  test('mês vazio: totais zerados, sem crash, porNature vazio', () => {
    const d = panelMonthData([], [], 2025, 5);
    expect(d.income).toBe(0);
    expect(d.expense).toBe(0);
    expect(d.saldo).toBe(0);
    expect(d.byCategory).toHaveLength(0);
    expect(d.byNature).toHaveLength(0);
    expect(d.accounts).toHaveLength(0);
    expect(d.daily).toHaveLength(30);
  });
});

describe('dailyAllowance', () => {
  test('mês passado/futuro → null (banner MÊS TERMINADO / futuro)', () => {
    const base = panelMonthData([], [], 2025, 0);
    expect(dailyAllowance(base, 'past')).toBeNull();
    expect(dailyAllowance(base, 'future')).toBeNull();
  });

  test('mês corrente: (recebido − pago) / dias restantes, piso zero', () => {
    const data = {
      ...panelMonthData([], [], 2025, 0),
      receivedIncome: 3000,
      paidExpense: 1200,
      daysInMonth: 31,
    };
    const now = new Date();
    const daysLeft = data.daysInMonth - now.getDate() + 1;
    const a = dailyAllowance(data, 'current')!;
    expect(a.daysLeft).toBe(daysLeft);
    expect(a.available).toBe(1800);
    expect(a.perDay).toBeCloseTo(1800 / daysLeft, 6);
    expect(a.overBudget).toBe(false);
  });

  test('estourou: perDay zera e overBudget marca', () => {
    const data = {
      ...panelMonthData([], [], 2025, 0),
      receivedIncome: 100,
      paidExpense: 500,
      daysInMonth: 31,
    };
    const a = dailyAllowance(data, 'current')!;
    expect(a.perDay).toBe(0);
    expect(a.overBudget).toBe(true);
  });
});

describe('financeScore — mês sem dados', () => {
  test('income=0 e expense=0 → score null, tone none, "Mês sem lançamentos"', () => {
    const r = financeScore({ income: 0, expense: 0, saldo: 0, diaryDays: 5, daysConsidered: 20 });
    expect(r.score).toBeNull();
    expect(r.tone).toBe('none');
    expect(r.label).toBe('Mês sem lançamentos');
    expect(r.parts).toHaveLength(1);
  });

  test('saldo zero COM movimentação continua pontuando (empate = 7 pts de saldo)', () => {
    const r = financeScore({ income: 1000, expense: 1000, saldo: 0, diaryDays: 0, daysConsidered: 30 });
    expect(r.score).not.toBeNull();
    expect(r.tone).toBe('critical');
  });
});
