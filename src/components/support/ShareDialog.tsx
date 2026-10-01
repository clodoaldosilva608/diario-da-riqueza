'use client';

/**
 * ShareDialog — "Compartilhar com os amigos".
 *
 * - Botão principal: Web Share API (navigator.share) — abre o menu NATIVO do
 *   dispositivo com TODOS os apps instalados (WhatsApp, Instagram, SMS,
 *   Telegram, Bluetooth etc.). Só aparece onde a API existe (HTTPS).
 * - Grade de atalhos web (universal/desktop): WhatsApp, Telegram, Facebook,
 *   X, LinkedIn, E-mail — todos com rel="noopener noreferrer".
 * - "Copiar link": fallback offline-friendly para colar em qualquer conversa.
 *
 * Privacidade: nenhum rastreamento de clique/compartilhamento — só abre
 * intents externas e copia texto localmente.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import {
  Check, Copy, Facebook, Linkedin, Mail, MessageCircle, Send, Share2, Twitter,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { copyText } from '@/lib/clipboard';
import {
  buildShareTargets, PROJECT_NAME, SHARE_INTRO, SHARE_TEXT, SHARE_URL,
} from '@/lib/contact';

/** Alvos da grade (nome → ícone). Montado a partir do builder puro testado. */
const TARGETS = buildShareTargets(SHARE_TEXT, SHARE_URL);

const TARGET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  WhatsApp: MessageCircle,
  Telegram: Send,
  Facebook: Facebook,
  'X (Twitter)': Twitter,
  LinkedIn: Linkedin,
  'E-mail': Mail,
};

const TARGET_COLORS: Record<string, string> = {
  WhatsApp: 'border-[#25D366]/30 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20',
  Telegram: 'border-sky-500/30 bg-sky-500/10 text-sky-500 hover:bg-sky-500/20',
  Facebook: 'border-[#1877F2]/30 bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20',
  'X (Twitter)': 'border-foreground/20 bg-foreground/5 text-foreground hover:bg-foreground/10',
  LinkedIn: 'border-[#0A66C2]/30 bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20',
  'E-mail': 'border-gold/30 bg-gold/10 text-gold hover:bg-gold/20',
};

export function ShareDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // navigator.share só existe em contexto seguro (HTTPS). useSyncExternalStore
  // evita setState-síncrono-em-effect (regra react-hooks) e hydration mismatch:
  // server snapshot = false, client = capacidade real do navegador.
  const hasNativeShare = useSyncExternalStore(
    () => () => {}, // a capacidade não muda durante a sessão
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    () => false,
  );
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpa timer ao desmontar. O flag `copied` NÃO é resetado no fechamento
  // (setState síncrono em effect é proibido pela regra de lint): o timer de
  // 3s o desliga sozinho, e a renderização usa `open && copied`.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const showCopied = open && copied;

  /** Menu nativo do dispositivo — mostra todos os apps instalados */
  async function handleNativeShare() {
    try {
      await navigator.share({ title: PROJECT_NAME, text: SHARE_TEXT, url: SHARE_URL });
      // Compartilhamento concluído (ou cancelado pelo usuário) — não rastreamos.
    } catch {
      /* AbortError = usuário fechou o menu; outros erros: grade é o fallback */
    }
  }

  async function handleCopyLink() {
    const okFlag = await copyText(SHARE_URL);
    if (okFlag) {
      setCopied(true);
      toast.success('Link copiado!', { description: 'Cole em qualquer conversa e chame seus amigos.' });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 3000);
    } else {
      toast.error('Não foi possível copiar automaticamente.', {
        description: `Copie manualmente: ${SHARE_URL}`,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] gap-3 border-gold/25 p-4 sm:max-w-md sm:gap-4 sm:p-6"
        role="dialog"
        aria-label="Compartilhar a aplicação com os amigos"
      >
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10">
            <Share2 className="h-7 w-7 text-gold" aria-hidden="true" />
          </div>
          <DialogTitle className="text-center font-display text-xl font-bold">
            Compartilhar com os amigos
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            {SHARE_INTRO}
          </DialogDescription>
        </DialogHeader>

        {/* Menu nativo do dispositivo (celular): TODOS os apps instalados */}
        {hasNativeShare && (
          <Button
            onClick={handleNativeShare}
            className="h-11 w-full whitespace-normal bg-gold text-base font-semibold text-black hover:bg-gold-light"
            aria-label="Abrir o menu de compartilhamento do dispositivo com todos os aplicativos disponíveis"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Compartilhar (menu do dispositivo)
          </Button>
        )}

        {/* Grade de redes — fallback universal (desktop) e atalhos rápidos */}
        <div
          className="grid grid-cols-3 gap-2"
          role="group"
          aria-label="Compartilhar em uma rede específica"
        >
          {TARGETS.map(({ name, href }) => {
            const Icon = TARGET_ICONS[name] ?? Share2;
            return (
              <Button
                key={name}
                asChild
                variant="outline"
                className={`h-16 flex-col gap-1 border ${TARGET_COLORS[name] ?? ''}`}
              >
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Compartilhar no ${name} — abre em nova aba`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="text-[11px] font-medium leading-none">{name}</span>
                </a>
              </Button>
            );
          })}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:justify-center">
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className={`
              h-11 w-full whitespace-normal text-sm font-semibold
              ${showCopied ? 'border-emerald-wealth bg-emerald-wealth/10 text-emerald-wealth hover:bg-emerald-wealth/10' : ''}
            `}
            aria-label={showCopied ? 'Link copiado' : 'Copiar o link da aplicação para a área de transferência'}
          >
            {showCopied ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" /> Link copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" /> Copiar link
              </>
            )}
          </Button>
          <p aria-live="polite" className="sr-only">
            {showCopied ? 'Link copiado com sucesso.' : ''}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            No celular, o menu do dispositivo mostra todos os aplicativos instalados.
          </p>
          <Button
            variant="ghost"
            className="h-10 w-full text-sm text-muted-foreground"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar a janela de compartilhamento"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
