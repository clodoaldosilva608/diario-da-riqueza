'use client';

/**
 * MonthlyReportSection — "Seu mês em números" na aba Estatísticas.
 *
 * - Navegação de mês (anterior/próximo)
 * - Comparação automática com o mês anterior (setas verde/vermelho)
 * - Exportação: PDF caprichado (jsPDF) + imagem 4:5 para redes (canvas)
 * - Tudo calculado localmente (src/lib/report.ts) — nada sai do dispositivo
 */

import { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, FileDown, Share2, TrendingUp, TrendingDown,
  Minus, CalendarCheck2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBudget, useDreamDeposits, useEntries, useProfile, useStudies, useXpEvents } from '@/hooks/useData';
import { buildMonthlyReport, reportMonthLabel } from '@/lib/report';
import { downloadMonthlyReportPDF } from '@/export/monthly-report';
import { formatBRL } from '@/lib/format';
import { cn } from '@/lib/utils';

const GOLD = '#d4af37';
const INK = '#0a0a0c';
const GREEN = '#10b981';
const RED = '#f87171';

/** Imagem 1080×1350 do relatório para compartilhar nas redes */
function buildReportCanvas(
  r: ReturnType<typeof buildMonthlyReport>,
  userName?: string,
): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'left';

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 300, 40, W / 2, 300, 700);
  glow.addColorStop(0, 'rgba(212,175,55,0.14)');
  glow.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(212,175,55,0.9)';
  ctx.lineWidth = 6;
  ctx.strokeRect(44, 44, W - 88, H - 88);

  ctx.fillStyle = GOLD;
  ctx.font = '700 44px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('DIÁRIO DA RIQUEZA', W / 2, 170);
  ctx.fillStyle = '#f4f4f5';
  ctx.font = '700 56px Arial, sans-serif';
  ctx.fillText('Seu mês em números', W / 2, 250);
  ctx.fillStyle = 'rgba(244,244,245,0.6)';
  ctx.font = '400 36px Arial, sans-serif';
  ctx.fillText(reportMonthLabel(r.year, r.month), W / 2, 306);

  const row = (y: number, label: string, value: string, color = '#f4f4f5') => {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(244,244,245,0.55)';
    ctx.font = '400 30px Arial, sans-serif';
    ctx.fillText(label, 140, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.font = '700 44px Arial, sans-serif';
    ctx.fillText(value, W - 140, y);
  };

  let y = 420;
  row(y, 'Receitas', formatBRL(r.income), GREEN); y += 84;
  row(y, 'Despesas', formatBRL(r.expense), RED); y += 84;
  row(y, 'Saldo', formatBRL(r.balance), r.balance >= 0 ? GREEN : RED); y += 84;
  row(y, 'Taxa de poupança', `${r.savingRate}%`, GOLD); y += 110;

  ctx.strokeStyle = 'rgba(212,175,55,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(140, y); ctx.lineTo(W - 140, y); ctx.stroke(); y += 66;

  row(y, 'Dias registrados', String(r.daysRegistered), GOLD); y += 80;
  row(y, 'Dias com prática', String(r.practiceDays)); y += 80;
  row(y, 'XP do mês', String(r.xpGained), GOLD); y += 80;
  row(y, 'Guardado no cofrinho', formatBRL(r.depositTotal)); y += 110;

  ctx.textAlign = 'center';
  if (userName) {
    ctx.fillStyle = 'rgba(244,244,245,0.85)';
    ctx.font = 'italic 400 34px Georgia, serif';
    ctx.fillText(`revisão de ${userName}`, W / 2, H - 190);
  }
  ctx.fillStyle = 'rgba(244,244,245,0.75)';
  ctx.font = '700 32px Arial, sans-serif';
  ctx.fillText('diariodariqueza.vercel.app', W / 2, H - 130);
  ctx.fillStyle = 'rgba(244,244,245,0.5)';
  ctx.font = '400 28px Arial, sans-serif';
  ctx.fillText('Gratuito e offline • Siga: @dirio.da.riqueza8', W / 2, H - 82);

  return canvas;
}

function DeltaChip({ label, value, invert = false }: { label: string; value: number | null; invert?: boolean }) {
  if (value === null) return null;
  const good = invert ? value < 0 : value > 0;
  const neutral = value === 0;
  const Icon = neutral ? Minus : good ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        neutral
          ? 'border-border text-muted-foreground'
          : good
            ? 'border-emerald-wealth/40 text-emerald-wealth'
            : 'border-loss/40 text-loss',
      )}
      title={`Comparado ao mês anterior: ${label}`}
    >
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

export function MonthlyReportSection() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year] = useState(now.getFullYear());
  const [sharing, setSharing] = useState(false);

  const entries = useEntries();
  const budget = useBudget();
  const studies = useStudies();
  const xpEvents = useXpEvents();
  const deposits = useDreamDeposits();
  const profile = useProfile();

  const report = useMemo(
    () => buildMonthlyReport({ year, month, entries, budget, studies, xpEvents, deposits }),
    [year, month, entries, budget, studies, xpEvents, deposits],
  );

  const monthEntriesCount = report.daysRegistered;

  async function shareImage() {
    setSharing(true);
    try {
      const canvas = buildReportCanvas(report, profile?.name);
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('falha ao gerar imagem'))), 'image/png'),
      );
      const file = new File([blob], 'diario-da-riqueza-mes.png', { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: 'Diário da Riqueza',
          text: `Meu mês em números — saldo ${formatBRL(report.balance)} 💛`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DR_Relatorio_${year}-${String(month + 1).padStart(2, '0')}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.info('Compartilhamento nativo indisponível — imagem baixada.');
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast.error(String(e));
    } finally {
      setSharing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <CalendarCheck2 className="h-4 w-4 text-gold" /> Relatório do mês
          <span className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              aria-label="Mês anterior"
              onClick={() => setMonth((m) => (m === 0 ? 11 : m - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-36 text-center text-sm font-semibold">
              {reportMonthLabel(year, month)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              aria-label="Próximo mês"
              disabled={month >= now.getMonth() && year >= now.getFullYear()}
              onClick={() => setMonth((m) => (m === 11 ? 0 : m + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Financeiro */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-wealth/30 bg-emerald-wealth/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Receitas</p>
            <p className="mt-1 text-lg font-bold text-emerald-wealth tabular-nums">
              {formatBRL(report.income)}
            </p>
          </div>
          <div className="rounded-xl border border-loss/30 bg-loss/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Despesas</p>
            <p className="mt-1 text-lg font-bold text-loss tabular-nums">
              {formatBRL(report.expense)}
              <DeltaChip label="vs mês ant." value={report.comparison?.expense ?? null} invert />
            </p>
          </div>
          <div
            className={cn(
              'rounded-xl border p-3',
              report.balance >= 0 ? 'border-gold/40 bg-gold/5' : 'border-loss/30 bg-loss/5',
            )}
          >
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Saldo</p>
            <p
              className={cn(
                'mt-1 text-lg font-bold tabular-nums',
                report.balance >= 0 ? 'text-gold' : 'text-loss',
              )}
            >
              {formatBRL(report.balance)}
            </p>
            <DeltaChip label="vs mês ant." value={report.comparison?.balance ?? null} />
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Taxa de poupança
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums">{report.savingRate}%</p>
          </div>
        </div>

        {/* Consistência */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Dias registrados
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {report.daysRegistered}
              <DeltaChip label="vs mês ant." value={report.comparison?.daysRegistered ?? null} />
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Dias com prática
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums">{report.practiceDays}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">XP do mês</p>
            <p className="mt-1 text-lg font-bold text-gold tabular-nums">{report.xpGained}</p>
            {report.bestDay && (
              <p className="text-[10px] text-muted-foreground">
                melhor dia: +{report.bestDay.xp} XP
              </p>
            )}
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Cofrinhos
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {formatBRL(report.depositTotal)}
            </p>
            <p className="text-[10px] text-muted-foreground">{report.depositCount} depósito(s)</p>
          </div>
        </div>

        {/* Top categorias */}
        {report.topCategories.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Onde o dinheiro foi (top {report.topCategories.length})
            </p>
            <div className="space-y-1.5">
              {report.topCategories.map((c) => {
                const max = report.topCategories[0]?.total || 1;
                const pct = Math.round((c.total / max) * 100);
                return (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 truncate">{c.name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right font-semibold tabular-nums">
                      {formatBRL(c.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-gold text-black hover:bg-gold-light"
            onClick={() => {
              downloadMonthlyReportPDF(report, profile?.name);
              toast.success('Relatório em PDF baixado!');
            }}
            aria-label="Baixar relatório do mês em PDF"
          >
            <FileDown className="mr-1.5 h-4 w-4" /> Baixar PDF
          </Button>
          <Button variant="outline" onClick={shareImage} disabled={sharing || monthEntriesCount === 0 && report.depositCount === 0}
            aria-label="Compartilhar relatório do mês como imagem">
            <Share2 className="mr-1.5 h-4 w-4" />
            {sharing ? 'Gerando…' : 'Compartilhar imagem'}
          </Button>
          {report.comparison === null && (
            <Badge variant="outline" className="self-center text-[10px] opacity-70">
              comparação disponível a partir do 2º mês de uso
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
