'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';

/**
 * Aplica o tema salvo (escuro por padrão) no <html> e mantém em sincronia.
 * Também espelha o atributo data-print para estilos de impressão.
 */
export function ThemeBoot() {
  const theme = useAppStore((s) => s.theme);
  const printPhysical = useAppStore((s) => s.printPhysical);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    document.body.dataset.print = printPhysical ? 'fisico' : 'app';
  }, [printPhysical]);

  return null;
}
