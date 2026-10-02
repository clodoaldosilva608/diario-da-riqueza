'use client';

/**
 * SupportOptions — seção dedicada aos PLANOS/PREÇOS da landing page.
 *
 * É o ÚNICO lugar da landing onde valores (R$) aparecem — e NÃO fica
 * visível na página: é montada sob demanda quando o visitante clica em
 * "Planos de apoio" no menu superior (a landing rola até ela no mount).
 *
 * 3 tiers fixos pagos no checkout hospedado da Cakto (Pix/cartão) +
 * destaque do Apoiador Fundador (assinatura mensal) + opção de valor
 * livre via Pix direto do criador (abre o painel Pix existente).
 *
 * Todos os links externos: target="_blank" + rel="noopener noreferrer".
 * Nenhum dado do usuário é coletado nesta página.
 */

import { useState } from 'react';
import { Crown, HeartHandshake, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PixSupportDialog } from '@/components/support/PixSupportDialog';
import {
  CAKTO_FOUNDER_CHECKOUT_URL, CAKTO_FOUNDER_PRICE, CAKTO_TIERS,
  tierCheckoutUrl,
} from '@/lib/cakto';

export function SupportOptions() {
  const [pixOpen, setPixOpen] = useState(false);

  return (
    <section
      id="apoio"
      aria-labelledby="apoio-titulo"
      className="scroll-mt-20 border-t border-border/60 bg-muted/30"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
            <HeartHandshake className="h-3.5 w-3.5" aria-hidden="true" />
            100% gratuito — apoio é opcional
          </span>
          <h2
            id="apoio-titulo"
            className="mt-5 font-display text-3xl font-bold sm:text-4xl"
          >
            Apoie o projeto
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            O Diário da Riqueza é feito por uma única pessoa, nas horas livres, e
            continua gratuito para todos. Escolha um valor fixo no checkout seguro
            da Cakto, vire fundador mensal ou contribua com o valor que quiser via Pix.
          </p>
        </div>

        {/* Tiers fixos — checkout hospedado Cakto */}
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {CAKTO_TIERS.map((tier) => (
            <a
              key={tier.id}
              href={tierCheckoutUrl(tier)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center rounded-3xl border border-border bg-card p-6 text-center transition-colors hover:border-gold/50"
              aria-label={`Apoiar com R$ ${tier.amount} — abre o checkout seguro da Cakto em nova aba`}
              title="Checkout seguro da Cakto — abre em nova aba"
            >
              <span className="font-display text-4xl font-black text-gold">
                R$ {tier.amount}
              </span>
              <span className="mt-2 text-sm font-semibold">
                Apoio único de {`R$ ${tier.amount}`}
              </span>
              <span className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                {tier.hint}
              </span>
              <span className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-gold text-sm font-semibold text-black transition-colors group-hover:bg-gold-light">
                Apoiar agora
              </span>
              <span className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Pix ou cartão · checkout seguro
              </span>
            </a>
          ))}
        </div>

        {/* Fundador + valor livre */}
        <div className="mx-auto mt-6 grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl border border-gold/40 bg-gold/5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
                <Crown className="h-5 w-5 text-gold" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-bold">Apoiador Fundador</h3>
                <p className="text-xs font-semibold text-gold">
                  {`R$ ${CAKTO_FOUNDER_PRICE.toFixed(2).replace('.', ',')}/mês`} · nome no mural
                </p>
              </div>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              Assinatura mensal com status de fundador: seu nome gravado no Mural
              dos Fundadores da página inicial enquanto a assinatura estiver ativa.
            </p>
            <Button
              asChild
              className="mt-4 h-11 bg-gold text-base font-semibold text-black hover:bg-gold-light"
            >
              <a
                href={CAKTO_FOUNDER_CHECKOUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Virar Apoiador Fundador — abre o checkout seguro da Cakto em nova aba"
                title="Checkout seguro da Cakto — abre em nova aba"
              >
                <Crown className="h-4 w-4" aria-hidden="true" />
                Quero ser fundador
              </a>
            </Button>
          </div>

          <div className="flex flex-col rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted/40">
                <HeartHandshake className="h-5 w-5 text-foreground" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-bold">Escolha o valor (Pix)</h3>
                <p className="text-xs text-muted-foreground">
                  Valor livre, direto para o criador
                </p>
              </div>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              Prefere outro valor? Pague via Pix direto — QR Code e chave copia e
              cola, sem intermediários e sem taxas de plataforma.
            </p>
            <Button
              variant="outline"
              className="mt-4 h-11 border-gold/40 text-base font-semibold text-gold hover:bg-gold/10"
              onClick={() => setPixOpen(true)}
              aria-haspopup="dialog"
              aria-label="Apoiar com o valor que quiser via Pix — abre painel com QR Code e chave para copiar"
            >
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
              Apoiar via Pix
            </Button>
          </div>
        </div>
      </div>

      <PixSupportDialog open={pixOpen} onOpenChange={setPixOpen} />
    </section>
  );
}
