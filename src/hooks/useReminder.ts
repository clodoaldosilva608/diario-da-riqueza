/**
 * Lembretes locais diários (Web Notifications API) + backup automático.
 * Roda enquanto o app estiver aberto; dispara na hora configurada.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { maybeAutoBackup } from '@/db/actions';
import { db, todayISO } from '@/db';

export function useDailyReminder(): void {
  const reminderEnabled = useAppStore((s) => s.reminderEnabled);
  const reminderTime = useAppStore((s) => s.reminderTime);
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!reminderEnabled || typeof Notification === 'undefined') return;

    const tick = async () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (hhmm !== reminderTime) return;
      const key = todayISO();
      if (firedFor.current === key) return;

      const alreadyRegistered = await db.entries.where('date').equals(key).first();
      firedFor.current = key;
      if (alreadyRegistered) return;

      if (Notification.permission === 'granted') {
        new Notification('Diário da Riqueza', {
          body: 'Hora de registrar o dia! Vai pra cima com força. 💪',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
        });
      }
    };

    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [reminderEnabled, reminderTime]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Backup automático diário ao abrir o app */
export function useAutoBackup(): void {
  const autoBackup = useAppStore((s) => s.autoBackup);
  const onboarded = useAppStore((s) => s.onboarded);

  useEffect(() => {
    if (!onboarded || !autoBackup) return;
    maybeAutoBackup(true);
  }, [onboarded, autoBackup]);
}
