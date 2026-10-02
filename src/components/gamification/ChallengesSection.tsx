'use client';

/**
 * ChallengesSection — Desafios da semana com XP resgatável.
 *
 * Usado em dois lugares:
 * - Dashboard (variante compacta): motivação diária em 1 olhada
 * - Conquistas (variante completa): lista + selo compartilhável
 *
 * XP é único por desafio/semana (chave challengeId:periodKey) — os resgates
 * ficam na tabela challengeCompletions e resistem a reload.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Trophy, Gift, Share2, CheckCheck, Swords } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useBudget, useChallengeCompletions, useDreamDeposits, useEntries } from '@/hooks/useData';
import { completeChallenge } from '@/db/actions';
import { evaluateChallenges, isoWeekKey } from '@/gamification/challenges';
import { ShareBadgeDialog, type BadgeData } from './ShareBadge';
import { cn } from '@/lib/utils';

export function ChallengesSection({
  badgeData,
  compact = false,
}: {
  /** Dados para o selo (nome, streak, nível…) — opcional na variante compacta */
  badgeData?: Omit<BadgeData, 'headline' | 'subline'>;
  compact?: boolean;
}) {
  const entries = useEntries();
  const budget = useBudget();
  const deposits = useDreamDeposits();
  const completions = useChallengeCompletions();
  const [claiming, setClaiming] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareHeadline, setShareHeadline] = useState<string | undefined>(undefined);

  const claimedKeys = new Set(completions.map((c) => c.key));
  const challenges = evaluateChallenges({ entries, budget, deposits }, claimedKeys);
  const week = isoWeekKey(new Date());
  const completedCount = challenges.filter((c) => c.done).length;
  const pendingXP = challenges.reduce((s, c) => s + (c.done && !c.claimed ? c.xp : 0), 0);

  async function handleClaim(id: string, xp: number, title: string) {
    setClaiming(id);
    try {
      const res = await completeChallenge(id, week, xp);
      if (res.xpGained > 0) {
        toast.success(`Desafio concluído: +${res.xpGained} XP!`, { description: title });
        res.newAchievements.forEach((a) =>
          toast.success(`🏆 ${a.title}`, { description: a.description }),
        );
      } else {
        toast.info('Este desafio já foi resgatado nesta semana.');
      }
    } finally {
      setClaiming(null);
    }
  }

  function openBadge(headline?: string) {
    setShareHeadline(headline);
    setShareOpen(true);
  }

  return (
    <section aria-labelledby="desafios-semana-titulo">
      <Card className={cn(compact && 'border-gold/25 bg-gradient-to-br from-gold/10 via-card to-card')}>
        <CardContent className={cn('p-5', compact && 'p-4')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="desafios-semana-titulo"
              className="flex items-center gap-2 font-display text-base font-bold"
            >
              <Swords className="h-4 w-4 text-gold" /> Desafios da semana
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {week}
              </Badge>
              {pendingXP > 0 && (
                <Badge className="bg-gold text-black">
                  <Gift className="mr-1 h-3 w-3" /> {pendingXP} XP esperando
                </Badge>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {completedCount}/{challenges.length} concluídos — XP resgatável uma vez por semana.
          </p>

          <div className={cn('mt-3 grid gap-2.5', !compact && 'sm:grid-cols-2')}>
            {challenges.map((c) => (
              <div
                key={c.id}
                className={cn(
                  'rounded-xl border p-3 transition-colors',
                  c.claimed
                    ? 'border-emerald-wealth/30 bg-emerald-wealth/5'
                    : c.done
                      ? 'border-gold/50 bg-gold/10'
                      : 'border-border',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{c.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{c.description}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-gold/40 text-[10px] text-gold">
                    +{c.xp} XP
                  </Badge>
                </div>
                <Progress value={c.pct} className="mt-2 h-1.5" />
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {c.current}/{c.goal}
                    {!c.done && !compact && <span className="hidden sm:inline"> — {c.hint}</span>}
                  </span>
                  <div className="flex shrink-0 gap-1.5">
                    {c.done && !c.claimed && badgeData && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => openBadge(`Desafio concluído: ${c.title}`)}
                        aria-label={`Compartilhar selo do desafio ${c.title}`}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {c.claimed ? (
                      <Badge variant="outline" className="border-emerald-wealth/40 text-[10px] text-emerald-wealth">
                        <CheckCheck className="mr-1 h-3 w-3" /> Resgatado
                      </Badge>
                    ) : c.done ? (
                      <Button
                        size="sm"
                        className="h-7 bg-gold px-2.5 text-xs text-black hover:bg-gold-light"
                        disabled={claiming === c.id}
                        onClick={() => handleClaim(c.id, c.xp, c.title)}
                      >
                        <Gift className="mr-1 h-3 w-3" /> Resgatar
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {badgeData && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full text-xs text-gold hover:bg-gold/10"
              onClick={() => openBadge(undefined)}
              aria-label="Gerar selo compartilhável do progresso"
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" /> Gerar selo para compartilhar
            </Button>
          )}
        </CardContent>
      </Card>

      {badgeData && (
        <ShareBadgeDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          data={{ ...badgeData, headline: shareHeadline }}
        />
      )}
    </section>
  );
}
