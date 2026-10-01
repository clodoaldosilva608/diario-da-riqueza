'use client';

/**
 * FounderWall — "Mural dos Fundadores" na landing page.
 *
 * Busca GET /api/founders (público, cache 5 min). O servidor aplica a regra
 * anti-inadimplência: só aparecem fundadores com assinatura ativa (ou em
 * atraso dentro da carência de 7 dias — marcados com selo "pendente").
 *
 * Privacidade: o nome é sempre a versão formatada ("Clodoaldo S."), nunca
 * o nome completo/e-mail do pagador. Nenhum dado pessoal sai do servidor.
 *
 * Estados: carregando (skeletons), vazio (CTA para virar fundador),
 * indisponível (mensagem honesta, mantém CTA) e populado (grade de cards).
 */

import { useEffect, useState } from 'react';
import { Crown, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CAKTO_FOUNDER_CHECKOUT_URL, CAKTO_FOUNDER_PRICE, FounderEntry, initialsOf,
} from '@/lib/cakto';

interface FoundersResponse {
  configured?: boolean;
  unavailable?: boolean;
  founders?: FounderEntry[];
}

export function FounderWall() {
  const [state, setState] = useState<{
    loading: boolean;
    unavailable: boolean;
    founders: FounderEntry[];
  }>({ loading: true, unavailable: false, founders: [] });

  useEffect(() => {
    let alive = true;
    fetch('/api/founders')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: FoundersResponse) => {
        if (!alive) return;
        setState({
          loading: false,
          unavailable: Boolean(d.unavailable),
          founders: Array.isArray(d.founders) ? d.founders : [],
        });
      })
      .catch(() => {
        if (!alive) return;
        setState({ loading: false, unavailable: true, founders: [] });
      });
    return () => { alive = false; };
  }, []);

  const total = state.founders.length;

  return (
    <section
      id="fundadores"
      aria-labelledby="fundadores-titulo"
      className="scroll-mt-20 border-t border-border/60"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
            Status especial de quem apoia todo mês
          </span>
          <h2
            id="fundadores-titulo"
            className="mt-5 font-display text-3xl font-bold sm:text-4xl"
          >
            Mural dos Fundadores
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Quem vira <span className="font-semibold text-foreground">Apoiador Fundador</span>{' '}
            ({`R$ ${CAKTO_FOUNDER_PRICE.toFixed(2).replace('.', ',')}/mês`}) tem o nome
            gravado aqui, na página inicial, enquanto a assinatura estiver ativa.
            É o apoio que mantém o Diário da Riqueza 100% gratuito e offline para todos.
          </p>
        </div>

        {/* Regras transparentes — combina com a seção de transparência */}
        <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
          {[
            { icon: Sparkles, text: 'Nome no mural em quanto o pagamento aprovar' },
            { icon: ShieldCheck, text: 'Atrasou? Fica 7 dias de carência e depois sai' },
            { icon: HeartHandshake, text: 'Só o primeiro nome aparece — nada de dados' },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-start gap-2.5 rounded-2xl border border-border bg-muted/30 p-3.5"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        {/* Grade de fundadores / estados */}
        <div className="mt-10" aria-live="polite">
          {state.loading ? (
            <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl border border-border p-4"
                >
                  <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : total === 0 ? (
            <div className="mx-auto max-w-md rounded-3xl border border-gold/30 bg-gold/5 p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
                <Crown className="h-8 w-8 text-gold" aria-hidden="true" />
              </div>
              <p className="mt-4 font-display text-lg font-bold">
                {state.unavailable
                  ? 'Não conseguimos carregar o mural agora'
                  : 'O primeiro nome deste mural pode ser o seu'}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {state.unavailable
                  ? 'Tente novamente em alguns instantes — enquanto isso, conheça o plano de fundador.'
                  : 'Seja o fundador número 1: seu nome entra aqui em quanto o primeiro pagamento aprovar.'}
              </p>
              <Button
                asChild
                className="mt-5 h-11 bg-gold text-base font-semibold text-black hover:bg-gold-light"
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
          ) : (
            <>
              <p className="mb-4 text-center text-sm text-muted-foreground">
                {total === 1
                  ? '1 fundador sustentando o projeto'
                  : `${total} fundadores sustentando o projeto`}
              </p>
              <ul className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {state.founders.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-sm font-bold text-gold"
                      aria-hidden="true"
                    >
                      {initialsOf(f.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" title={f.name}>
                        {f.name}
                        {f.pending ? (
                          <span
                            className="ml-1.5 inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-amber-500"
                            title="Assinatura em atraso — dentro da carência de 7 dias"
                          >
                            pendente
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        fundador desde {f.since}
                        {f.period > 1 ? ` · mês ${f.period}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-8 text-center">
                <Button
                  asChild
                  variant="outline"
                  className="h-11 border-gold/40 text-gold hover:bg-gold/10"
                >
                  <a
                    href={CAKTO_FOUNDER_CHECKOUT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Virar Apoiador Fundador — abre o checkout seguro da Cakto em nova aba"
                    title="Checkout seguro da Cakto — abre em nova aba"
                  >
                    <Crown className="h-4 w-4" aria-hidden="true" />
                    Quero ser fundador também
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
