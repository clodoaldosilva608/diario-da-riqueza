'use client';

/**
 * ShareBadge — selo dourado compartilhável gerado em canvas (1080×1350, 4:5).
 *
 * Transforma progresso (streak, nível, conquistas, desafios) em material
 * pronto para Instagram/TikTok/WhatsApp — divulgação orgânica do projeto.
 * A imagem é gerada 100% no dispositivo (sem upload, sem servidor).
 */

import { useMemo } from 'react';
import { Download, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface BadgeData {
  /** Nome do usuário (exibido como "selo de FULANO") */
  name: string;
  streak: number;
  recordStreak: number;
  levelName: string;
  totalXP: number;
  /** Manchete opcional (ex.: "Desafio da semana concluído!") */
  headline?: string;
  /** Rótulo opcional extra (ex.: "Meta das 10 cumprida") */
  subline?: string;
}

const GOLD = '#d4af37';
const GOLD_LIGHT = '#f0d878';
const INK = '#0a0a0c';
const PAPER = '#f4f4f5';

/** Desenha o selo em canvas (função pura — usada para preview e export) */
export function buildBadgeCanvas(data: BadgeData, scale = 1): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  /* Fundo preto premium */
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  /* Brilhos radiais dourados discretos */
  const glow = ctx.createRadialGradient(W / 2, 260, 40, W / 2, 260, 620);
  glow.addColorStop(0, 'rgba(212,175,55,0.16)');
  glow.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  const glow2 = ctx.createRadialGradient(W / 2, H - 160, 40, W / 2, H - 160, 500);
  glow2.addColorStop(0, 'rgba(212,175,55,0.08)');
  glow2.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  /* Moldura dupla dourada */
  ctx.strokeStyle = 'rgba(212,175,55,0.9)';
  ctx.lineWidth = 6;
  ctx.strokeRect(44, 44, W - 88, H - 88);
  ctx.strokeStyle = 'rgba(212,175,55,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 64, W - 128, H - 128);

  /* Marca no topo */
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = '700 44px Georgia, "Times New Roman", serif';
  ctx.fillText('DIÁRIO DA RIQUEZA', W / 2, 170);
  ctx.fillStyle = 'rgba(244,244,245,0.55)';
  ctx.font = '400 26px Arial, sans-serif';
  ctx.fillText('Treino mental e financeiro — todos os dias', W / 2, 218);

  /* Nome do usuário */
  if (data.name) {
    ctx.fillStyle = 'rgba(244,244,245,0.9)';
    ctx.font = 'italic 400 34px Georgia, serif';
    ctx.fillText(`selo de ${data.name}`, W / 2, 262);
  }

  /* Manchete (headline opcional) */
  let cursorY = 330;
  if (data.headline) {
    ctx.fillStyle = GOLD_LIGHT;
    ctx.font = '700 52px Arial, sans-serif';
    const words = data.headline.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > W - 220 && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    for (const l of lines) {
      ctx.fillText(l, W / 2, cursorY);
      cursorY += 64;
    }
    cursorY += 20;
  }

  /* Número gigante: streak */
  ctx.fillStyle = PAPER;
  ctx.font = '900 300px Georgia, "Times New Roman", serif';
  ctx.fillText(String(data.streak), W / 2, cursorY + 250);
  ctx.fillStyle = GOLD;
  ctx.font = '700 54px Arial, sans-serif';
  ctx.fillText(data.streak === 1 ? 'DIA SEGUIDO' : 'DIAS SEGUIDOS', W / 2, cursorY + 330);

  /* Nível + XP */
  ctx.fillStyle = 'rgba(244,244,245,0.85)';
  ctx.font = '700 44px Arial, sans-serif';
  ctx.fillText(`${data.levelName}  •  ${data.totalXP.toLocaleString('pt-BR')} XP`, W / 2, cursorY + 430);
  ctx.fillStyle = 'rgba(244,244,245,0.5)';
  ctx.font = '400 34px Arial, sans-serif';
  ctx.fillText(`Recorde pessoal: ${data.recordStreak} dias`, W / 2, cursorY + 486);

  /* Subline opcional */
  if (data.subline) {
    ctx.fillStyle = GOLD_LIGHT;
    ctx.font = '400 36px Arial, sans-serif';
    ctx.fillText(data.subline.slice(0, 48), W / 2, cursorY + 556);
  }

  /* Rodapé: site + TikTok do projeto */
  ctx.strokeStyle = 'rgba(212,175,55,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(220, H - 190);
  ctx.lineTo(W - 220, H - 190);
  ctx.stroke();
  ctx.fillStyle = 'rgba(244,244,245,0.75)';
  ctx.font = '700 32px Arial, sans-serif';
  ctx.fillText('diariodariqueza.vercel.app', W / 2, H - 130);
  ctx.fillStyle = 'rgba(244,244,245,0.5)';
  ctx.font = '400 28px Arial, sans-serif';
  ctx.fillText('Gratuito e offline • Siga: @dirio.da.riqueza8', W / 2, H - 82);

  return canvas;
}

/** Canvas → PNG Blob */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('falha ao gerar PNG'))), 'image/png');
  });
}

export function ShareBadgeDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: BadgeData | null;
}) {
  const canvas = useMemo(
    () => (open && data ? buildBadgeCanvas(data, 0.5) : null),
    [open, data],
  );

  async function download() {
    if (!data) return;
    const full = buildBadgeCanvas(data, 1);
    const blob = await canvasToBlob(full);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diario-da-riqueza-selo.png';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Selo baixado! Poste e marque @dirio.da.riqueza8 💛');
  }

  async function share() {
    if (!data) return;
    try {
      const full = buildBadgeCanvas(data, 1);
      const blob = await canvasToBlob(full);
      const file = new File([blob], 'diario-da-riqueza-selo.png', { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: 'Diário da Riqueza',
          text: `Meu treino mental e financeiro: ${data.streak} dias seguidos! 💛`,
        });
      } else {
        await download();
        toast.info('Compartilhamento nativo indisponível — baixei o PNG para você.');
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        toast.error('Não foi possível compartilhar: ' + String(e));
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Seu selo do Diário da Riqueza</DialogTitle>
          <DialogDescription>
            Compartilhe seu progresso — quem vê se inspira e o projeto cresce.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center overflow-hidden rounded-xl border border-gold/30">
          {canvas ? (
            <canvas
              ref={(el) => {
                if (el && canvas) {
                  el.width = canvas.width;
                  el.height = canvas.height;
                  el.getContext('2d')!.drawImage(canvas, 0, 0);
                }
              }}
              className="h-auto w-full"
              aria-label="Prévia do selo compartilhável"
            />
          ) : (
            <Loader2 className="m-8 h-6 w-6 animate-spin text-gold" />
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={download}>
            <Download className="mr-1.5 h-4 w-4" /> Baixar PNG
          </Button>
          <Button className="flex-1 bg-gold text-black hover:bg-gold-light" onClick={share}>
            <Share2 className="mr-1.5 h-4 w-4" /> Compartilhar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
