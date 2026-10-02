'use client';

/**
 * PermanentMessage — mensagem fixa de agradecimento e apoio (Dashboard).
 *
 * Mensagem PERMANENTE (não dispensável — sem botão de fechar) que:
 * 1. Agradece a pessoa por usar a plataforma;
 * 2. Aponta a aba "Ajuda" para sugestões e dúvidas;
 * 3. Convida a contribuir com qualquer valor para manter o projeto no ar;
 * 4. Convida a seguir todas as redes sociais do projeto
 *    (TikTok oficial @dirio.da.riqueza8, Instagram, TikTok do criador e YouTube).
 *
 * Não bloqueia a navegação: os links externos abrem em nova aba
 * (rel="noopener noreferrer") e o apoio abre o painel Pix existente.
 */

import { useState } from 'react';
import { HelpCircle, HeartHandshake } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';
import { InstagramIcon, TikTokIcon, YouTubeIcon } from './icons';
import { PixSupportDialog } from './PixSupportDialog';
import {
  INSTAGRAM_HANDLE, INSTAGRAM_URL, PROJECT_TIKTOK_HANDLE, PROJECT_TIKTOK_URL,
  TIKTOK_HANDLE, TIKTOK_URL, YOUTUBE_HANDLE, YOUTUBE_URL,
} from '@/lib/contact';

export function PermanentMessage() {
  const setView = useAppStore((s) => s.setView);
  const [pixOpen, setPixOpen] = useState(false);

  return (
    <section aria-labelledby="mensagem-permanente-titulo">
      <Card className="overflow-hidden border-gold/30 bg-gradient-to-r from-gold/12 via-card to-card">
        <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          {/* ==================== TEXTO DA MENSAGEM ==================== */}
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
              <HeartHandshake className="h-5 w-5 text-gold" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="mensagem-permanente-titulo"
                className="font-display text-lg font-bold leading-snug"
              >
                Obrigado por usar o <span className="gold-gradient-text">Diário da Riqueza</span>!
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Que bom ter você aqui — este projeto é feito com dedicação para
                continuar gratuito para todos. Se tiver alguma{' '}
                <strong className="font-semibold text-foreground">sugestão ou dúvida</strong>,
                procure na aba <strong className="font-semibold text-foreground">Ajuda</strong>.
                Se puder, contribua com qualquer valor para ajudar o projeto a se
                manter no ar e siga todas as nossas redes sociais para não perder
                as novidades.
              </p>
            </div>
          </div>

          {/* ==================== AÇÕES ==================== */}
          <div className="flex shrink-0 flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11 border-gold/40 text-gold hover:bg-gold/10"
                onClick={() => setView('ajuda')}
                aria-label="Abrir a aba Ajuda — central de dúvidas, perguntas frequentes e sugestões"
              >
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
                Sugestões? Aba Ajuda
              </Button>
              <Button
                className="h-11 bg-gold text-black hover:bg-gold-light"
                onClick={() => setPixOpen(true)}
                aria-haspopup="dialog"
                aria-label="Contribuir com qualquer valor — abre o painel de apoio (Cakto, fundador ou Pix com valor livre)"
              >
                <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                Contribua com qualquer valor
              </Button>
            </div>

            {/* Redes sociais — TikTok oficial do projeto em destaque */}
            <div
              className="flex items-center gap-2"
              role="group"
              aria-label="Siga o Diário da Riqueza em todas as redes sociais"
            >
              <span className="mr-1 hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
                Siga o projeto:
              </span>
              <a
                href={PROJECT_TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/50 bg-gold/10 text-gold transition-colors hover:bg-gold/20"
                aria-label={`TikTok oficial do projeto (${PROJECT_TIKTOK_HANDLE}) — abre em nova aba`}
                title={`TikTok oficial do projeto ${PROJECT_TIKTOK_HANDLE}`}
              >
                <TikTokIcon className="h-4 w-4" />
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-[#E4405F]/50 hover:text-[#E4405F]"
                aria-label={`Instagram (${INSTAGRAM_HANDLE}) — abre em nova aba`}
                title={`Instagram ${INSTAGRAM_HANDLE}`}
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
                aria-label={`TikTok do criador (${TIKTOK_HANDLE}) — abre em nova aba`}
                title={`TikTok do criador ${TIKTOK_HANDLE}`}
              >
                <TikTokIcon className="h-4 w-4" />
              </a>
              <a
                href={YOUTUBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-[#FF0000]/50 hover:text-[#FF0000]"
                aria-label={`YouTube (${YOUTUBE_HANDLE}) — abre em nova aba`}
                title={`YouTube ${YOUTUBE_HANDLE}`}
              >
                <YouTubeIcon className="h-4 w-4" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <PixSupportDialog open={pixOpen} onOpenChange={setPixOpen} />
    </section>
  );
}
