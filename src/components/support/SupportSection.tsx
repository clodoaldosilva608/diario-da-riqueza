'use client';

/**
 * SupportSection — "Ajude a construir o projeto" (no Dashboard).
 *
 * Cards discretos:
 * 1) WhatsApp — abre conversa direta com o criador (wa.me, mensagem pré-preenchida).
 * 2) Pix — modal de apoio voluntário com cópia da chave.
 * 3) Compartilhar — modal com menu nativo + redes sociais.
 * 4) Siga o projeto — Instagram, TikTok e YouTube do criador (nova aba).
 *
 * Não bloqueia a navegação principal: links externos abrem em nova aba e
 * os modais são locais. Nenhum dado do usuário é enviado a servidores.
 */

import { useState } from 'react';
import { HeartHandshake, Share2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InstagramIcon, TikTokIcon, WhatsAppIcon, YouTubeIcon } from './icons';
import { PixSupportDialog } from './PixSupportDialog';
import { ShareDialog } from './ShareDialog';
import {
  INSTAGRAM_HANDLE, INSTAGRAM_URL, PROJECT_TIKTOK_HANDLE, PROJECT_TIKTOK_URL,
  TIKTOK_HANDLE, TIKTOK_URL, WHATSAPP_URL, YOUTUBE_HANDLE, YOUTUBE_URL,
} from '@/lib/contact';

export function SupportSection() {
  const [pixOpen, setPixOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <section aria-labelledby="suporte-projeto-titulo">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartHandshake className="h-4 w-4 text-gold" aria-hidden="true" />
            <span id="suporte-projeto-titulo">Ajude a construir o projeto</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* ==================== WHATSAPP ==================== */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#25D366]/30 bg-[#25D366]/10">
                <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">Falar comigo pelo WhatsApp</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tire dúvidas, envie sugestões ou conheça melhor o projeto.
                </p>
              </div>
              <Button
                asChild
                className="h-11 shrink-0 bg-[#25D366] text-black hover:bg-[#1fb957]"
              >
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Falar comigo pelo WhatsApp — abre uma conversa com o criador do projeto em nova aba ou no aplicativo"
                  title="Abre uma conversa no WhatsApp com o criador do projeto"
                >
                  <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
                  Falar comigo
                </a>
              </Button>
            </div>

            {/* ==================== PIX ==================== */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
                <HeartHandshake className="h-5 w-5 text-gold" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">Apoiar o projeto</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Valores fixos no checkout seguro, fundador mensal ou Pix com valor livre.
                </p>
              </div>
              <Button
                className="h-11 shrink-0 bg-gold text-black hover:bg-gold-light"
                onClick={() => setPixOpen(true)}
                aria-haspopup="dialog"
                aria-label="Apoiar o projeto — abre painel com valores fixos (Cakto), plano de fundador e Pix com valor livre"
              >
                <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                Apoiar o projeto
              </Button>
            </div>
            {/* ==================== COMPARTILHAR ==================== */}
            <div className="flex flex-col gap-3 rounded-2xl border border-gold/30 p-4 sm:flex-row sm:items-center md:col-span-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
                <Share2 className="h-5 w-5 text-gold" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">Compartilhar com os amigos</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Chame mais pessoas para organizar metas, gastos e hábitos — quanto mais apoiadores, mais evolução.
                </p>
              </div>
              <Button
                variant="outline"
                className="h-11 shrink-0 border-gold/40 text-gold hover:bg-gold/10"
                onClick={() => setShareOpen(true)}
                aria-haspopup="dialog"
                aria-label="Compartilhar a aplicação com os amigos — abre o menu do dispositivo e as redes sociais"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Compartilhar
              </Button>
            </div>
            {/* ==================== SIGA O PROJETO ==================== */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center md:col-span-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
                <Users className="h-5 w-5 text-gold" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">Siga o projeto nas redes</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Bastidores do desenvolvimento, dicas de uso e novidades — seguir é gratuito.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  asChild
                  className="h-11 bg-gold text-black hover:bg-gold-light"
                >
                  <a
                    href={PROJECT_TIKTOK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Seguir no TikTok oficial do projeto (${PROJECT_TIKTOK_HANDLE}) — abre em nova aba`}
                    title={`TikTok oficial do projeto ${PROJECT_TIKTOK_HANDLE}`}
                  >
                    <TikTokIcon className="h-4 w-4" aria-hidden="true" />
                    TikTok do projeto
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 border-[#E4405F]/40 text-[#E4405F] hover:bg-[#E4405F]/10"
                >
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Seguir no Instagram (${INSTAGRAM_HANDLE}) — abre em nova aba`}
                    title={`Instagram ${INSTAGRAM_HANDLE}`}
                  >
                    <InstagramIcon className="h-4 w-4" aria-hidden="true" />
                    Instagram
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 border-foreground/25 hover:bg-foreground/10"
                >
                  <a
                    href={TIKTOK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Seguir no TikTok do criador (${TIKTOK_HANDLE}) — abre em nova aba`}
                    title={`TikTok do criador ${TIKTOK_HANDLE}`}
                  >
                    <TikTokIcon className="h-4 w-4" aria-hidden="true" />
                    TikTok do criador
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 border-[#FF0000]/40 text-[#FF0000] hover:bg-[#FF0000]/10"
                >
                  <a
                    href={YOUTUBE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Inscrever-se no canal do YouTube (${YOUTUBE_HANDLE}) — abre em nova aba`}
                    title={`YouTube ${YOUTUBE_HANDLE}`}
                  >
                    <YouTubeIcon className="h-4 w-4" aria-hidden="true" />
                    YouTube
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PixSupportDialog open={pixOpen} onOpenChange={setPixOpen} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
    </section>
  );
}
