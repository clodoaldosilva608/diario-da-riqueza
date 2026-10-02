'use client';

/**
 * Conquistas — badges desbloqueadas vs bloqueadas, com dica de como obter.
 */

import { Trophy, Lock, Flame, Zap, Crown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/shared/ui-kit';
import { useAchievements, useEntries, useGamification, useProfile } from '@/hooks/useData';
import { ACHIEVEMENTS } from '@/gamification/engine';
import { ChallengesSection } from '@/components/gamification/ChallengesSection';
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/lib/utils';

/** Ícones das conquistas mapeados do lucide (registro local para evitar imports dinâmicos) */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Feather: Trophy,
  Flame: Flame,
  Zap: Zap,
  Crown: Crown,
  Target: Trophy,
  Map: Trophy,
  BookOpen: Trophy,
  GraduationCap: Trophy,
  TrendingUp: Trophy,
  Medal: Trophy,
  Sunrise: Trophy,
  Star: Trophy,
};

export function AchievementsView() {
  const unlocked = useAchievements();
  const entries = useEntries();
  const gam = useGamification(entries);
  const profile = useProfile();
  const unlockedKeys = new Set(unlocked.map((a) => a.key));

  const pct = Math.round((unlockedKeys.size / ACHIEVEMENTS.length) * 100);

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={Trophy}
        title="Conquistas"
        subtitle={`${unlockedKeys.size} de ${ACHIEVEMENTS.length} desbloqueadas — disciplina reconhecida`}
      />

      <Card className="premium-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Coleção dourada</span>
            <span className="font-bold text-gold tabular-nums">{pct}%</span>
          </div>
          <Progress value={pct} className="mt-2.5 h-2.5" />
          <p className="mt-2 text-xs text-muted-foreground">
            Streak atual: <strong className="text-gold">{gam.streak} dias</strong> • Recorde:{' '}
            <strong className="text-gold">{gam.recordStreak} dias</strong>
          </p>
        </CardContent>
      </Card>

      {/* Desafios da semana + selo compartilhável */}
      <ChallengesSection
        badgeData={{
          name: profile?.name ?? '',
          streak: gam.streak,
          recordStreak: gam.recordStreak,
          levelName: gam.level.name,
          totalXP: gam.totalXP,
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const isUnlocked = unlockedKeys.has(a.key);
          const record = unlocked.find((u) => u.key === a.key);
          const Icon = ICONS[a.icon] ?? Trophy;
          return (
            <Card
              key={a.key}
              className={cn(
                'transition-all',
                isUnlocked
                  ? 'border-gold/45 bg-gradient-to-br from-gold/12 via-card to-card shadow-md shadow-gold/5'
                  : 'opacity-70',
              )}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border',
                    isUnlocked ? 'border-gold/50 bg-gold/15' : 'border-border bg-muted',
                  )}
                >
                  {isUnlocked ? (
                    <Icon className="h-5 w-5 text-gold" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm font-bold', isUnlocked && 'gold-gradient-text font-display')}>
                      {a.title}
                    </p>
                    {isUnlocked && (
                      <Badge variant="outline" className="border-gold/40 text-[10px] text-gold">
                        OK
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                  {record && (
                    <p className="mt-1 text-[10px] text-emerald-wealth">
                      Desbloqueada em {new Date(record.unlockedAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
