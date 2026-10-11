'use client';

/**
 * Painel Financeiro Mensal — a visão do dinheiro mês a mês:
 * score de saúde, personagem que reage ao mês, saldo/entradas/saídas
 * com liquidação, "quanto posso gastar hoje", destino do dinheiro,
 * série diária, contas bancárias, natureza dos gastos e orçamento
 * vs realizado. Inspirado no padrão dos apps de finanças premium,
 * adaptado ao método Diário da Riqueza.
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChartNoAxesCombined, Info, Landmark, ListOrdered, PieChart as PieIcon,
  Target, TrendingDown, TrendingUp, Wallet, CalendarClock, CreditCard, Receipt,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { EmptyState, SectionHeader } from '@/components/shared/ui-kit';
import { useProfile, useBudget, useEntries, useAvailableYears } from '@/hooks/useData';
import { updateProfile } from '@/db/actions';
import { formatBRL, formatCompactBRL, MONTH_NAMES } from '@/lib/format';
import {
  categoryNature, dailyAllowance, financeScore, monthPhase, panelMonthData,
} from '@/lib/panel';
import { NATURE_LABELS, type CategoryNature } from '@/types';
import { cn } from '@/lib/utils';
import { PanelCharacter } from './PanelCharacter';

const GOLD = '#d4af37';
const GREEN = '#10b981';
const RED = '#f87171';
const AMBER = '#f59e0b';

const CAT_COLORS = [GOLD, RED, '#8b5cf6', '#14b8a6', '#fb923c', '#67e8f9', '#f43f5e', '#a3a3b8', '#4ade80', '#c084fc'];
const NATURE_COLORS: Record<CategoryNature, string> = {
  essenciais: '#60a5fa',
  nao_essenciais: '#fb923c',
  investimento: GREEN,
};

const tooltipStyle = {
  backgroundColor: '#141417',
  border: '1px solid #2b2b32',
  borderRadius: '10px',
  fontSize: '12px',
  color: '#f4f4f5',
};

/* ============================== Anel do score ============================== */

function ScoreRing({ score, tone }: { score: number | null; tone: 'critical' | 'building' | 'prosperous' | 'none' }) {
  const R = 56;
  const C = 2 * Math.PI * R;
  const color = tone === 'none' ? '#3a3a44' : tone === 'prosperous' ? GREEN : tone === 'building' ? AMBER : RED;
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label={score === null ? 'Score indisponível — mês sem lançamentos' : `Score ${score} de 100`}>
      <circle cx="70" cy="70" r={R} stroke="#26262c" strokeWidth="11" fill="none" />
      <motion.circle
        cx="70" cy="70" r={R} stroke={color} strokeWidth="11" fill="none" strokeLinecap="round"
        strokeDasharray={C}
        initial={{ strokeDashoffset: C }}
        animate={{ strokeDashoffset: C * (1 - (score ?? 0) / 100) }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="68" textAnchor="middle" fontSize="34" fontWeight="700" fill={score === null ? '#6c6c78' : '#f4f4f5'} className="font-display">
        {score ?? '—'}
      </text>
      <text x="70" y="90" textAnchor="middle" fontSize="13" fill="#9c9ca8">/100</text>
    </svg>
  );
}

/* ============================== Cards do mês ============================== */

function MonthCards({
  saldo, income, expense, received, pending, paid, unpaid, invested,
}: {
  saldo: number; income: number; expense: number;
  received: number; pending: number; paid: number; unpaid: number; invested: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* SALDO — navy como o app de referência */}
      <Card className="border-navy-wealth/60 bg-navy-wealth text-white">
        <CardContent className="p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/70">
            <Wallet className="h-3.5 w-3.5" /> Saldo do mês
          </p>
          <p className={cn('mt-2 font-display text-2xl font-bold tabular-nums', saldo < 0 && 'text-loss')}>
            {formatBRL(saldo)}
          </p>
          <p className="mt-1 text-xs text-white/60">entradas − saídas do mês</p>
        </CardContent>
      </Card>

      {/* ENTRADAS */}
      <Card className="border-emerald-wealth/25 bg-emerald-wealth/8">
        <CardContent className="p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-wealth/90">
            <TrendingUp className="h-3.5 w-3.5" /> Entradas
          </p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-emerald-wealth">{formatBRL(income)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Recebidas {formatBRL(received)} • A receber {formatBRL(pending)}
          </p>
        </CardContent>
      </Card>

      {/* SAÍDAS */}
      <Card className="border-loss/25 bg-loss/8">
        <CardContent className="p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-loss/90">
            <TrendingDown className="h-3.5 w-3.5" /> Total de saídas
          </p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-loss">{formatBRL(expense)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pagas {formatBRL(paid)} • Em aberto {formatBRL(unpaid)}
          </p>
          {invested > 0 && (
            <p className="mt-0.5 text-xs text-emerald-wealth/80">sendo {formatBRL(invested)} em investimentos e futuro</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================== View principal ============================== */

export function PanelView() {
  const budget = useBudget();
  const entries = useEntries();
  const profile = useProfile();
  const years = useAvailableYears();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const diaryDates = useMemo(() => entries.map((e) => e.date), [entries]);
  const data = useMemo(() => panelMonthData(budget, diaryDates, year, month), [budget, diaryDates, year, month]);
  const phase = monthPhase(year, month);
  const allowance = useMemo(() => dailyAllowance(data, phase), [data, phase]);
  const score = useMemo(
    () =>
      financeScore({
        income: data.income,
        expense: data.expense,
        saldo: data.saldo,
        diaryDays: data.diaryDays,
        daysConsidered: data.daysConsidered,
      }),
    [data],
  );

  const character = profile?.character ?? 'ele';
  const setCharacter = (v: 'ele' | 'ela') => {
    if (v !== character) updateProfile({ character: v }).catch(() => undefined);
  };

  const yearOptions = useMemo(() => {
    const set = new Set<number>(years);
    set.add(year);
    return [...set].sort((a, b) => b - a);
  }, [years, year]);

  const donutData = useMemo(() => {
    const top = data.byCategory.slice(0, 9);
    const rest = data.byCategory.slice(9).reduce((s, c) => s + c.total, 0);
    return rest > 0 ? [...top, { category: 'Outros', total: rest, pct: (rest / Math.max(1, data.expense)) * 100 }] : top;
  }, [data]);

  const toneClasses = {
    prosperous: 'border-emerald-wealth/30 bg-emerald-wealth/8 text-emerald-wealth',
    building: 'border-amber/30 bg-amber/8 text-amber',
    critical: 'border-loss/30 bg-loss/8 text-loss',
    none: 'border-border bg-muted/40 text-muted-foreground',
  } as const;

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={ChartNoAxesCombined}
        title="Painel Financeiro"
        subtitle="O retrato do seu mês — score, contas, destino do dinheiro e orçamento"
      />

      {/* Seletor de mês/ano — navegação histórica livre */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-40" aria-label="Mês do painel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, m) => (
              <SelectItem key={name} value={String(m)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28" aria-label="Ano do painel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {MONTH_NAMES[month]} • {score.score === null ? 'sem dados' : `${score.score}/100`}
        </span>
      </div>

      {/* Personagem + Score */}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,240px)_1fr]">
        <Card className="flex flex-col items-center justify-center gap-3 p-5">
          <PanelCharacter tone={score.tone} character={character} className="h-44 w-44" />
          <div className="flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5" role="radiogroup" aria-label="Personagem do painel">
            {(['ele', 'ela'] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={character === c}
                onClick={() => setCharacter(c)}
                className={cn(
                  'rounded-full px-3 py-0.5 text-xs font-semibold transition-colors',
                  character === c ? 'bg-gold text-black' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {c === 'ele' ? 'Ele' : 'Ela'}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            O personagem acompanha sua saúde financeira no mês.
          </p>
        </Card>

        <Card className="flex flex-col items-center justify-center gap-2 p-5 sm:flex-row sm:gap-6">
          <ScoreRing score={score.score} tone={score.tone} />
          <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
            <p className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide', toneClasses[score.tone])}>
              {score.label}
            </p>
            <div className="flex items-start justify-center gap-1.5 sm:justify-start">
              <p className="text-sm text-muted-foreground">
                {score.score === null
                  ? 'Nenhuma entrada ou saída registrada neste mês — o painel pontua quando há dinheiro se movendo.'
                  : 'Pontuação de saúde financeira do mês: poupança, saldo, comprometimento e consistência.'}
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <button aria-label="Como o score é calculado" className="mt-0.5 text-muted-foreground hover:text-gold">
                    <Info className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 space-y-3">
                  <p className="font-display text-sm font-bold">Como o score é calculado</p>
                  {score.parts.map((p) => (
                    <div key={p.label}>
                      <p className="text-xs font-semibold">
                        {p.label} <span className="text-gold">{p.points}/{p.max}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{p.detail}</p>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-muted-foreground">
              {data.diaryDays} de {data.daysConsidered || 0} dia(s) registrados no diário
            </p>
          </div>
        </Card>
      </div>

      {/* Cards do mês */}
      <MonthCards
        saldo={data.saldo}
        income={data.income}
        expense={data.expense}
        received={data.receivedIncome}
        pending={data.pendingIncome}
        paid={data.paidExpense}
        unpaid={data.unpaidExpense}
        invested={data.invested}
      />

      {/* Quanto posso gastar hoje */}
      {phase === 'current' && allowance && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex flex-col gap-1 rounded-2xl border p-5 sm:flex-row sm:items-center sm:gap-4',
            allowance.overBudget
              ? 'border-loss/40 bg-gradient-to-r from-loss/15 via-loss/5 to-transparent'
              : 'border-gold/40 bg-gradient-to-r from-gold/15 via-gold/5 to-transparent',
          )}
        >
          <CalendarClock className={cn('h-6 w-6 shrink-0', allowance.overBudget ? 'text-loss' : 'text-gold')} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quanto você pode gastar hoje
            </p>
            {allowance.overBudget ? (
              <p className="font-display text-xl font-bold text-loss">
                {formatBRL(Math.abs(allowance.available))} além do recebido
              </p>
            ) : (
              <p className="font-display text-xl font-bold text-gold">{formatBRL(allowance.perDay)} por dia</p>
            )}
            <p className="text-xs text-muted-foreground">
              {allowance.overBudget
                ? 'O mês já comprometeu mais do que entrou — segure os gastos e busque receita.'
                : `${formatBRL(allowance.available)} ainda disponíveis para ${allowance.daysLeft} dia(s) — recebido menos o já pago.`}
            </p>
          </div>
        </motion.div>
      )}
      {phase === 'past' && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber/30 bg-amber/8 p-5">
          <CalendarClock className="h-6 w-6 shrink-0 text-amber" />
          <div>
            <p className="font-display text-lg font-bold text-amber">Mês terminado</p>
            <p className="text-xs text-muted-foreground">
              Fechou com saldo de {formatBRL(data.saldo)} — as lições ficam no diário e no Orçamento.
            </p>
          </div>
        </div>
      )}
      {phase === 'future' && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-5">
          <CalendarClock className="h-6 w-6 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-display text-lg font-bold">Mês ainda por vir</p>
            <p className="text-xs text-muted-foreground">
              Recorrências mensais já aparecem como plano. O realizado só existe depois de viver o mês.
            </p>
          </div>
        </div>
      )}

      {/* ======================= GRÁFICOS ======================= */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Para onde vai o meu dinheiro */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieIcon className="h-4 w-4 text-gold" /> Para onde vai o meu dinheiro?
            </CardTitle>
            <p className="text-xs text-muted-foreground">Despesas por categoria • % • R$</p>
          </CardHeader>
          <CardContent>
            {data.byCategory.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Nenhuma despesa no mês"
                description="Registre saídas no Orçamento para ver o destino do dinheiro."
              />
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="relative h-52 w-52 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData} dataKey="total" nameKey="category"
                        innerRadius="62%" outerRadius="88%" paddingAngle={2} strokeWidth={0}
                      >
                        {donutData.map((_, i) => (
                          <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">saídas</p>
                    <p className="font-display text-lg font-bold">{formatCompactBRL(data.expense)}</p>
                  </div>
                </div>
                <ul className="max-h-52 min-w-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                  {data.byCategory.map((c, i) => (
                    <li key={c.category} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                      <span className="min-w-0 flex-1 truncate">{c.category}</span>
                      <span className="tabular-nums text-muted-foreground">{Math.round(c.pct)}%</span>
                      <span className="w-24 shrink-0 text-right font-semibold tabular-nums">{formatBRL(c.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entradas e saídas ao longo do período */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ChartNoAxesCombined className="h-4 w-4 text-gold" /> Entradas e saídas ao longo do período
            </CardTitle>
            <p className="text-xs text-muted-foreground">Soma por dia do mês selecionado</p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26262c" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9c9ca8' }} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#9c9ca8' }} tickFormatter={(v) => formatCompactBRL(v)} width={64} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} labelFormatter={(l) => `Dia ${l}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="entradas" stroke={GREEN} strokeWidth={2} dot={false} name="Entradas" />
                <Line type="monotone" dataKey="saidas" stroke={RED} strokeWidth={2} dot={false} name="Saídas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Contas bancárias */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4 text-gold" /> Contas bancárias
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Saldo acumulado por conta/cartão até o fim de {MONTH_NAMES[month]} • entradas e saídas do mês
          </p>
        </CardHeader>
        <CardContent>
          {data.accounts.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Nenhuma conta vinculada"
              description='Ao lançar no Orçamento, preencha "Conta/Cartão" (ex.: Nubank, Itaú, Inter) para acompanhar o saldo de cada conta aqui.'
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.accounts.map((a, i) => (
                <div key={a.account} className="overflow-hidden rounded-xl border border-border">
                  <div
                    className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
                    style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }}
                  >
                    {a.account}
                  </div>
                  <div className="space-y-1.5 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Saldo</span>
                      <span className={cn('font-bold tabular-nums', a.saldo < 0 ? 'text-loss' : 'text-foreground')}>
                        {formatBRL(a.saldo)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Entradas</span>
                      <span className="tabular-nums text-emerald-wealth">{formatBRL(a.entradas)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Saídas</span>
                      <span className="tabular-nums text-loss">{formatBRL(a.saidas)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Saídas por natureza */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListOrdered className="h-4 w-4 text-gold" /> Saídas por natureza
            </CardTitle>
            <p className="text-xs text-muted-foreground">Essenciais, estilo de vida e futuro — para onde o método aponta</p>
          </CardHeader>
          <CardContent>
            {data.byNature.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Nenhuma despesa no mês"
                description="O retrato essenciais × estilo de vida × futuro aparece quando há saídas registradas."
              />
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="relative h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byNature} dataKey="total" nameKey="nature"
                        innerRadius="58%" outerRadius="85%" paddingAngle={2} strokeWidth={0}
                      >
                        {data.byNature.map((n) => (
                          <Cell key={n.nature} fill={NATURE_COLORS[n.nature]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number, _n, p) => formatBRL(v)}
                        labelFormatter={(label) => NATURE_LABELS[label as CategoryNature]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">no mês</p>
                    <p className="font-display text-base font-bold">{formatCompactBRL(data.expense)}</p>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2.5">
                  {data.byNature.map((n) => (
                    <li key={n.nature} className="rounded-xl border border-border p-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: NATURE_COLORS[n.nature] }} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{NATURE_LABELS[n.nature]}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{Math.round(n.pct)}%</span>
                        <span className="text-sm font-bold tabular-nums">{formatBRL(n.total)}</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${n.pct}%`, backgroundColor: NATURE_COLORS[n.nature] }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orçamento vs realizado */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-gold" /> Orçamento vs realizado
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Orçado = lançamentos que se repetem todo mês • realizado = tudo que saiu
            </p>
          </CardHeader>
          <CardContent>
            {data.budgetVsActual.length === 0 ? (
              <EmptyState
                icon={Target}
                title="Sem comparativo ainda"
                description='Marque "Repetir todo mês" nos gastos fixos do Orçamento (aluguel, assinaturas…) para criar o orçamento e acompanhá-lo aqui.'
              />
            ) : (
              <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {data.budgetVsActual.map((r) => {
                  const over = r.actual > r.budget;
                  const max = Math.max(r.budget, r.actual, 1);
                  return (
                    <li key={r.category}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-semibold">{r.category}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {r.budget > 0 ? (
                            <>
                              realizado <span className={cn('font-bold', over ? 'text-loss' : 'text-emerald-wealth')}>{formatBRL(r.actual)}</span>
                              {' '}de {formatBRL(r.budget)}
                            </>
                          ) : (
                            <span className="font-bold text-loss">{formatBRL(r.actual)} sem orçamento</span>
                          )}
                        </span>
                      </div>
                      <div className="mt-1.5 space-y-1">
                        {r.budget > 0 && (
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-gold/70" style={{ width: `${Math.min(100, (r.budget / max) * 100)}%` }} />
                          </div>
                        )}
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn('h-full rounded-full', over ? 'bg-loss' : 'bg-emerald-wealth')}
                            style={{ width: `${Math.min(100, (r.actual / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gastos por conta / cartão */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-gold" /> Gastos por conta / cartão
          </CardTitle>
          <p className="text-xs text-muted-foreground">Onde você mais gastou no mês</p>
        </CardHeader>
        <CardContent>
          {data.byAccount.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Nenhum gasto vinculado a conta"
              description='Preencha "Conta/Cartão" nos lançamentos do Orçamento para ver a distribuição por conta.'
            />
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative h-52 w-52 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byAccount} dataKey="total" nameKey="category"
                      innerRadius="62%" outerRadius="88%" paddingAngle={2} strokeWidth={0}
                    >
                      {data.byAccount.map((_, i) => (
                        <Cell key={i} fill={CAT_COLORS[(i + 3) % CAT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">no período</p>
                  <p className="font-display text-base font-bold">{formatCompactBRL(data.expense)}</p>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {data.byAccount.map((a, i) => (
                  <li key={a.category} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CAT_COLORS[(i + 3) % CAT_COLORS.length] }} />
                    <span className="min-w-0 flex-1 truncate">{a.category}</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round(a.pct)}%</span>
                    <span className="w-24 shrink-0 text-right font-semibold tabular-nums">{formatBRL(a.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
