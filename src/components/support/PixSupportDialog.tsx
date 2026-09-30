'use client';

/**
 * PixSupportDialog — modal de apoio voluntário ao projeto via Pix.
 *
 * - Exibe a chave Pix (telefone) em formato legível e copia a versão normalizada.
 * - Feedback visual imediato ("Chave Pix copiada") + toast.
 * - Instruções simples para pagar no app do banco.
 * - Segurança: apenas exibição e cópia — nenhum dado bancário é coletado,
 *   nenhuma cobrança automática, nenhum pagamento disparado, nada em analytics.
 * - Não gera QR Code: o padrão BR Code exige campos obrigatórios não fornecidos
 *   (ex.: cidade do recebedor, tag 60) — inventar dados violaria a regra do projeto.
 *   A chave + cópia funciona em 100% dos bancos.
 */

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, HeartHandshake, ShieldCheck } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  PIX_KEY_DISPLAY, PIX_KEY_NORMALIZED, PIX_SUPPORT_INTRO, PROJECT_NAME,
} from '@/lib/contact';

/** Copia texto com fallback para navegadores sem Clipboard API (ou permissão negada) */
async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* tenta o fallback abaixo */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const okFlag = document.execCommand('copy');
    document.body.removeChild(ta);
    return okFlag;
  } catch {
    return false;
  }
}

export function PixSupportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpa timer + feedback sempre que o modal fecha (todas as vias passam aqui)
  function handleOpenChange(next: boolean) {
    if (!next) {
      setCopied(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    onOpenChange(next);
  }

  // Limpa timer pendente ao desmontar
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  async function handleCopy() {
    const okFlag = await copyText(PIX_KEY_NORMALIZED);
    if (okFlag) {
      setCopied(true);
      toast.success('Chave Pix copiada!', {
        description: 'Cole no app do seu banco para apoiar o projeto.',
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 3000);
    } else {
      toast.error('Não foi possível copiar automaticamente.', {
        description: 'Selecione a chave destacada e copie manualmente.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md border-gold/25"
        role="dialog"
        aria-label="Painel de apoio ao projeto via Pix"
      >
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10">
            <HeartHandshake className="h-7 w-7 text-gold" aria-hidden="true" />
          </div>
          <DialogTitle className="text-center font-display text-xl font-bold">
            Apoiar o projeto via Pix
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            {PIX_SUPPORT_INTRO}
          </DialogDescription>
        </DialogHeader>

        {/* Chave Pix + cópia */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Chave Pix — telefone
            </p>
            <p
              className="mt-1 select-all font-mono text-lg font-bold tracking-wide text-gold"
              title="Toque e segure (ou dê dois cliques) para selecionar manualmente"
            >
              {PIX_KEY_DISPLAY}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Projeto: {PROJECT_NAME}
            </p>
          </div>

          <Button
            onClick={handleCopy}
            className={`
              h-11 w-full text-base font-semibold
              ${copied
                ? 'bg-emerald-wealth text-white hover:bg-emerald-wealth'
                : 'bg-gold text-black hover:bg-gold-light'}
            `}
            aria-label={
              copied ? 'Chave Pix copiada' : 'Copiar chave Pix para a área de transferência'
            }
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" /> Chave Pix copiada
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" /> Copiar chave Pix
              </>
            )}
          </Button>
          <p aria-live="polite" className="sr-only">
            {copied ? 'Chave Pix copiada com sucesso.' : ''}
          </p>

          {/* Como pagar — passos simples */}
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold">Como apoiar no app do banco</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Abra o aplicativo do seu banco.</li>
              <li>
                Escolha <span className="font-medium text-foreground">Pix</span> →{' '}
                <span className="font-medium text-foreground">Pagar com chave Pix</span>.
              </li>
              <li>Cole a chave copiada e confirme.</li>
              <li>Defina o valor que quiser contribuir e confirme o envio.</li>
            </ol>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-wealth" aria-hidden="true" />
            <p>
              Contribuição opcional, de qualquer valor. Nenhum dado bancário seu é
              coletado ou armazenado — a cópia acontece apenas no seu dispositivo.
            </p>
          </div>
        </div>

        <Separator className="bg-border/60" />

        <DialogFooter className="sm:justify-center">
          <Button variant="outline" className="min-w-28" onClick={() => handleOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
