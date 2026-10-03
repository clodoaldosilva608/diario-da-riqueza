'use client';

/**
 * AnnouncementBanner — banner do Portal de Notícias na Dashboard.
 *
 * Busca /api/announcements (somente avisos ATIVOS do criador) e exibe até
 * BANNER_MAX_ITEMS no topo da dashboard, mais recente primeiro. Comportos:
 * - Imagem (se houver) exibida dentro do banner (loading lazy).
 * - Link (se houver) vira botão dourado "Ver mais" (abre em nova aba).
 * - Anexo (se houver) vira botão de download com nome + tamanho.
 * - Fechar (X): some SÓ para este usuário e SÓ para esta versão — guardamos
 *   id → updatedAt no localStorage; se o criador editar/reativar o aviso
 *   (updatedAt muda), ele volta a aparecer (re-notificação).
 * - Silent failure: qualquer erro de rede/render simplesmente não mostra
 *   banner — a dashboard NUNCA pode quebrar por causa do aviso.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Download, ExternalLink, X } from 'lucide-react';
import {
  BANNER_MAX_ITEMS, formatBytes, mediaUrl, readDismissed, writeDismissed,
  type Announcement, type DismissedMap,
} from '@/lib/announcements';

const REFETCH_MS = 10 * 60 * 1000; // re-checa avisos novos a cada 10 min

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  // Lido UMA vez na hidratação (initializer): na SSR dá {} e o primeiro
  // render é null dos dois lados — sem risco de mismatch.
  const [dismissed, setDismissed] = useState<DismissedMap>(() => readDismissed());

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch('/api/announcements', { cache: 'no-store' });
        if (!res.ok) return;
        const data: unknown = await res.json();
        if (!alive) return;
        const list =
          data && typeof data === 'object' && Array.isArray((data as { announcements?: unknown }).announcements)
            ? ((data as { announcements: Announcement[] }).announcements)
            : [];
        setItems(list);
      } catch {
        /* offline/falha: sem banner, sem ruído */
      }
    }

    void load();
    const t = setInterval(load, REFETCH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  /** Fecha o aviso para este usuário (id → updatedAt da versão vista). */
  function dismiss(id: string, updatedAt: string) {
    setDismissed((prev) => {
      const next = { ...prev, [id]: updatedAt };
      writeDismissed(next);
      return next;
    });
  }

  if (!items || items.length === 0) return null;

  const visible = items
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((a) => dismissed[a.id] !== a.updatedAt)
    .slice(0, BANNER_MAX_ITEMS);

  if (visible.length === 0) return null;

  return (
    <motion.section
      aria-label="Avisos do criador"
      className="space-y-3"
      initial="hidden"
      animate="show"
      exit="hidden"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
    >
      <AnimatePresence>
        {visible.map((a) => {
          const linkLabel = a.linkLabel?.trim() || 'Ver mais';
          return (
            <motion.article
              key={a.id}
              layout
              variants={{
                hidden: { opacity: 0, y: -14, scale: 0.985 },
                show: { opacity: 1, y: 0, scale: 1 },
              }}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -10, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 via-card to-card shadow-[0_0_28px_-12px_rgba(212,175,55,0.45)]"
            >
              {/* filete dourado à esquerda */}
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold/70 via-gold/40 to-gold/10" aria-hidden="true" />

              <div className="p-4 pl-5 sm:p-5 sm:pl-6">
                <div className="flex items-start gap-3.5">
                  {/* Ícone */}
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                    <BellRing className="h-5 w-5" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
                      Aviso do criador
                    </p>
                    <h2 className="mt-1 font-display text-lg font-bold leading-snug sm:text-xl">
                      {a.title}
                    </h2>
                    {a.message ? (
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                        {a.message}
                      </p>
                    ) : null}

                    {/* Ações: link + anexo */}
                    {(a.linkUrl || a.file) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {a.linkUrl ? (
                          <a
                            href={a.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gold px-3.5 text-sm font-semibold text-black transition-colors hover:bg-gold-light"
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            {linkLabel}
                          </a>
                        ) : null}
                        {a.file ? (
                          <a
                            href={mediaUrl(a.file.key, a.file.name)}
                            download={a.file.name}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors hover:border-gold/50 hover:text-gold"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="max-w-[220px] truncate">{a.file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({formatBytes(a.file.size)})
                            </span>
                          </a>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Fechar (só para este usuário/versão) */}
                  <button
                    type="button"
                    onClick={() => dismiss(a.id, a.updatedAt)}
                    aria-label={`Fechar aviso: ${a.title}`}
                    title="Fechar aviso"
                    className="-mr-1 -mt-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Imagem do aviso */}
                {a.image ? (
                  <img
                    src={mediaUrl(a.image.key, a.image.name)}
                    alt={`Imagem do aviso: ${a.title}`}
                    loading="lazy"
                    className="mt-3.5 max-h-72 w-full rounded-xl border border-border object-cover sm:max-h-80"
                  />
                ) : null}
              </div>
            </motion.article>
          );
        })}
      </AnimatePresence>
    </motion.section>
  );
}
