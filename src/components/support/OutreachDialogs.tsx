'use client';

/**
 * OutreachDialogs — pop-ups de engajamento do projeto (2 modais locais).
 *
 * 1) Apoio: pedido discreto de contribuição de qualquer valor. O botão
 *    "Apoiar com qualquer valor" fecha este pop-up e abre o PixSupportDialog
 *    (QR Code + chave Pix + copia e cola) já existente — nenhuma duplicação
 *    de lógica de Pix.
 *
 * 2) Site/criadores parceiros: divulga o site pessoal com botões diretos
 *    para conhecer e apoiar os outros apps. Contexto: projetos feitos por
 *    conta própria, só com apoio voluntário, sempre com o objetivo de
 *    aprender e oferecer aplicações gratuitas.
 *
 * Cadência (ver src/lib/outreach.ts):
 * - Checa 40s após o app abrir (e re-checa ao fechar tour/landing).
 * - Ao fechar o pop-up de apoio, agenda o do site após 20s (se vencido).
 * - Cada pop-up no máximo 1x por sessão e no máx. a cada 7 dias
 *   (timestamps persistidos no store — nada vai para servidores).
 * - Nunca aparece com tour guiado, landing ou busca global abertos.
 *
 * Segurança dos links externos: target="_blank" SEMPRE com
 * rel="noopener noreferrer" (corta window.opener — reverse tabnabbing).
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ExternalLink, Globe, HeartHandshake, Sparkles } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PixSupportDialog } from './PixSupportDialog';
import { useAppStore } from '@/stores/useAppStore';
import {
  OUTREACH_CHAIN_DELAY_MS, OUTREACH_FIRST_DELAY_MS,
  shouldShowSitePromo, shouldShowSupportNudge,
} from '@/lib/outreach';
import {
  PARTNERS_URL, PERSONAL_SITE_URL,
  SITE_PROMO_INTRO, SUPPORT_NUDGE_INTRO,
} from '@/lib/contact';

/** Snapshot de gate no estado atual do store (lido dentro de timers) */
function gateNow(busyOverlay: boolean) {
  const s = useAppStore.getState();
  return { hydrated: true, onboarded: s.onboarded, busyOverlay };
}

export function OutreachDialogs() {
  // Hidratação igual ao page.tsx: server snapshot false, client pós-mount
  const hydrated = useSyncExternalStore(
    (cb) => useAppStore.persist.onFinishHydration(() => cb()),
    () => useAppStore.persist.hasHydrated(),
    () => false,
  );
  const onboarded = useAppStore((s) => s.onboarded);
  const tourOpen = useAppStore((s) => s.tourOpen);
  const landingOpen = useAppStore((s) => s.landingOpen);
  const searchOpen = useAppStore((s) => s.searchOpen);
  const setSupportNudgeShown = useAppStore((s) => s.setSupportNudgeShown);
  const setSitePromoShown = useAppStore((s) => s.setSitePromoShown);

  const [supportOpen, setSupportOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);

  // Máx. 1 exibição de cada pop-up por sessão (não persistido)
  const supportShownRef = useRef(false);
  const siteShownRef = useRef(false);
  // True quando o apoio fechou porque o usuário foi ao Pix (sem cadeia)
  const skipChainRef = useRef(false);
  const chainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const busyOverlay = tourOpen || landingOpen || searchOpen;

  // Timer principal: OUTREACH_FIRST_DELAY_MS após o gate liberar
  useEffect(() => {
    if (!hydrated || !onboarded || busyOverlay) return;
    const t = setTimeout(() => {
      const now = Date.now();
      // 1º pop-up: apoio (se vencido e ainda não exibido nesta sessão)
      if (
        !supportShownRef.current &&
        shouldShowSupportNudge(
          now,
          useAppStore.getState().supportNudgeLastAt,
          gateNow(false),
        )
      ) {
        supportShownRef.current = true;
        setSupportNudgeShown(now);
        setSupportOpen(true);
        return;
      }
      // Apoio não vencido → checa o pop-up do site de forma independente
      if (
        !siteShownRef.current &&
        shouldShowSitePromo(
          now,
          useAppStore.getState().sitePromoLastAt,
          gateNow(false),
        )
      ) {
        siteShownRef.current = true;
        setSitePromoShown(now);
        setSiteOpen(true);
      }
    }, OUTREACH_FIRST_DELAY_MS);
    return () => clearTimeout(t);
  }, [hydrated, onboarded, busyOverlay, setSupportNudgeShown, setSitePromoShown]);

  // Limpa timer encadeado ao desmontar
  useEffect(() => () => {
    if (chainTimerRef.current) clearTimeout(chainTimerRef.current);
  }, []);

  /**
   * Fechamento do pop-up de apoio: agenda o pop-up do site (cadeia de 20s)
   * se ele estiver vencido e ainda não tiver aparecido na sessão. O timestamp
   * do site é gravado no agendamento para não duplicar se o app fechar antes.
   */
  function handleSupportOpenChange(next: boolean) {
    setSupportOpen(next);
    if (next) return;
    if (chainTimerRef.current) clearTimeout(chainTimerRef.current);
    // Quem clicou "Apoiar com qualquer valor" já demonstrou intenção — não
    // empilhar o pop-up do site por cima do painel Pix.
    if (skipChainRef.current) {
      skipChainRef.current = false;
      return;
    }
    if (siteShownRef.current) return;
    const now = Date.now();
    if (shouldShowSitePromo(now, useAppStore.getState().sitePromoLastAt, gateNow(busyOverlay))) {
      siteShownRef.current = true;
      setSitePromoShown(now);
      chainTimerRef.current = setTimeout(() => setSiteOpen(true), OUTREACH_CHAIN_DELAY_MS);
    }
  }

  /** Botão principal do pop-up de apoio → abre o painel Pix existente */
  function handleGoToPix() {
    skipChainRef.current = true;
    setSupportOpen(false);
    setPixOpen(true);
  }

  return (
    <>
      {/* ================= POP-UP 1: APOIO (qualquer valor) ================= */}
      <Dialog open={supportOpen} onOpenChange={handleSupportOpenChange}>
        <DialogContent
          className="max-w-[calc(100%-2rem)] gap-3 border-gold/25 p-4 sm:max-w-sm sm:gap-4 sm:p-6"
          role="dialog"
          aria-label="Pedido de apoio voluntário ao projeto"
        >
          <DialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10">
              <HeartHandshake className="h-7 w-7 text-gold" aria-hidden="true" />
            </div>
            <DialogTitle className="text-center font-display text-xl font-bold">
              Apoie este projeto
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed">
              {SUPPORT_NUDGE_INTRO}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col gap-2 sm:flex-col sm:justify-center">
            <Button
              onClick={handleGoToPix}
              className="h-11 w-full whitespace-normal bg-gold text-base font-semibold text-black hover:bg-gold-light"
              aria-label="Apoiar com qualquer valor — abre o painel Pix com QR Code e chave para copiar"
            >
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
              Apoiar com qualquer valor
            </Button>
            <Button
              variant="ghost"
              className="h-10 w-full text-sm text-muted-foreground"
              onClick={() => handleSupportOpenChange(false)}
              aria-label="Agora não — fechar este aviso (ele pode reaparecer em alguns dias)"
            >
              Agora não
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ POP-UP 2: SITE PESSOAL / CRIADORES PARCEIROS ============ */}
      <Dialog open={siteOpen} onOpenChange={setSiteOpen}>
        <DialogContent
          className="max-w-[calc(100%-2rem)] gap-3 border-gold/25 p-4 sm:max-w-md sm:gap-4 sm:p-6"
          role="dialog"
          aria-label="Convite para conhecer o site pessoal e os outros projetos"
        >
          <DialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10">
              <Globe className="h-7 w-7 text-gold" aria-hidden="true" />
            </div>
            <DialogTitle className="text-center font-display text-xl font-bold">
              Conheça meus outros projetos
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed">
              {SITE_PROMO_INTRO}
            </DialogDescription>
          </DialogHeader>

          {/* Selos de contexto — tudo local, sem rastreamento */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {['100% gratuito', 'Feito por uma pessoa', 'Apoio voluntário'].map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold"
              >
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col sm:justify-center">
            <Button
              asChild
              className="h-11 w-full whitespace-normal bg-gold text-base font-semibold text-black hover:bg-gold-light"
            >
              <a
                href={PERSONAL_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visitar meu site pessoal em clodoaldo.vercel.app — abre em nova aba"
                title="Abre em nova aba: https://clodoaldo.vercel.app/"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Visitar meu site
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 w-full whitespace-normal border-gold/40 text-sm font-semibold text-gold hover:bg-gold/10"
            >
              <a
                href={PARTNERS_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Conhecer e apoiar outros apps na página Criadores Parceiros — abre em nova aba"
                title="Abre em nova aba: https://clodoaldo.vercel.app/criadores-parceiros"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Conhecer e apoiar outros apps
              </a>
            </Button>
            <Button
              variant="ghost"
              className="h-10 w-full text-sm text-muted-foreground"
              onClick={() => setSiteOpen(false)}
              aria-label="Talvez depois — fechar este aviso (ele pode reaparecer em alguns dias)"
            >
              Talvez depois
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Painel Pix reaproveitado (QR + chave + copia e cola) */}
      <PixSupportDialog open={pixOpen} onOpenChange={setPixOpen} />
    </>
  );
}
