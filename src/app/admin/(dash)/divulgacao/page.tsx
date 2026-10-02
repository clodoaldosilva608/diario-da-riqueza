/**
 * /admin/divulgacao — kit completo de divulgação nas redes sociais.
 *
 * Exibe as 20 artes (1080×1080) servidas de /public/marketing/ junto das
 * legendas prontas (título + 4 hashtags). Por card: copiar legenda, baixar
 * PNG e abrir em tamanho real. Ações do topo: baixar o kit completo (.zip)
 * ou todas as legendas em .md gerado a partir dos dados. Estáticos são
 * públicos por natureza (material para publicação); a SEÇÃO fica atrás do
 * requireAdmin do layout do grupo (dash).
 */

import { MARKETING_POSTS, MARKETING_SIZE } from '@/lib/marketing-posts';
import { MetricCard, PageHeader } from '../ui';
import { DivulgacaoToolbar, PostCard } from './post-card';

const USAGE_TIPS: [string, string][] = [
  ['Ordem sugerida', '1 postagem por dia, seguindo a numeração 01 → 20 — são 20 dias de conteúdo.'],
  ['Link', 'Instagram não permite link clicável na legenda: coloque diariodariqueza.vercel.app na bio e use “link na bio” nos CTAs (posts 16–20). No Facebook, X e LinkedIn, inclua o link direto.'],
  ['Hashtags', 'Use as 4 hashtags de cada post sem cortar — #DiárioDaRiqueza (com acento) é a assinatura da marca.'],
  ['Formato', 'Todas as artes são quadradas 1080×1080: funcionam no feed do Instagram, Facebook, LinkedIn, X e WhatsApp Status.'],
];

export default function AdminDivulgacaoPage() {
  const groups = [...new Set(MARKETING_POSTS.map((p) => p.group))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Divulgação"
        description="Kit completo para divulgar o Diário da Riqueza nas redes sociais: 20 artes + 20 legendas prontas (título + 4 hashtags). Copie a legenda, baixe a imagem e publique — ou baixe o kit inteiro de uma vez."
        action={<DivulgacaoToolbar />}
      />

      {/* ============ MÉTRICAS DO KIT ============ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Posts prontos" value={String(MARKETING_POSTS.length)} hint="artes + legendas" />
        <MetricCard label="Formato" value={MARKETING_SIZE} hint="quadrado (feed e status)" />
        <MetricCard label="Categorias" value={String(groups.length)} hint={groups.join(' · ')} />
        <MetricCard label="Kit .zip" value="≈ 3,9 MB" hint="imagens + legendas.md" />
      </div>

      {/* ============ COMO USAR ============ */}
      <section
        aria-labelledby="como-usar"
        className="rounded-2xl border border-gold/30 bg-gold/5 p-5"
      >
        <h2 id="como-usar" className="font-display text-lg font-bold">
          Como usar
        </h2>
        <ul className="mt-3 grid gap-3 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
          {USAGE_TIPS.map(([label, tip]) => (
            <li key={label} className="rounded-xl border border-border bg-card p-3">
              <span className="font-semibold text-foreground">{label}: </span>
              {tip}
            </li>
          ))}
        </ul>
      </section>

      {/* ============ GRID DE POSTS ============ */}
      <section aria-labelledby="posts" className="space-y-4">
        <h2 id="posts" className="font-display text-lg font-bold">
          Postagens ({MARKETING_POSTS.length})
        </h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {MARKETING_POSTS.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}
