/**
 * Diário da Riqueza — Store principal (Zustand + persistência)
 * Guarda apenas estado de UI/configurações. Dados de negócio vivem no Dexie.
 */

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ViewKey } from '@/types';

export type ThemeMode = 'dark' | 'light';

interface AppState {
  onboarded: boolean;
  view: ViewKey;
  focusMode: boolean;
  theme: ThemeMode;
  selectedYear: number;
  /** Lembretes locais diários */
  reminderEnabled: boolean;
  reminderTime: string; // 'HH:mm'
  /** Backup automático diário */
  autoBackup: boolean;
  /** Pasta conectada (espelho do File System Access) */
  folderConnected: boolean;
  folderName: string | null;
  /** Vault do Obsidian (integração bidirecional) */
  vaultConnected: boolean;
  vaultName: string | null;
  vaultAutoSync: boolean;
  vaultLastSync: string | null;
  /** Busca global */
  searchOpen: boolean;
  /** Escopo de impressão física */
  printPhysical: boolean;
  /** Celebração de XP (transiente) */
  celebration: { xp: number; message: string } | null;

  setOnboarded: (v: boolean) => void;
  setView: (v: ViewKey) => void;
  toggleFocus: () => void;
  setTheme: (t: ThemeMode) => void;
  setYear: (y: number) => void;
  setReminder: (enabled: boolean, time?: string) => void;
  setAutoBackup: (v: boolean) => void;
  setFolder: (connected: boolean, name?: string | null) => void;
  setVault: (connected: boolean, name?: string | null) => void;
  setVaultAutoSync: (v: boolean) => void;
  setVaultSynced: (at: string) => void;
  setSearchOpen: (v: boolean) => void;
  setPrintPhysical: (v: boolean) => void;
  celebrate: (xp: number, message: string) => void;
  clearCelebration: () => void;
}

function currentYear(): number {
  return new Date().getFullYear();
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      onboarded: false,
      view: 'dashboard',
      focusMode: false,
      theme: 'dark',
      selectedYear: currentYear(),
      reminderEnabled: false,
      reminderTime: '06:00',
      autoBackup: true,
      folderConnected: false,
      folderName: null,
      vaultConnected: false,
      vaultName: null,
      vaultAutoSync: false,
      vaultLastSync: null,
      searchOpen: false,
      printPhysical: false,
      celebration: null,

      setOnboarded: (v) => set({ onboarded: v }),
      setView: (v) => set({ view: v }),
      toggleFocus: () => set((s) => ({ focusMode: !s.focusMode })),
      setTheme: (t) => set({ theme: t }),
      setYear: (y) => set({ selectedYear: y }),
      setReminder: (enabled, time) =>
        set((s) => ({ reminderEnabled: enabled, reminderTime: time ?? s.reminderTime })),
      setAutoBackup: (v) => set({ autoBackup: v }),
      setFolder: (connected, name) => set({ folderConnected: connected, folderName: name ?? null }),
      setVault: (connected, name) => set({ vaultConnected: connected, vaultName: name ?? null }),
      setVaultAutoSync: (v) => set({ vaultAutoSync: v }),
      setVaultSynced: (at) => set({ vaultLastSync: at }),
      setSearchOpen: (v) => set({ searchOpen: v }),
      setPrintPhysical: (v) => set({ printPhysical: v }),
      celebrate: (xp, message) => set({ celebration: { xp, message } }),
      clearCelebration: () => set({ celebration: null }),
    }),
    {
      name: 'diario-da-riqueza',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Nunca persistir estado transiente
      partialize: (state) => {
        const { celebration: _c, searchOpen: _s, ...rest } = state;
        return rest as AppState;
      },
    },
  ),
);

/** Anos disponíveis: ano corrente + anos que têm entradas (gerido pelos hooks) */
export const YEARS = (extra: number[] = []): number[] => {
  const set = new Set<number>([currentYear(), ...extra]);
  return [...set].sort((a, b) => b - a);
};
