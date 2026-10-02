'use client';

/**
 * Componentes client da seção Divulgação:
 * - PostCard: preview da arte + legenda com botões copiar/baixar/abrir.
 * - DivulgacaoToolbar: ações do topo — baixar ZIP completo e baixar
 *   todas as legendas em .md (gerado no cliente a partir dos dados,
 *   sem endpoint extra).
 * A cópia usa Clipboard API com fallback execCommand (contextos não
 * seguros / navegadores antigos).
 */

import { useState } from 'react';
import { Check, Copy, Download, FileArchive, FileText, ExternalLink } from 'lucide-react';
import {
  MARKETING_POSTS, MARKETING_ZIP_PATH, MarketingPost,
  buildCaptionsMarkdown, postCaption,
} from '@/lib/marketing-posts';

/* --------------------------- copiar (helper) --------------------------- */

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

/* ------------------------------- post card ------------------------------ */

export function PostCard({ post }: { post: MarketingPost }) {
  const [copied, setCopied] = useState(false);
  const png = `/marketing/${post.slug}.png`;
  const downloadName = `diario-da-riqueza-${post.slug}.png`;

  async function handleCopy() {
    await copyText(postCaption(post));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <a href={png} target="_blank" rel="noopener noreferrer" title="Abrir imagem em tamanho real">
        <img
          src={png}
          alt={`Arte de divulgação: ${post.label}`}
          width={1080}
          height={1080}
          loading="lazy"
          className="aspect-square w-full object-cover transition-opacity hover:opacity-90"
        />
      </a>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gold">
            {post.group}
          </span>
          <span className="text-[11px] text-muted-foreground">{post.slug}.png</span>
        </div>

        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">{post.title}</h3>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {post.body}
          </p>
          <p className="mt-2 text-xs font-medium text-gold/90">
            {post.hashtags.join(' ')}
          </p>
        </div>

        <div className="mt-auto flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              copied
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500'
                : 'border-gold/40 bg-gold/10 text-gold hover:bg-gold/20'
            }`}
            aria-live="polite"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Legenda copiada!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copiar legenda
              </>
            )}
          </button>
          <a
            href={png}
            download={downloadName}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            title={`Baixar ${downloadName}`}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            PNG
          </a>
          <a
            href={png}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center rounded-xl border border-border px-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Abrir em nova aba"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Abrir imagem em nova aba</span>
          </a>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------- toolbar -------------------------------- */

function ToolbarButton({
  href, onClick, icon, children,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const cls =
    'flex h-10 items-center gap-2 rounded-xl bg-gold px-4 text-sm font-semibold text-black transition-colors hover:bg-gold-light';
  if (href) {
    return (
      <a href={href} download className={cls}>
        {icon}
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {icon}
      {children}
    </button>
  );
}

export function DivulgacaoToolbar() {
  const [busy, setBusy] = useState(false);

  function downloadMarkdown() {
    setBusy(true);
    try {
      const blob = new Blob([buildCaptionsMarkdown()], {
        type: 'text/markdown;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'legendas-diario-da-riqueza.md';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ToolbarButton
        href={MARKETING_ZIP_PATH}
        icon={<FileArchive className="h-4 w-4" aria-hidden="true" />}
      >
        Baixar kit completo (.zip)
      </ToolbarButton>
      <ToolbarButton
        onClick={downloadMarkdown}
        icon={<FileText className="h-4 w-4" aria-hidden="true" />}
      >
        {busy ? 'Gerando…' : 'Baixar legendas (.md)'}
      </ToolbarButton>
      <span className="sr-only">
        {MARKETING_POSTS.length} posts disponíveis no kit de divulgação
      </span>
    </div>
  );
}
