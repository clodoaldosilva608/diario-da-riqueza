'use client';

/**
 * Diário da Riqueza — página única (SPA local-first).
 * Onboarding → AppShell com views comutadas por Zustand.
 */

import { useSyncExternalStore } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Onboarding } from '@/components/onboarding/Onboarding';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { DiaryView } from '@/components/diary/DiaryView';
import { GoalsView } from '@/components/goals/GoalsView';
import { BudgetView } from '@/components/budget/BudgetView';
import { LibraryView } from '@/components/library/LibraryView';
import { StatsView } from '@/components/stats/StatsView';
import { AchievementsView } from '@/components/achievements/AchievementsView';
import { SettingsView } from '@/components/settings/SettingsView';
import { PrintJournal } from '@/components/print/PrintJournal';
import { XPCelebration } from '@/components/shared/ui-kit';
import { useDailyReminder, useAutoBackup } from '@/hooks/useReminder';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const onboarded = useAppStore((s) => s.onboarded);
  const view = useAppStore((s) => s.view);
  const celebration = useAppStore((s) => s.celebration);
  const clearCelebration = useAppStore((s) => s.clearCelebration);

  // Hidratação do store persistido: server-snapshot false, client true pós-mount
  const hydrated = useSyncExternalStore(
    (cb) => useAppStore.persist.onFinishHydration(() => cb()),
    () => useAppStore.persist.hasHydrated(),
    () => false,
  );

  useDailyReminder();
  useAutoBackup();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 px-6">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!onboarded) {
    return <Onboarding />;
  }

  return (
    <>
      <AppShell>
        {view === 'dashboard' && <Dashboard onOpenEntry={() => useAppStore.getState().setView('diario')} />}
        {view === 'diario' && <DiaryView />}
        {view === 'sonhos' && <GoalsView />}
        {view === 'orcamento' && <BudgetView />}
        {view === 'biblioteca' && <LibraryView />}
        {view === 'estatisticas' && <StatsView />}
        {view === 'conquistas' && <AchievementsView />}
        {view === 'config' && <SettingsView />}
      </AppShell>

      {/* Layout físico impresso (só aparece na impressão) */}
      <PrintJournal />

      {/* Celebração de XP */}
      <XPCelebration celebration={celebration} onDone={clearCelebration} />
    </>
  );
}
