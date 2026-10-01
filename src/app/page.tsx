'use client';

/**
 * Diário da Riqueza — página única (SPA local-first).
 * Onboarding → AppShell com views comutadas por Zustand.
 */

import { useSyncExternalStore, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { LandingPage } from '@/components/landing/LandingPage';
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
import { HelpView } from '@/components/help/HelpView';
import { TourGuide } from '@/components/shared/TourGuide';
import { OutreachDialogs } from '@/components/support/OutreachDialogs';
import { PrintJournal } from '@/components/print/PrintJournal';
import { XPCelebration } from '@/components/shared/ui-kit';
import { useDailyReminder, useAutoBackup } from '@/hooks/useReminder';
import { seedExampleData } from '@/db/seed';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const onboarded = useAppStore((s) => s.onboarded);
  const view = useAppStore((s) => s.view);
  const celebration = useAppStore((s) => s.celebration);
  const clearCelebration = useAppStore((s) => s.clearCelebration);
  const tourDone = useAppStore((s) => s.tourDone);
  const tourOpen = useAppStore((s) => s.tourOpen);
  const setTourOpen = useAppStore((s) => s.setTourOpen);
  const landingSeen = useAppStore((s) => s.landingSeen);
  const setLandingSeen = useAppStore((s) => s.setLandingSeen);
  const landingOpen = useAppStore((s) => s.landingOpen);
  const setLandingOpen = useAppStore((s) => s.setLandingOpen);

  // Hidratação do store persistido: server-snapshot false, client true pós-mount
  const hydrated = useSyncExternalStore(
    (cb) => useAppStore.persist.onFinishHydration(() => cb()),
    () => useAppStore.persist.hasHydrated(),
    () => false,
  );

  useDailyReminder();
  useAutoBackup();

  // Tour guiado: abre automaticamente na 1ª visita pós-onboarding (dashboard)
  useEffect(() => {
    if (!hydrated || !onboarded || tourDone || tourOpen) return;
    if (view !== 'dashboard') return;
    const t = setTimeout(() => setTourOpen(true), 900);
    return () => clearTimeout(t);
  }, [hydrated, onboarded, tourDone, tourOpen, view, setTourOpen]);

  // Dados de exemplo: semeia no boot se ainda não foram semeados (idempotente).
  // Cobre usuários que onboardaram antes da feature existir — o app nunca fica vazio.
  useEffect(() => {
    if (!hydrated || !onboarded) return;
    seedExampleData().catch((e) => console.error('Falha ao semear exemplos:', e));
  }, [hydrated, onboarded]);

  // Atalho /?apresentacao=1 (redirect de /landing): reabre a apresentação para
  // quem já está onboardado. Visitantes novos já veem a landing naturalmente.
  // A URL é limpa em seguida para o parâmetro não reabrir a landing após o
  // onboarding terminar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('apresentacao') !== '1') return;
    window.history.replaceState(null, '', window.location.pathname);
    if (useAppStore.getState().onboarded) setLandingOpen(true);
  }, [setLandingOpen]);

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

  // Landing aberta manualmente (Configurações) — usuários já onboardados
  if (landingOpen) {
    return (
      <LandingPage
        enterLabel="Abrir meu Diário"
        onEnter={() => setLandingOpen(false)}
        onExit={() => setLandingOpen(false)}
      />
    );
  }

  // Visitante novo: landing → "Começar gratuitamente" → onboarding
  if (!onboarded) {
    if (!landingSeen) {
      return <LandingPage onEnter={() => setLandingSeen(true)} />;
    }
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
        {view === 'ajuda' && <HelpView />}
        {view === 'config' && <SettingsView />}
      </AppShell>

      {/* Tour guiado de primeira visita (também acionável em Ajuda/Configurações) */}
      <TourGuide />

      {/* Pop-ups de apoio e de divulgação do site (cadência 7 dias, 1x/sessão) */}
      <OutreachDialogs />

      {/* Layout físico impresso (só aparece na impressão) */}
      <PrintJournal />

      {/* Celebração de XP */}
      <XPCelebration celebration={celebration} onDone={clearCelebration} />
    </>
  );
}
