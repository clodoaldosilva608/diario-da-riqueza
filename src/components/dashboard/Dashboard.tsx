'use client';

/**
 * Dashboard principal — centro de comando do treino mental e financeiro:
 * meta anual, streak, XP/nível, orçamento do mês, aprendizados, heatmap,
 * mensagem motivacional e conquistas recentes.
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import {
  Flame, Sparkles, BookOpen, TrendingUp, Wallet, Trophy, CalendarCheck2,
  Quote, ArrowRight, Medal, Target, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/useAppStore';
import {
  useProfile, useEntries, useBudget, useStudies, useAchievements, useGamification,
  useMonthlyBudgetSummary,
} from '@/hooks/useData';
import { formatBRL, formatDayMonth, daysUntil, MONTH_NAMES } from '@/lib/format';
import { messageOfTheDay } from '@/lib/motivation';
import { ACHIEVEMENTS } from '@/gamification/engine';
import { GoalProgressBar, StatCard, LevelBadge } from '@/components/shared/ui-kit';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { RegistrarHojeButton } from '@/components/layout/AppShell';
import { SupportSection } from '@/components/support/SupportSection';
import { countExampleData, clearExampleData } from '@/db/seed';

const EXAMPLE_BANNER_DISMISSED = 'dr_exemplo_banner_ok';

export function Dashboard({ onOpenEntry }: { onOpenEntry: (date: string) => void }) {
  const setView = useAppStore((s) => s.setView);
  const selectedYear = useAppStore((s) => s.selectedYear);
  const today = new Date();

  const profile = useProfile();
  const entries = useEntries(selectedYear);
  const allEntries = useEntries();
  const budget = useBudget();
  const studies = useStudies();
  const achievements = useAchievements();
  const gam = useGamification(allEntries);
  const monthSummary = useMonthlyBudgetSummary(budget, today.getFullYear(), today.getMonth());

  const yearAccumulated = useMemo(() => {
    const prefix = String(selectedYear);
    let acc = 0;
    for (const b of budget) {
      if (b.frequency === 'mensal') {
        // mensal acumula do início até o mês corrente do ano
        if (b.date.slice(0, 4) <= prefix) {
          acc += b.type === 'receita' ? b.value : -b.value;
        }
      } else if (b.date.startsWith(prefix)) {
        acc += b.type === 'receita' ? b.value : -b.value;
      }
    }
    return acc;
  }, [budget, selectedYear]);

  const lastLearnings = useMemo(
    () =>
      entries
        .filter((e) => e.studySummary && e.studySummary.trim().length > 0)
        .slice(0, 3),
    [entries],
  );

  const recentAchievements = useMemo(
    () =>
      [...achievements]
        .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
        .slice(0, 3)
        .map((a) => ACHIEVEMENTS.find((def) => def.key === a.key))
        .filter(Boolean),
    [achievements],
  );

  const entryDates = useMemo(() => new Set(entries.map((e) => e.date)), [entries]);
  const practiceDates = useMemo(
    () => new Set(entries.filter((e) => e.practice?.trim()).map((e) => e.date)),
    [entries],
  );

  const motivation = messageOfTheDay(today);
  const daysLeft = profile ? daysUntil(profile.targetDate) : 0;

  // Banner dos dados de exemplo (some para sempre após fechar ou limpar)
  const exampleCount = useLiveQuery(() => countExampleData(), [], 0);
  const [bannerClosed, setBannerClosed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(EXAMPLE_BANNER_DISMISSED) === '1',
  );
  const showExampleBanner = exampleCount > 0 && !bannerClosed;

  return (
    <div className="space-y-6">
      {/* Saudação + mensagem motivacional */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">
            Olá, <span className="gold-gradient-text">{profile?.name ?? 'Campeão'}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 border-gold/40 text-gold">
            <Flame className="h-3.5 w-3.5" /> {gam.streak} dias seguidos
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <Medal className="h-3.5 w-3.5 text-muted-foreground" /> Recorde: {gam.recordStreak}
          </Badge>
        </div>
      </div>

      {/* Registrar Hoje */}
      <RegistrarHojeButton
        registered={gam.registeredToday}
        onClick={() => setView('diario')}
      />

      {/* Banner: dados de exemplo prontos para explorar */}
      {showExampleBanner && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-start gap-3 rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/12 via-gold/5 to-transparent p-4 sm:flex-row sm:items-start"
        >
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Você começa com dados de exemplo prontos
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {exampleCount} registro(s) de demonstração (diário, metas, orçamento e estudos) para você
              ver o método funcionando — sincronizados com o Obsidian. Explore, edite ou apague quando quiser.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="border-gold/40 text-gold"
              onClick={() => setView('ajuda')}
            >
              Saber mais
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  const n = await clearExampleData();
                  toast.success(`${n} registro(s) de exemplo apagado(s).`);
                } catch (e) {
                  toast.error('Falha ao apagar exemplos: ' + String(e));
                }
              }}
            >
              Apagar
            </Button>
            <button
              aria-label="Fechar aviso"
              className="text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                setBannerClosed(true);
                try {
                  localStorage.setItem(EXAMPLE_BANNER_DISMISSED, '1');
                } catch {
                  /* storage indisponível — banner só volta no próximo boot */
                }
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Meta anual + mensagem do dia */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="premium-card h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-gold" /> Meta Financeira {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile && (
                <GoalProgressBar
                  accumulated={yearAccumulated}
                  goal={profile.yearGoal}
                  targetDate={profile.targetDate}
                />
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {daysLeft} dias restantes até a data-alvo — cada dia registrado aproxima você dela.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <Card className="h-full border-gold/25 bg-gradient-to-br from-gold/10 via-card to-card">
            <CardContent className="flex h-full flex-col justify-between p-5">
              <div>
                <div className="flex items-center gap-2 text-gold">
                  <Quote className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Treino mental do dia
                  </span>
                </div>
                <p className="mt-3 font-display text-xl leading-snug">
                  “{motivation}”
                </p>
              </div>
              <LevelBadge xp={gam.totalXP} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Dias registrados"
          value={String(entries.length)}
          icon={CalendarCheck2}
          sub={`em ${selectedYear}`}
        />
        <StatCard
          label="Receitas do mês"
          value={formatBRL(monthSummary.income)}
          icon={TrendingUp}
          tone="green"
        />
        <StatCard
          label="Despesas do mês"
          value={formatBRL(monthSummary.expense)}
          icon={Wallet}
          tone="red"
        />
        <StatCard
          label="Estudos concluídos"
          value={String(studies.filter((s) => s.status === 'concluido').length)}
          icon={BookOpen}
          sub={`${studies.length} temas na biblioteca`}
          tone="gold"
        />
      </div>

      {/* Heatmap de consistência */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-gold" />
            Calendário de consistência — {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Heatmap year={selectedYear} entryDates={entryDates} practiceDates={practiceDates} />
        </CardContent>
      </Card>

      {/* Aprendizados recentes + conquistas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-gold" /> Últimos aprendizados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastLearnings.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Registre o que aprendeu no diário diário para ver aqui.
              </p>
            )}
            {lastLearnings.map((e) => (
              <button
                key={e.id}
                onClick={() => onOpenEntry(e.date)}
                className="w-full rounded-xl border border-border p-3 text-left transition-colors hover:border-gold/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{e.studyTopic || 'Aprendizado'}</p>
                  <span className="text-xs text-muted-foreground">{formatDayMonth(e.date)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.studySummary}</p>
              </button>
            ))}
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setView('biblioteca')}>
              Abrir biblioteca <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-gold" /> Conquistas recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAchievements.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Registre dias seguidos e conclua estudos para desbloquear conquistas.
              </p>
            )}
            {recentAchievements.map((a) => (
              <div key={a!.key} className="flex items-center gap-3 rounded-xl border border-gold/25 bg-gold/5 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15">
                  <Trophy className="h-4 w-4 text-gold" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{a!.title}</p>
                  <p className="text-xs text-muted-foreground">{a!.description}</p>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setView('conquistas')}>
              Ver todas <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ajude a construir o projeto (WhatsApp + Pix) */}
      <SupportSection />
    </div>
  );
}
