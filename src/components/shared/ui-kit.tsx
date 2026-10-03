'use client';

/**
 * Kit de UI premium compartilhado — cards, títulos, estados vazios,
 * badge de XP/nível e overlay de celebração.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { computeLevel } from '@/gamification/engine';

/* --------------------------------- Título de seção --------------------------------- */

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/10">
            <Icon className="h-5 w-5 text-gold" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* --------------------------------- Stat card --------------------------------- */

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'gold' | 'green' | 'red';
}) {
  const toneClass = {
    default: 'text-foreground',
    gold: 'text-gold',
    green: 'text-emerald-wealth',
    red: 'text-loss',
  }[tone];
  return (
    <Card className="min-w-0 premium-card border-border/80">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <Icon className={cn('h-4 w-4 shrink-0', toneClass)} />
        </div>
        <p className={cn('mt-2 truncate text-xl font-bold tabular-nums sm:text-2xl', toneClass)}>{value}</p>
        {sub && <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/* --------------------------------- Empty state --------------------------------- */

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-14 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 border border-gold/25">
        <Icon className="h-7 w-7 text-gold" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* --------------------------------- Badge de nível/XP --------------------------------- */

export function LevelBadge({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const level = computeLevel(xp);
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
        <Trophy className="h-4 w-4 text-gold" />
      </div>
      <div className={cn('min-w-0', compact && 'hidden sm:block')}>
        <p className="truncate text-sm font-semibold leading-tight">
          Nível {level.index + 1} — <span className="gold-gradient-text font-display">{level.name}</span>
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Progress value={level.progress} className="h-1.5 w-24" />
          <span className="text-[11px] tabular-nums text-muted-foreground">{xp} XP</span>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Celebração de XP --------------------------------- */

export function XPCelebration({
  celebration,
  onDone,
}: {
  celebration: { xp: number; message: string } | null;
  onDone: () => void;
}) {
  // ESC também encerra — teclado e leitores de tela precisam de saída nativa;
  // role=dialog torna o overlay visível p/ o anyFlowDialogOpen() (posterga pop-ups).
  useEffect(() => {
    if (!celebration) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [celebration, onDone]);
  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`+${celebration.xp} XP — ${celebration.message}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm no-print"
          onClick={onDone}
        >
          <motion.div
            initial={{ scale: 0.6, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="mx-4 max-w-sm rounded-3xl border border-gold/40 bg-card p-8 text-center shadow-2xl shadow-gold/10"
          >
            {/* Partículas douradas */}
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-2 w-2 rounded-full bg-gold"
                style={{ left: `${10 + i * 8}%`, top: '20%' }}
                initial={{ y: 0, opacity: 1 }}
                animate={{
                  y: [-10, 120 + (i % 4) * 30],
                  x: [(i % 5) * 8 - 16, (i % 3) * 14 - 20],
                  opacity: [1, 0],
                }}
                transition={{ duration: 1.2 + (i % 5) * 0.15, repeat: Infinity, delay: i * 0.08 }}
              />
            ))}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 border border-gold/50"
            >
              <TrendingUp className="h-8 w-8 text-gold" />
            </motion.div>
            <p className="mt-4 font-display text-4xl font-black gold-gradient-text">
              +{celebration.xp} XP
            </p>
            <p className="mt-2 text-sm text-foreground/90">{celebration.message}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              Toque para continuar — vai pra cima com força.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* --------------------------------- Barra da meta anual --------------------------------- */

export function GoalProgressBar({
  accumulated,
  goal,
  targetDate,
}: {
  accumulated: number;
  goal: number;
  targetDate: string;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((Math.max(0, accumulated) / goal) * 100)) : 0;
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Progresso da meta</p>
          <p className="mt-1 text-3xl font-bold tabular-nums gold-gradient-text font-display">
            {pct}%
          </p>
        </div>
        <Wallet className="h-5 w-5 text-gold/60" />
      </div>
      <Progress value={pct} className="mt-3 h-3" />
      <p className="mt-2 text-xs text-muted-foreground">
        Alvo: <span className="font-semibold text-foreground">{goal > 0 ? goal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</span>
        {' • até '}
        <span className="font-semibold text-foreground">
          {targetDate.split('-').reverse().join('/')}
        </span>
      </p>
    </div>
  );
}
