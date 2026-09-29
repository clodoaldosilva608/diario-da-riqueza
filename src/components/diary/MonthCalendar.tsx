'use client';

/**
 * Calendário mensal do diário — dias com entrada destacados em dourado,
 * com receitas/despesas do dia.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBRL, MONTH_NAMES } from '@/lib/format';
import { todayISO } from '@/db';
import { cn } from '@/lib/utils';
import type { DiaryEntry } from '@/types';

export function MonthCalendar({
  year,
  entries,
  onSelectDay,
}: {
  year: number;
  entries: DiaryEntry[];
  onSelectDay: (date: string, hasEntry: boolean) => void;
}) {
  const [month, setMonth] = useState(new Date().getMonth());
  const byDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: Array<{ iso: string; day: number; entry?: DiaryEntry } | null> = [];
    for (let i = 0; i < startPad; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      arr.push({ iso, day: d, entry: byDate.get(iso) });
    }
    return arr;
  }, [year, month, byDate]);

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">
            {MONTH_NAMES[month]} de {year}
          </h3>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Mês anterior"
              onClick={() => setMonth((m) => (m === 0 ? 11 : m - 1))}
            >
              ‹
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Próximo mês"
              onClick={() => setMonth((m) => (m === 11 ? 0 : m + 1))}
            >
              ›
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <span key={d} className="text-[11px] font-semibold uppercase text-muted-foreground">
              {d}
            </span>
          ))}
          {cells.map((c, i) =>
            c ? (
              <button
                key={i}
                onClick={() => onSelectDay(c.iso, !!c.entry)}
                className={cn(
                  'flex min-h-[52px] flex-col items-center justify-start rounded-lg border p-1.5 text-xs transition-colors sm:min-h-[64px]',
                  c.entry
                    ? 'border-gold/45 bg-gold/10 hover:border-gold'
                    : 'border-border hover:border-gold/30',
                  c.iso === todayISO() && 'ring-1 ring-gold',
                )}
              >
                <span className={cn('font-semibold', c.entry ? 'text-gold' : 'text-muted-foreground')}>
                  {c.day}
                </span>
                {c.entry && (
                  <span className="mt-0.5 flex flex-col items-center gap-0.5">
                    <span className="text-[9px] leading-tight text-emerald-wealth">
                      +{formatBRL(c.entry.income).replace(/\s/g, '')}
                    </span>
                    <span className="text-[9px] leading-tight text-loss">
                      −{formatBRL(c.entry.expense).replace(/\s/g, '')}
                    </span>
                  </span>
                )}
              </button>
            ) : (
              <div key={i} />
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
