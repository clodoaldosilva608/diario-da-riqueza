'use client';

/**
 * Estatísticas avançadas — dias produtivos, temas estudados, XP,
 * humor/energia, saldo mensal e evolução.
 */

import { useMemo } from 'react';
import {
  BarChart3, CalendarCheck2, Dumbbell, BookOpen, Flame, Coins, Zap,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard, SectionHeader } from '@/components/shared/ui-kit';
import { useEntries, useStudies, useBudget, useXpEvents, useGamification } from '@/hooks/useData';
import { MonthlyReportSection } from './MonthlyReportSection';
import { useAppStore } from '@/stores/useAppStore';
import { formatBRL, formatCompactBRL, monthlyTotals, MONTH_NAMES } from '@/lib/format';
import { MOOD_LABELS } from '@/types';
import type { XPType } from '@/types';

const GOLD = '#d4af37';
const GREEN = '#10b981';
const RED = '#f87171';

const tooltipStyle = {
  backgroundColor: '#141417',
  border: '1px solid #2b2b32',
  borderRadius: '10px',
  fontSize: '12px',
  color: '#f4f4f5',
};

const XP_LABELS: Record<XPType, string> = {
  registro_dia: 'Registro do dia',
  pratica: 'Prática',
  estudo: 'Estudos',
  streak: 'Streak',
  meta: 'Metas',
  desafio: 'Desafios',
};

export function StatsView() {
  const selectedYear = useAppStore((s) => s.selectedYear);
  const entries = useEntries(selectedYear);
  const studies = useStudies();
  const budget = useBudget();
  const xpEvents = useXpEvents();
  const gam = useGamification(entries);

  const productiveDays = entries.filter((e) => (e.productiveActions ?? '').trim().length > 0).length;
  const exerciseDays = entries.filter((e) => e.exerciseDone).length;
  const practiceDays = entries.filter((e) => e.practice.trim().length > 0).length;
  const yearIncome = budget
    .filter((b) => b.date.startsWith(String(selectedYear)) && b.type === 'receita')
    .reduce((s, b) => s + b.value, 0);
  const yearExpense = budget
    .filter((b) => b.date.startsWith(String(selectedYear)) && b.type === 'despesa')
    .reduce((s, b) => s + b.value, 0);

  /* Temas mais estudados (top 7 por menções no diário + concluídos) */
  const topTopics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      if (e.studyTopic?.trim()) {
        const key = e.studyTopic.trim();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([topic, dias]) => ({ topic: topic.length > 16 ? topic.slice(0, 15) + '…' : topic, dias }))
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 7);
  }, [entries]);

  /* XP por tipo */
  const xpByType = useMemo(() => {
    const map = new Map<XPType, number>();
    for (const ev of xpEvents) {
      map.set(ev.type, (map.get(ev.type) ?? 0) + ev.amount);
    }
    return [...map.entries()].map(([type, total]) => ({ type, label: XP_LABELS[type], total }));
  }, [xpEvents]);
  const XP_COLORS = [GOLD, GREEN, '#f59e0b', '#8b5cf6', '#f43f5e'];

  /* Humor */
  const moodData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (e.mood) map.set(MOOD_LABELS[e.mood], (map.get(MOOD_LABELS[e.mood]) ?? 0) + 1);
    }
    return [...map.entries()].map(([humor, dias]) => ({ humor, dias }));
  }, [entries]);

  /* Saldo mensal */
  const monthlyBalance = useMemo(
    () =>
      MONTH_NAMES.map((name, m) => {
        const t = monthlyTotals(budget, selectedYear, m);
        return { mes: name.slice(0, 3), saldo: Math.round(t.balance) };
      }),
    [budget, selectedYear],
  );

  /* Evolução de XP acumulada */
  const xpEvolution = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const ev of xpEvents) {
      byDate.set(ev.date, (byDate.get(ev.date) ?? 0) + ev.amount);
    }
    const dates = [...byDate.keys()].sort();
    return dates.reduce<Array<{ dia: string; xp: number }>>((rows, d) => {
      const prev = rows.length > 0 ? rows[rows.length - 1].xp : 0;
      rows.push({ dia: d.slice(8, 10) + '/' + d.slice(5, 7), xp: prev + (byDate.get(d) ?? 0) });
      return rows;
    }, []);
  }, [xpEvents]);

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={BarChart3}
        title="Estatísticas Avançadas"
        subtitle={`${selectedYear} — o que é medido, melhora`}
      />

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Dias registrados" value={String(entries.length)} icon={CalendarCheck2} tone="gold" />
        <StatCard label="Dias produtivos" value={String(productiveDays)} icon={Zap} sub="com ações produtivas" />
        <StatCard label="Dias de treino" value={String(exerciseDays)} icon={Dumbbell} sub="exercício físico" />
        <StatCard label="Dias com prática" value={String(practiceDays)} icon={Flame} sub="colocou em prática" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Saldo do ano"
          value={formatBRL(yearIncome - yearExpense)}
          icon={Coins}
          tone={yearIncome - yearExpense >= 0 ? 'green' : 'red'}
        />
        <StatCard label="Receitas" value={formatBRL(yearIncome)} icon={Coins} tone="green" />
        <StatCard label="Despesas" value={formatBRL(yearExpense)} icon={Coins} tone="red" />
        <StatCard
          label="XP total"
          value={String(gam.totalXP)}
          icon={Flame}
          tone="gold"
          sub={`nível: ${gam.level.name}`}
        />
      </div>

      {/* Relatório do mês — números + comparação + PDF/imagem */}
      <MonthlyReportSection />

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Temas mais estudados no diário</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {topTopics.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Registre estudos no diário para ver o ranking.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topTopics} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26262c" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9c9ca8' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="topic" width={110} tick={{ fontSize: 11, fill: '#9c9ca8' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="dias" fill={GOLD} radius={[0, 6, 6, 0]} name="dias estudados" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">XP por tipo de ação</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {xpByType.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Seu XP aparecerá após os primeiros registros.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={xpByType} dataKey="total" nameKey="label" innerRadius="50%" outerRadius="80%" paddingAngle={3}>
                    {xpByType.map((_, i) => (
                      <Cell key={i} fill={XP_COLORS[i % XP_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} XP`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Saldo mensal — {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyBalance} margin={{ top: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26262c" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9c9ca8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9c9ca8' }} tickFormatter={(v) => formatCompactBRL(v)} width={70} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="saldo" radius={[4, 4, 0, 0]} name="saldo">
                  {monthlyBalance.map((m, i) => (
                    <Cell key={i} fill={m.saldo >= 0 ? GREEN : RED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução do humor</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {moodData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Registre o humor nas entradas diárias.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moodData} margin={{ top: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26262c" />
                  <XAxis dataKey="humor" tick={{ fontSize: 11, fill: '#9c9ca8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9c9ca8' }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="dias" fill={GOLD} radius={[4, 4, 0, 0]} name="dias" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-gold" /> Evolução acumulada de XP
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {xpEvolution.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                A curva de XP começa com o primeiro dia registrado.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={xpEvolution} margin={{ top: 8, right: 8 }}>
                  <defs>
                    <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26262c" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#9c9ca8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9c9ca8' }} width={60} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} XP`} />
                  <Area type="monotone" dataKey="xp" stroke={GOLD} strokeWidth={2} fill="url(#xpFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
