'use client';

/**
 * Heatmap de consistência — grade estilo GitHub para o ano selecionado.
 * Intensidade: 0 = sem registro, 1 = registrado, 2 = registrado + com prática.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export function Heatmap({
  year,
  entryDates,
  practiceDates,
}: {
  year: number;
  entryDates: Set<string>;
  practiceDates: Set<string>;
}) {
  const { weeks, monthLabels } = useMemo(() => {
    const weeks: Array<Array<{ date: string; level: 0 | 1 | 2; inYear: boolean } | null>> = [];
    const monthLabels: Array<{ weekIndex: number; label: string }> = [];

    const start = new Date(year, 0, 1);
    // Alinha ao domingo
    start.setDate(start.getDate() - start.getDay());

    const today = new Date();
    const cursor = new Date(start);
    let currentMonth = -1;

    for (let w = 0; w < 54; w++) {
      const week: Array<{ date: string; level: 0 | 1 | 2; inYear: boolean } | null> = [];
      for (let d = 0; d < 7; d++) {
        const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        const inYear = cursor.getFullYear() === year;
        const has = entryDates.has(iso);
        const withPractice = practiceDates.has(iso);
        if (inYear && cursor.getMonth() !== currentMonth && d === 0) {
          currentMonth = cursor.getMonth();
          monthLabels.push({
            weekIndex: w,
            label: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][currentMonth],
          });
        }
        if (cursor > today) week.push(null);
        else
          week.push({
            date: iso,
            level: has ? (withPractice ? 2 : 1) : 0,
            inYear,
          });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return { weeks, monthLabels };
  }, [year, entryDates, practiceDates]);

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[640px]">
        {/* Rótulos de mês */}
        <div className="relative mb-1 h-4">
          {monthLabels.map((m) => (
            <span
              key={`${m.label}-${m.weekIndex}`}
              className="absolute text-[9px] font-medium tracking-wider text-muted-foreground"
              style={{ left: `${m.weekIndex * (100 / 54)}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {/* Rótulos dos dias da semana */}
          <div className="mr-1 flex flex-col gap-[3px] pt-0.5">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <span key={i} className="h-[10px] text-[8px] leading-[10px] text-muted-foreground/60">
                {i % 2 === 1 ? d : ''}
              </span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  title={day?.date && day.level > 0 ? `${day.date} — registrado` : day?.date}
                  className={cn(
                    'heatmap-cell min-h-[10px] w-[10px]',
                    !day && 'opacity-0',
                    day && day.inYear && day.level === 0 && 'bg-muted border border-border/40',
                    day && day.inYear && day.level === 1 && 'bg-gold/35',
                    day && day.inYear && day.level === 2 && 'bg-gold',
                    day && !day.inYear && 'bg-transparent',
                  )}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Menos</span>
          <div className="h-[10px] w-[10px] rounded-[3px] bg-muted border border-border/40" />
          <div className="h-[10px] w-[10px] rounded-[3px] bg-gold/35" />
          <div className="h-[10px] w-[10px] rounded-[3px] bg-gold" />
          <span>Mais</span>
          <span className="ml-3">Dourado cheio = dia com prática registrada 💪</span>
        </div>
      </div>
    </div>
  );
}
