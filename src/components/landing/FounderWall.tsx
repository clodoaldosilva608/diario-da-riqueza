'use client';

/**
 * FounderWall — "Mural dos Fundadores" na landing page.
 *
 * Composição do mural (ver src/lib/founder-showcase.ts):
 * 1. FUNDADOR OURO — o criador/operador em evidência permanente, card
 *    especial com coroa sempre em primeiro lugar;
 * 2. COMUNIDADE — 75 nomes de fundadores que apoiam o projeto (prova
 *    social, formato de privacidade "Nome S.");
 * 3. REAIS — fundadores vindos de GET /api/founders (assinaturas ativas
 *    ou em atraso dentro da carência de 7 dias, marcados "pendente").
 *
 * Privacidade: nenhum nome completo/e-mail sai do servidor. Estados:
 * carregando (skeletons) e populado — o mural nunca fica vazio, pois as
 * camadas 1 e 2 são locais; a camada real é somada a elas.
 *
 * Recolhido por padrão: a grade mostra só os primeiros nomes
 * (PREVIEW_COUNT) e um botão "Ver todos os nomes" expande a lista
 * completa; expandido, o botão vira "Mostrar menos" e recolhe de volta.
 */

import { useEffect, useState } from 'react';
import {
  ChevronDown, ChevronUp, Crown, HeartHandshake, ShieldCheck, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CAKTO_FOUNDER_CHECKOUT_URL, initialsOf,
  type FounderEntry,
} from '@/lib/cakto';
import {
  wallDisplayEntries,
} from '@/lib/founder-showcase';

interface FoundersResponse {
  configured?: boolean;
  unavailable?: boolean;
  founders?: FounderEntry[];
}

/** Quantidade de nomes visíveis no mural recolhido (antes de expandir) */
const PREVIEW_COUNT = 8;

export function FounderWall() {
  const [loading, setLoading] = useState(true);
  const [real, setReal] = useState<FounderEntry[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/founders')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: FoundersResponse) => {
        if (!alive) return;
        setReal(Array.isArray(d.founders) ? d.founders : []);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setReal([]);
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const entries = loading ? [] : wallDisplayEntries(real, Date.now());
  const ouro = entries.find((e) => e.tier === 'ouro');
  const rest = entries.filter((e) => e.tier !== 'ouro');
  const total = entries.length;

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
            tem o nome gravado aqui, na página inicial, enquanto a assinatura
            estiver ativa. É o apoio que mantém o Diário da Riqueza 100%
            gratuito e offline para todos.
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

        <div className="mt-10 space-y-6" aria-live="polite">
          {loading ? (
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
          ) : (
            <>
              {/* Fundador Ouro — em evidência */}
              {ouro ? (
                <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border-2 border-gold/60 bg-gradient-to-br from-gold/15 via-card to-card p-6 shadow-[0_0_60px_-15px_rgba(212,175,55,0.35)] sm:p-8">
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-2xl"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-6 sm:text-left">
                    <span
                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-gold/15 font-display text-2xl font-black text-gold"
                      aria-hidden="true"
                    >
                      {initialsOf(ouro.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold">
                        <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                        Fundador Ouro · nº 1 do mural
                      </span>
                      <p className="mt-2 font-display text-2xl font-black sm:text-3xl">
                        {ouro.name}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        fundador desde {ouro.since} · mês {ouro.period} de recorrência ·
                        o nome que abre este mural e sustenta o projeto todos os meses
                      </p>
                    </div>
                    <Crown
                      className="h-10 w-10 shrink-0 text-gold/70"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              ) : null}

              {/* Grade: comunidade + fundadores reais */}
              <div>
                <p className="mb-4 text-center text-sm text-muted-foreground">
                  {total === 1
                    ? '1 fundador sustentando o projeto'
                    : `${total} fundadores sustentando o projeto`}
                </p>
                <ul
                  id="mural-grade-fundadores"
                  className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
                >
                  {(expanded ? rest : rest.slice(0, PREVIEW_COUNT)).map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-gold/40"
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

                {/* Recolhido por padrão — botão expande/recolhe a lista completa */}
                {rest.length > PREVIEW_COUNT ? (
                  <div className="mt-5 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setExpanded((v) => !v)}
                      aria-expanded={expanded}
                      aria-controls="mural-grade-fundadores"
                      className="h-11 border-gold/40 bg-gold/5 px-6 text-sm font-semibold text-gold hover:bg-gold/15 hover:text-gold"
                    >
                      {expanded ? (
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      )}
                      {expanded
                        ? 'Mostrar menos'
                        : `Ver todos os ${rest.length} nomes`}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="text-center">
                <Button
                  asChild
                  className="h-11 bg-gold text-base font-semibold text-black hover:bg-gold-light"
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
                <p className="mt-3 text-xs text-muted-foreground">
                  Seu nome entra nesta lista em quanto o primeiro pagamento aprovar.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
