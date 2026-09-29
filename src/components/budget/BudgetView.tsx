'use client';

/**
 * Orçamento — receitas/despesas (única ou mensal), gráficos de fluxo de
 * caixa, categorias, evolução e projeção até a meta financeira.
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Wallet, Plus, TrendingUp, TrendingDown, PiggyBank, Trash2, Pencil,
  Repeat, CalendarClock, ChartPie,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatCard, SectionHeader } from '@/components/shared/ui-kit';
import { useBudget, useProfile } from '@/hooks/useData';
import { addBudgetEntry, updateBudgetEntry, deleteBudgetEntry } from '@/db/actions';
import { useAppStore } from '@/stores/useAppStore';
import { formatBRL, formatCompactBRL, monthlyTotals, MONTH_NAMES, daysUntil } from '@/lib/format';
import type { BudgetEntry, BudgetType } from '@/types';
import { cn } from '@/lib/utils';

const RECEITA_CATEGORIAS = ['Salário', 'Freelance', 'Vendas', 'Investimentos', 'Aluguel recebido', 'Outros'];
const DESPESA_CATEGORIAS = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Investimentos', 'Dívidas', 'Outros'];

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

export function BudgetView() {
  const selectedYear = useAppStore((s) => s.selectedYear);
  const budget = useBudget();
  const profile = useProfile();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetEntry | null>(null);

  // Form
  const [type, setType] = useState<BudgetType>('receita');
  const [category, setCategory] = useState('Salário');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState('');
  const [mensal, setMensal] = useState(false);

  const summary = monthlyTotals(budget, selectedYear, month);
  const savingRate = summary.income > 0 ? Math.round((summary.balance / summary.income) * 100) : 0;

  const monthEntries = useMemo(
    () =>
      budget.filter((b) => {
        if (b.frequency === 'mensal') {
          const startPrefix = b.date.slice(0, 7);
          const curPrefix = `${selectedYear}-${String(month + 1).padStart(2, '0')}`;
          return startPrefix <= curPrefix;
        }
        return b.date.startsWith(`${selectedYear}-${String(month + 1).padStart(2, '0')}`);
      }),
    [budget, selectedYear, month],
  );

  /* --------- Dados dos gráficos --------- */
  const cashflowData = useMemo(
    () =>
      MONTH_NAMES.map((name, m) => {
        const t = monthlyTotals(budget, selectedYear, m);
        return { mes: name.slice(0, 3), receitas: t.income, despesas: t.expense, saldo: t.balance };
      }),
    [budget, selectedYear],
  );

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of monthEntries) {
      if (b.type === 'despesa') map.set(b.category, (map.get(b.category) ?? 0) + b.value);
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthEntries]);
  const PIE_COLORS = [GOLD, RED, '#f59e0b', '#8b5cf6', '#f43f5e', '#14b8a6', '#a3a3b8', '#fb923c', '#67e8f9'];

  const evolutionData = useMemo(
    () =>
      MONTH_NAMES.reduce<Array<{ mes: string; acumulado: number }>>((rows, name, m) => {
        const t = monthlyTotals(budget, selectedYear, m);
        const prev = rows.length > 0 ? rows[rows.length - 1].acumulado : 0;
        rows.push({ mes: name.slice(0, 3), acumulado: Math.round(prev + t.balance) });
        return rows;
      }, []),
    [budget, selectedYear],
  );

  /* --------- Projeção até a meta --------- */
  const projection = useMemo(() => {
    const monthsWithData = cashflowData.filter((m) => m.receitas > 0 || m.despesas > 0);
    const upToNow = monthsWithData.length > 0 ? monthsWithData.length : 1;
    const totalSaldo = cashflowData.slice(0, upToNow).reduce((s, m) => s + m.saldo, 0);
    const avgMonthly = totalSaldo / upToNow;

    const targetDate = profile?.targetDate ?? `${selectedYear + 1}-12-31`;
    const monthsToTarget = Math.max(1, Math.round(daysUntil(targetDate) / 30));
    const goal = profile?.yearGoal ?? 0;

    let acc = totalSaldo;
    const data: Array<{ mes: string; projetado: number; metaAcumulada?: number }> = [];
    const startMonth = now.getMonth();
    const goalPerMonth = goal > 0 ? goal / Math.max(1, monthsToTarget) : 0;
    for (let i = 1; i <= Math.min(monthsToTarget, 24); i++) {
      acc += avgMonthly;
      const mIndex = (startMonth + i) % 12;
      const mLabel = MONTH_NAMES[mIndex].slice(0, 3);
      const row: { mes: string; projetado: number; metaAcumulada?: number } = {
        mes: mLabel,
        projetado: Math.round(acc),
      };
      if (goal > 0) {
        row.metaAcumulada = Math.round(goalPerMonth * i);
      }
      data.push(row);
    }
    const projectedFinal = acc;
    const neededMonthly = goal > 0 ? (goal - totalSaldo) / monthsToTarget : 0;
    return {
      data,
      avgMonthly,
      totalSaldo,
      monthsToTarget,
      projectedFinal,
      neededMonthly,
      onTrack: goal > 0 ? projectedFinal >= goal : true,
    };
  }, [cashflowData, profile, selectedYear, now]);

  function openNew() {
    setEditing(null);
    setType('receita');
    setCategory('Salário');
    setDescription('');
    setValue('');
    setDate(`${selectedYear}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    setMensal(false);
    setDialogOpen(true);
  }

  function openEdit(b: BudgetEntry) {
    setEditing(b);
    setType(b.type);
    setCategory(b.category);
    setDescription(b.description);
    setValue(String(b.value));
    setDate(b.date);
    setMensal(b.frequency === 'mensal');
    setDialogOpen(true);
  }

  async function handleSave() {
    const v = parseFloat(value);
    if (!description.trim() || !date || !(v > 0)) {
      toast.error('Preencha descrição, data e valor maior que zero.');
      return;
    }
    if (!date.startsWith(String(selectedYear))) {
      toast.error(`Este diário é do ano ${selectedYear}. Troque o ano no topo.`);
      return;
    }
    const payload = {
      type,
      category,
      description: description.trim(),
      value: v,
      date,
      frequency: mensal ? ('mensal' as const) : ('unica' as const),
    };
    if (editing?.id) {
      await updateBudgetEntry(editing.id, payload);
      toast.success('Lançamento atualizado.');
    } else {
      await addBudgetEntry(payload);
      toast.success('Lançamento registrado.');
    }
    setDialogOpen(false);
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={Wallet}
        title="Orçamento"
        subtitle={`${MONTH_NAMES[month]} de ${selectedYear} — cada real com destino definido`}
        action={
          <Button onClick={openNew} className="bg-gold text-black hover:bg-gold-light">
            <Plus className="mr-1.5 h-4 w-4" /> Lançamento
          </Button>
        }
      />

      {/* Navegação de mês */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Mês anterior"
          onClick={() => setMonth((m) => (m === 0 ? 11 : m - 1))}>
          ‹
        </Button>
        <span className="min-w-36 text-center text-sm font-semibold">{MONTH_NAMES[month]}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Próximo mês"
          onClick={() => setMonth((m) => (m === 11 ? 0 : m + 1))}>
          ›
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Receitas" value={formatBRL(summary.income)} icon={TrendingUp} tone="green" />
        <StatCard label="Despesas" value={formatBRL(summary.expense)} icon={TrendingDown} tone="red" />
        <StatCard
          label="Saldo"
          value={formatBRL(summary.balance)}
          icon={PiggyBank}
          tone={summary.balance >= 0 ? 'green' : 'red'}
        />
        <StatCard
          label="Taxa de poupança"
          value={`${savingRate}%`}
          icon={ChartPie}
          tone="gold"
          sub="das receitas do mês"
        />
      </div>

      <Tabs defaultValue="lancamentos">
        <TabsList className="grid w-full grid-cols-3 sm:w-96">
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          <TabsTrigger value="projecao">Projeção</TabsTrigger>
        </TabsList>

        {/* ============ LANÇAMENTOS ============ */}
        <TabsContent value="lancamentos" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {monthEntries.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum lançamento neste mês. Registre salário, contas fixas e gastos — dados viram decisões.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {monthEntries.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                          b.type === 'receita' ? 'bg-emerald-wealth/15 text-emerald-wealth' : 'bg-loss/15 text-loss',
                        )}
                      >
                        {b.type === 'receita' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {b.description}
                          {b.frequency === 'mensal' && (
                            <Repeat className="ml-1.5 inline h-3 w-3 text-gold" aria-label="Recorrente" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {b.category} • {b.date.split('-').reverse().join('/')}
                          {b.frequency === 'mensal' && ' • todo mês'}
                        </p>
                      </div>
                      <span className={cn('text-sm font-bold tabular-nums', b.type === 'receita' ? 'text-emerald-wealth' : 'text-loss')}>
                        {b.type === 'receita' ? '+' : '−'}{formatBRL(b.value)}
                      </span>
                      <div className="flex gap-0.5">
                        <button aria-label="Editar lançamento" className="p-1 text-muted-foreground hover:text-foreground" onClick={() => openEdit(b)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          aria-label="Excluir lançamento"
                          className="p-1 text-muted-foreground hover:text-loss"
                          onClick={async () => {
                            if (b.id) {
                              await deleteBudgetEntry(b.id);
                              toast.success('Lançamento excluído.');
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ GRÁFICOS ============ */}
        <TabsContent value="graficos" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Fluxo de caixa — {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26262c" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9c9ca8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9c9ca8' }} tickFormatter={(v) => formatCompactBRL(v)} width={70} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="receitas" fill={GREEN} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill={RED} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Despesas por categoria — {MONTH_NAMES[month]}</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {categoryData.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Sem despesas neste mês.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="52%"
                        outerRadius="82%"
                        paddingAngle={3}
                      >
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolução acumulada — {selectedYear}</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GOLD} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#26262c" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9c9ca8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9c9ca8' }} tickFormatter={(v) => formatCompactBRL(v)} width={70} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                    <Area type="monotone" dataKey="acumulado" stroke={GOLD} strokeWidth={2} fill="url(#goldFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============ PROJEÇÃO ============ */}
        <TabsContent value="projecao" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Saldo médio/mês"
              value={formatBRL(Math.round(projection.avgMonthly))}
              icon={PiggyBank}
              tone={projection.avgMonthly >= 0 ? 'green' : 'red'}
            />
            <StatCard
              label="Projeção na data-alvo"
              value={formatBRL(Math.round(projection.projectedFinal))}
              icon={TrendingUp}
              tone={projection.onTrack ? 'green' : 'red'}
              sub={`${projection.monthsToTarget} meses restantes`}
            />
            <StatCard
              label="Precisa guardar/mês"
              value={formatBRL(Math.round(Math.max(0, projection.neededMonthly)))}
              icon={Wallet}
              tone="gold"
              sub="para bater a meta"
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Projeção até {profile?.targetDate.split('-').reverse().join('/') ?? 'data-alvo'}
                {projection.onTrack ? (
                  <Badge className="ml-2 bg-emerald-wealth/15 text-emerald-wealth">no caminho</Badge>
                ) : (
                  <Badge variant="destructive" className="ml-2">ajustar rota</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projection.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26262c" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9c9ca8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9c9ca8' }} tickFormatter={(v) => formatCompactBRL(v)} width={70} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="projetado" stroke={GOLD} strokeWidth={2} dot={false} name="Projeção (saldo atual)" />
                  <Line type="monotone" dataKey="metaAcumulada" stroke={GREEN} strokeWidth={2} dot={false} strokeDasharray="6 4" name="Ritmo da meta" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <p className="rounded-xl border border-gold/25 bg-gold/5 p-4 text-sm text-muted-foreground">
            A projeção usa o saldo médio dos meses já registrados. Se a linha dourada ficar abaixo da
            verde, o método pede: mais receita (ação produtiva diária), menos despesa, ou redefinir a
            meta com clareza.
          </p>
        </TabsContent>
      </Tabs>

      {/* Dialog lançamento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? 'Editar lançamento' : 'Novo lançamento'}
            </DialogTitle>
            <DialogDescription>Dinheiro sem registro é dinheiro sem controle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['receita', 'Receita', 'text-emerald-wealth border-emerald-wealth/50 bg-emerald-wealth/10'],
                  ['despesa', 'Despesa', 'text-loss border-loss/50 bg-loss/10'],
                ] as Array<[BudgetType, string, string]>
              ).map(([t, label, cls]) => (
                <button
                  key={t}
                  type="button"
                  className={cn(
                    'rounded-xl border py-2.5 text-sm font-semibold transition-all',
                    type === t ? cls : 'border-border text-muted-foreground',
                  )}
                  onClick={() => {
                    setType(t);
                    setCategory(t === 'receita' ? RECEITA_CATEGORIAS[0] : DESPESA_CATEGORIAS[0]);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(type === 'receita' ? RECEITA_CATEGORIAS : DESPESA_CATEGORIAS).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-desc">Descrição</Label>
              <Input
                id="b-desc"
                placeholder="Ex.: Salário de setembro"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-value">Valor (R$)</Label>
                <Input
                  id="b-value"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-date">Data</Label>
                <Input id="b-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <CalendarClock className="h-4 w-4 text-gold" /> Repetir todo mês
                </p>
                <p className="text-xs text-muted-foreground">Salário, aluguel, assinaturas fixas…</p>
              </div>
              <Switch checked={mensal} onCheckedChange={setMensal} aria-label="Lançamento mensal" />
            </div>
            <Button onClick={handleSave} className="w-full bg-gold text-black hover:bg-gold-light">
              {editing ? 'Salvar alterações' : 'Registrar lançamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
