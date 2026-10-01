'use client';

/**
 * PixSupportDialog — modal de apoio voluntário ao projeto via Pix.
 *
 * - Exibe a chave Pix (telefone) em formato legível e copia a versão normalizada.
 * - QR Code Pix: PNG estático importado (asset com hash → cache-first no SW →
 *   funciona offline), gerado a partir do BR Code oficial do banco
 *   (PIX_BR_CODE) e verificado por decodificação em scripts/generate_pix_qr.py.
 * - "Pix copia e cola": botão copia o payload exato do BR Code.
 * - Feedback visual imediato ("Chave Pix copiada" / "Código Pix copiado") + toast.
 * - Instruções simples para pagar no app do banco (QR ou copia e cola).
 * - Segurança: apenas exibição e cópia — nenhum dado bancário é coletado,
 *   nenhuma cobrança automática, nenhum pagamento disparado, nada em analytics,
 *   nenhum serviço externo de geração de QR.
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
  PIX_BR_CODE, PIX_KEY_DISPLAY, PIX_KEY_NORMALIZED, PIX_RECEIVER_NAME,
  PIX_SUPPORT_INTRO, PROJECT_NAME,
} from '@/lib/contact';
import pixQrSrc from './pix-qr.png';

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
  type CopiedWhat = 'key' | 'code';
  const [copied, setCopied] = useState<CopiedWhat | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpa timer + feedback sempre que o modal fecha (todas as vias passam aqui)
  function handleOpenChange(next: boolean) {
    if (!next) {
      setCopied(null);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    onOpenChange(next);
  }

  // Limpa timer pendente ao desmontar
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function flashCopied(what: CopiedWhat, successMsg: string, hint: string) {
    setCopied(what);
    toast.success(successMsg, { description: hint });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(null), 3000);
  }

  async function handleCopyKey() {
    const okFlag = await copyText(PIX_KEY_NORMALIZED);
    if (okFlag) {
      flashCopied('key', 'Chave Pix copiada!', 'Cole no app do seu banco para apoiar o projeto.');
    } else {
      toast.error('Não foi possível copiar automaticamente.', {
        description: 'Selecione a chave destacada e copie manualmente.',
      });
    }
  }

  async function handleCopyCode() {
    const okFlag = await copyText(PIX_BR_CODE);
    if (okFlag) {
      flashCopied('code', 'Código Pix copiado!', 'Use "Pix copia e cola" no app do seu banco.');
    } else {
      toast.error('Não foi possível copiar automaticamente.', {
        description: 'Escaneie o QR Code ou copie a chave Pix manualmente.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] gap-3 border-gold/25 p-4 sm:max-w-md sm:gap-4 sm:p-6"
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

        {/* QR Code — BR Code oficial do banco (PNG estático, offline) */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <div className="mx-auto w-fit max-w-full rounded-xl bg-white p-3 shadow-sm">
              <img
                src={pixQrSrc.src}
                alt={`QR Code Pix do projeto ${PROJECT_NAME} — escaneie com o app do seu banco para apoiar`}
                width={196}
                height={196}
                className="block h-auto w-full max-w-[196px]"
                loading="eager"
                decoding="async"
              />
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Escaneie o QR Code no app do banco — valor livre, você escolhe
            </p>
          </div>

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
              Projeto: {PROJECT_NAME} · Recebedor: {PIX_RECEIVER_NAME}
            </p>
          </div>

          <Button
            onClick={handleCopyKey}
            className={`
              h-11 w-full whitespace-normal text-base font-semibold
              ${copied === 'key'
                ? 'bg-emerald-wealth text-white hover:bg-emerald-wealth'
                : 'bg-gold text-black hover:bg-gold-light'}
            `}
            aria-label={
              copied === 'key' ? 'Chave Pix copiada' : 'Copiar chave Pix para a área de transferência'
            }
          >
            {copied === 'key' ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" /> Chave Pix copiada
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" /> Copiar chave Pix
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleCopyCode}
            className={`
              h-11 w-full whitespace-normal px-3 text-sm font-semibold
              ${copied === 'code'
                ? 'border-emerald-wealth bg-emerald-wealth/10 text-emerald-wealth hover:bg-emerald-wealth/10'
                : ''}
            `}
            aria-label={
              copied === 'code'
                ? 'Código Pix copiado'
                : 'Copiar o código Pix copia e cola para a área de transferência'
            }
          >
            {copied === 'code' ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" /> Código Pix copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" /> Copiar código Pix (copia e cola)
              </>
            )}
          </Button>
          <p aria-live="polite" className="sr-only">
            {copied === 'key'
              ? 'Chave Pix copiada com sucesso.'
              : copied === 'code'
                ? 'Código Pix copia e cola copiado com sucesso.'
                : ''}
          </p>

          {/* Como pagar — passos simples */}
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold">Como apoiar no app do banco</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Abra o aplicativo do seu banco.</li>
              <li>
                Escolha <span className="font-medium text-foreground">Pix</span> →{' '}
                <span className="font-medium text-foreground">Pagar com QR Code</span> ou{' '}
                <span className="font-medium text-foreground">Pix copia e cola</span>.
              </li>
              <li>Escaneie o QR ao lado ou cole o código/chave copiado.</li>
              <li>Confira o recebedor, defina o valor e confirme o envio.</li>
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
