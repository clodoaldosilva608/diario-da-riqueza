'use client';

/**
 * OutreachDialogs — ciclo de pop-ups de engajamento do projeto (5 modais).
 *
 * 1) support — Apoio: pedido discreto de contribuição de qualquer valor;
 *    "Apoiar com qualquer valor" abre o PixSupportDialog (QR + chave Pix).
 * 2) share — Compartilhar: texto "versão mais discreta" do criador + botão
 *    que abre o ShareDialog (menu nativo do dispositivo + redes sociais).
 * 3) site — Meu site / criadores parceiros: clodoaldo.vercel.app.
 * 4) method — Sobre o método e como ajudar: as duas perguntas/respostas
 *    ("O método garante riqueza?" e "Como posso ajudar?") + compartilhar.
 * 5) follow — Siga o projeto: botões diretos para seguir no TikTok e no
 *    Instagram (perfis do criador, os mesmos do rodapé do site pessoal).
 *
 * Rotação (ver src/lib/outreach.ts):
 * - 40s após abrir o app, mostra o PRIMEIRO pop-up vencido na ordem
 *   support → share → site → method → follow (cadência de 7 dias por pop-up).
 * - Ao fechar um pop-up SEM ação positiva, o próximo vencido entra em 20s
 *   (cadeia), limitado a OUTREACH_MAX_PER_SESSION por sessão.
 * - Ação positiva (apoiar / compartilhar / visitar site) nunca dispara cadeia.
 * - Nunca aparece com tour guiado, landing ou busca global abertos.
 * - Nada é enviado a servidores: só timestamps locais no localStorage.
 *
 * Segurança dos links externos: target="_blank" SEMPRE com
 * rel="noopener noreferrer" (corta window.opener — reverse tabnabbing).
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  ExternalLink, Globe, HeartHandshake, Share2, ShieldCheck, Users,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PixSupportDialog } from './PixSupportDialog';
import { ShareDialog } from './ShareDialog';
import { InstagramIcon, TikTokIcon } from './icons';
import { useAppStore } from '@/stores/useAppStore';
import {
  OUTREACH_CHAIN_DELAY_MS, OUTREACH_FIRST_DELAY_MS, OUTREACH_MAX_PER_SESSION,
  nextPopupDue, type OutreachGate, type OutreachKind,
} from '@/lib/outreach';
import {
  FOLLOW_INTRO, INSTAGRAM_HANDLE, INSTAGRAM_URL, METHOD_FAQ, PARTNERS_URL,
  PERSONAL_SITE_URL, SITE_PROMO_INTRO, SUPPORT_NUDGE_INTRO, TIKTOK_HANDLE,
  TIKTOK_URL,
} from '@/lib/contact';

type StoreState = ReturnType<typeof useAppStore.getState>;

/** Timestamps persistidos dos 5 pop-ups, na forma que o outreach.ts espera */
function lastByKind(s: StoreState): Record<OutreachKind, number | null> {
  return {
    support: s.supportNudgeLastAt,
    share: s.shareNudgeLastAt,
    site: s.sitePromoLastAt,
    method: s.methodNudgeLastAt,
    follow: s.followNudgeLastAt,
  };
}

/** Gate no estado ATUAL do store (lido dentro de timers) */
function gateFrom(s: StoreState): OutreachGate {
  return {
    hydrated: true,
    onboarded: s.onboarded,
    busyOverlay: s.tourOpen || s.landingOpen || s.searchOpen,
  };
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

  const [openKind, setOpenKind] = useState<OutreachKind | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);

  // Controle de sessão (não persistido)
  const shownRef = useRef<Set<OutreachKind>>(new Set());
  const chainCountRef = useRef(0);
  const chainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ação positiva (apoiar/compartilhar/visitar site) não dispara cadeia
  const positiveRef = useRef(false);

  const busyOverlay = tourOpen || landingOpen || searchOpen;

  function markShown(kind: OutreachKind, at: number) {
    shownRef.current.add(kind);
    const s = useAppStore.getState();
    if (kind === 'support') s.setSupportNudgeShown(at);
    else if (kind === 'share') s.setShareNudgeShown(at);
    else if (kind === 'site') s.setSitePromoShown(at);
    else if (kind === 'follow') s.setFollowNudgeShown(at);
    else s.setMethodNudgeShown(at);
  }

  /** Agenda o próximo pop-up vencido (cadeia de 20s), respeitando limites */
  function scheduleChain() {
    if (chainTimerRef.current) clearTimeout(chainTimerRef.current);
    // Ação positiva = usuário já respondeu ao convite; não insistir agora
    if (positiveRef.current) {
      positiveRef.current = false;
      return;
    }
    if (chainCountRef.current >= OUTREACH_MAX_PER_SESSION) return;
    const s = useAppStore.getState();
    const next = nextPopupDue(
      Date.now(),
      lastByKind(s),
      gateFrom(s),
      [...shownRef.current],
    );
    if (!next) return;
    chainCountRef.current += 1;
    markShown(next, Date.now());
    chainTimerRef.current = setTimeout(() => setOpenKind(next), OUTREACH_CHAIN_DELAY_MS);
  }

  // Timer principal: primeira checagem 40s após o gate liberar
  useEffect(() => {
    if (!hydrated || !onboarded || busyOverlay) return;
    const t = setTimeout(() => {
      const s = useAppStore.getState();
      const next = nextPopupDue(Date.now(), lastByKind(s), gateFrom(s), [...shownRef.current]);
      if (next) {
        chainCountRef.current = 1;
        markShown(next, Date.now());
        setOpenKind(next);
      }
    }, OUTREACH_FIRST_DELAY_MS);
    return () => clearTimeout(t);
  }, [hydrated, onboarded, busyOverlay]);

  // Limpa timer encadeado ao desmontar
  useEffect(() => () => {
    if (chainTimerRef.current) clearTimeout(chainTimerRef.current);
  }, []);

  /** Fecha o pop-up atual com ação positiva e NÃO agenda cadeia */
  function closePositive(action?: () => void) {
    positiveRef.current = true;
    setOpenKind(null);
    scheduleChain(); // consome positiveRef e não agenda nada
    action?.();
  }

  /** Fecha o pop-up atual sem ação ("Agora não", ESC, X) → permite cadeia */
  function closeNeutral() {
    setOpenKind(null);
    scheduleChain();
  }

  /** onOpenChange do Dialog ativo — só dispara em interações do usuário */
  function handleDialogOpenChange(next: boolean) {
    if (next) return;
    closeNeutral();
  }

  return (
    <>
      {/* ================= POP-UP: APOIO (qualquer valor) ================= */}
      <Dialog open={openKind === 'support'} onOpenChange={handleDialogOpenChange}>
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
              onClick={() => closePositive(() => setPixOpen(true))}
              className="h-11 w-full whitespace-normal bg-gold text-base font-semibold text-black hover:bg-gold-light"
              aria-label="Apoiar o projeto — abre painel com valores fixos no checkout seguro, plano de fundador e Pix com valor livre"
            >
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
              Apoiar o projeto
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full whitespace-normal border-gold/40 text-sm font-semibold text-gold hover:bg-gold/10"
              onClick={() => closePositive(() => setShareOpen(true))}
              aria-label="Compartilhar com os amigos — abre o menu de compartilhamento do dispositivo e redes sociais"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Compartilhar com os amigos
            </Button>
            <Button
              variant="ghost"
              className="h-10 w-full text-sm text-muted-foreground"
              onClick={closeNeutral}
              aria-label="Agora não — fechar este aviso (ele pode reaparecer em alguns dias)"
            >
              Agora não
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ POP-UP: COMPARTILHAR (versão mais discreta) ============ */}
      <Dialog open={openKind === 'share'} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-w-[calc(100%-2rem)] gap-3 border-gold/25 p-4 sm:max-w-md sm:gap-4 sm:p-6"
          role="dialog"
          aria-label="Convite para compartilhar a aplicação com os amigos"
        >
          <DialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10">
              <Share2 className="h-7 w-7 text-gold" aria-hidden="true" />
            </div>
            <DialogTitle className="text-center font-display text-xl font-bold">
              Compartilhe com os amigos
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed">
              A ideia do caderno é simples, mas poderosa: definir onde você quer
              chegar, acompanhar seus gastos e registrar o que está fazendo todos
              os dias. Este método virou uma aplicação gratuita e offline —
              compartilhe com quem quiser conhecer.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col gap-2 sm:flex-col sm:justify-center">
            <Button
              onClick={() => closePositive(() => setShareOpen(true))}
              className="h-11 w-full whitespace-normal bg-gold text-base font-semibold text-black hover:bg-gold-light"
              aria-label="Compartilhar — abre o menu do dispositivo com todas as redes e aplicativos disponíveis"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Compartilhar com os amigos
            </Button>
            <Button
              variant="ghost"
              className="h-10 w-full text-sm text-muted-foreground"
              onClick={closeNeutral}
              aria-label="Agora não — fechar este aviso (ele pode reaparecer em alguns dias)"
            >
              Agora não
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ POP-UP: SITE PESSOAL / CRIADORES PARCEIROS ============ */}
      <Dialog open={openKind === 'site'} onOpenChange={handleDialogOpenChange}>
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
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
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
                onClick={() => closePositive()}
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
                onClick={() => closePositive()}
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
              onClick={closeNeutral}
              aria-label="Talvez depois — fechar este aviso (ele pode reaparecer em alguns dias)"
            >
              Talvez depois
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========= POP-UP: SOBRE O MÉTODO E COMO AJUDAR (FAQ) ========= */}
      <Dialog open={openKind === 'method'} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-w-[calc(100%-2rem)] gap-3 border-gold/25 p-4 sm:max-w-md sm:gap-4 sm:p-6"
          role="dialog"
          aria-label="Sobre o método e como ajudar o projeto"
        >
          <DialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10">
              <ShieldCheck className="h-7 w-7 text-gold" aria-hidden="true" />
            </div>
            <DialogTitle className="text-center font-display text-xl font-bold">
              Sobre o método — e como ajudar
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed">
              Transparência total sobre o que esta ferramenta é (e o que não é).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {METHOD_FAQ.map(({ question, answer }) => (
              <div key={question} className="rounded-2xl border border-border p-3 sm:p-4">
                <p className="text-sm font-semibold">{question}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {answer}
                </p>
              </div>
            ))}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col sm:justify-center">
            <Button
              onClick={() => closePositive(() => setShareOpen(true))}
              className="h-11 w-full whitespace-normal bg-gold text-base font-semibold text-black hover:bg-gold-light"
              aria-label="Compartilhar com os amigos — abre o menu do dispositivo com todas as redes disponíveis"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Compartilhar com os amigos
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full whitespace-normal border-gold/40 text-sm font-semibold text-gold hover:bg-gold/10"
              onClick={() => closePositive(() => setPixOpen(true))}
              aria-label="Apoiar com qualquer valor — abre o painel Pix com QR Code e chave para copiar"
            >
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
              Apoiar com qualquer valor
            </Button>
            <Button
              variant="ghost"
              className="h-10 w-full text-sm text-muted-foreground"
              onClick={closeNeutral}
              aria-label="Fechar este aviso (ele pode reaparecer em alguns dias)"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========= POP-UP: SIGA O PROJETO (TikTok + Instagram) ========= */}
      <Dialog open={openKind === 'follow'} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-w-[calc(100%-2rem)] gap-3 border-gold/25 p-4 sm:max-w-sm sm:gap-4 sm:p-6"
          role="dialog"
          aria-label="Convite para seguir o projeto no TikTok e no Instagram"
        >
          <DialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10">
              <Users className="h-7 w-7 text-gold" aria-hidden="true" />
            </div>
            <DialogTitle className="text-center font-display text-xl font-bold">
              Siga o projeto nas redes
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed">
              {FOLLOW_INTRO}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col gap-2 sm:flex-col sm:justify-center">
            <Button
              asChild
              className="h-11 w-full whitespace-normal bg-[#E4405F] text-base font-semibold text-white hover:bg-[#c9354f]"
            >
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => closePositive()}
                aria-label={`Seguir no Instagram (${INSTAGRAM_HANDLE}) — abre em nova aba`}
                title={`Abre em nova aba: ${INSTAGRAM_URL}`}
              >
                <InstagramIcon className="h-4 w-4" aria-hidden="true" />
                Seguir no Instagram
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 w-full whitespace-normal border-foreground/25 text-sm font-semibold hover:bg-foreground/10"
            >
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => closePositive()}
                aria-label={`Seguir no TikTok (${TIKTOK_HANDLE}) — abre em nova aba`}
                title={`Abre em nova aba: ${TIKTOK_URL}`}
              >
                <TikTokIcon className="h-4 w-4" aria-hidden="true" />
                Seguir no TikTok
              </a>
            </Button>
            <Button
              variant="ghost"
              className="h-10 w-full text-sm text-muted-foreground"
              onClick={closeNeutral}
              aria-label="Agora não — fechar este aviso (ele pode reaparecer em alguns dias)"
            >
              Agora não
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modais de destino (fora da rotação, abertos por ações positivas) */}
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
      <PixSupportDialog open={pixOpen} onOpenChange={setPixOpen} />
    </>
  );
}
