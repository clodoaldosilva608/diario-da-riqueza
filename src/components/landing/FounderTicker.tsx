'use client';

/**
 * FounderTicker — faixa "redline" de atenção na landing page.
 *
 * Faixa full-width com linhas vermelhas (topo/baixo) e ponto AO VIVO,
 * exibindo os nomes dos fundadores em rolagem contínua (marquee CSS,
 * sem JS de animação). Pausa no hover e respeita prefers-reduced-motion.
 *
 * Objetivo: chamar a atenção logo após o hero, dar credibilidade ao
 * projeto e influenciar novos apoiadores (prova social permanente).
 *
 * Dados: Fundador Ouro (operador, em evidência) + 75 nomes da camada
 * comunidade — ver src/lib/founder-showcase.ts. Sem fetch: renderiza
 * estático no SSR, custo zero de rede.
 */

import { ArrowRight, Crown, Star } from 'lucide-react';
import {
  FOUNDER_OURO_NAME, FOUNDER_SHOWCASE_NAMES,
} from '@/lib/founder-showcase';

export function FounderTicker() {
  const names = [FOUNDER_OURO_NAME, ...FOUNDER_SHOWCASE_NAMES];
  const total = names.length;

  return (
    <section
      aria-label="Fundadores que sustentam o projeto — lista em destaque"
      className="founder-ticker relative border-y-2 border-red-600/70 bg-gradient-to-r from-red-950/50 via-background to-red-950/50"
    >
      <h2 className="sr-only">Fundadores apoiando o Diário da Riqueza</h2>

      <div className="flex items-stretch">
        {/* Rótulo AO VIVO */}
        <div className="z-10 flex shrink-0 items-center gap-2.5 border-r border-red-600/40 bg-background/95 px-3 py-3 sm:px-4">
          <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <div className="leading-tight">
            <p className="whitespace-nowrap text-[11px] font-bold uppercase tracking-widest text-red-400">
              Fundadores
            </p>
            <p className="whitespace-nowrap text-[11px] font-semibold text-gold">
              {total} apoiando
            </p>
          </div>
        </div>

        {/* Trilho do marquee (conteúdo duplicado para loop sem emenda) */}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="founder-ticker-track flex w-max items-center py-3">
            {[0, 1].map((dup) => (
              <ul
                key={dup}
                aria-hidden={dup === 1}
                className="flex items-center"
              >
                {names.map((name, i) => (
                  <li
                    key={`${dup}-${i}`}
                    className="flex items-center gap-2 whitespace-nowrap px-4 text-sm"
                  >
                    {i === 0 ? (
                      <Crown className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                    ) : (
                      <Star className="h-3 w-3 shrink-0 text-gold/40" aria-hidden="true" />
                    )}
                    <span
                      className={
                        i === 0
                          ? 'font-display text-base font-black text-gold'
                          : 'font-medium text-foreground/85'
                      }
                    >
                      {name}
                    </span>
                    {i === 0 ? (
                      <span className="rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                        Fundador Ouro
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ))}
          </div>
          {/* Bordas de esmaecimento */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent"
            aria-hidden="true"
          />
        </div>

        {/* CTA */}
        <a
          href="#fundadores"
          className="z-10 hidden shrink-0 items-center gap-1.5 border-l border-red-600/40 bg-background/95 px-4 text-xs font-bold uppercase tracking-wider text-gold transition-colors hover:bg-gold/10 md:flex"
          aria-label="Ver o Mural dos Fundadores e virar apoiador"
        >
          Seja fundador
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
