/**
 * /admin/noticias — PORTAL DE NOTÍCIAS (área do criador).
 *
 * O que é: central de comunicação com os usuários. Aqui o operador cria
 * avisos (texto + link + imagem + anexo) e escolhe quais estão publicados;
 * os publicados aparecem como banner no topo da dashboard de TODOS os
 * usuários (componente AnnouncementBanner, via /api/announcements).
 *
 * Página server: lê a lista direto da store, renderiza métricas + form de
 * criação (client) + lista de cards (client, com toggle/editar/excluir).
 * Está no grupo (dash) → a sessão já é exigida pelo layout; as actions
 * revalidam por conta própria.
 */

import { Eye, Info, Megaphone, Newspaper, Pencil, ToggleLeft } from 'lucide-react';
import { listAnnouncements, persistenceMode } from '@/lib/announcements-store';
import { MetricCard, PageHeader } from '../ui';
import { AnnouncementCard } from './announcement-card';
import { AnnouncementForm } from './announcement-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Portal de Notícias — Painel DR',
  robots: { index: false, follow: false },
};

export default async function AdminNoticiasPage() {
  const list = await listAnnouncements();
  const activeCount = list.filter((a) => a.active).length;
  const drafts = list.length - activeCount;
  const persist = persistenceMode();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portal de Notícias"
        description="Comunique-se com todos os usuários: escreva um aviso, anexe imagem/link/arquivo e publique — no mesmo instante ele aparece como banner no topo da dashboard de todo mundo. Desative quando quiser tirá-lo do ar; edite para re-notificar quem já fechou."
        action={<Megaphone className="hidden h-10 w-10 text-gold/60 sm:block" aria-hidden="true" />}
      />

      {/* ============ MÉTRICAS ============ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Avisos" value={String(list.length)} hint="publicados + rascunhos" />
        <MetricCard label="Na dashboard agora" value={String(activeCount)} hint="visíveis para todos" />
        <MetricCard label="Rascunhos" value={String(drafts)} hint="aguardando publicação" />
        <MetricCard
          label="Armazenamento"
          value={persist === 'arquivo' ? 'Disco' : 'Temporário'}
          hint={persist === 'arquivo' ? 'avisos salvos no servidor' : 'serverless sem disco gravável'}
        />
      </div>

      {/* ============ AVISO DE PERSISTÊNCIA ============ */}
      {persist === 'memoria' ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-amber-500">
            <Info className="h-4 w-4" aria-hidden="true" />
            Modo temporário (serverless)
          </p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            Neste ambiente o disco é somente leitura, então os avisos vivem
            apenas na memória da instância atual — podem sumir após um redeploy
            ou inatividade. Para persistência definitiva, conecte um armazenamento
            externo (KV/Blob) ou publique a partir do servidor com disco.
          </p>
        </div>
      ) : null}

      {/* ============ NOVO AVISO ============ */}
      <section aria-labelledby="novo-aviso" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 id="novo-aviso" className="flex items-center gap-2 font-display text-lg font-bold">
          <Newspaper className="h-5 w-5 text-gold" aria-hidden="true" />
          Novo aviso
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Título e texto são obrigatórios; link, imagem e arquivo são opcionais.
        </p>
        <div className="mt-5">
          <AnnouncementForm mode="create" />
        </div>
      </section>

      {/* ============ LISTA ============ */}
      <section aria-labelledby="avisos" className="space-y-4">
        <h2 id="avisos" className="flex items-center gap-2 font-display text-lg font-bold">
          Avisos ({list.length})
        </h2>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            <p className="mt-3 font-medium">Nenhum aviso ainda</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              Crie o primeiro aviso acima — ele pode ser publicado na hora
              (aparece na dashboard de todos) ou salvo como rascunho.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {list.map((ann) => (
              <AnnouncementCard key={ann.id} ann={ann} />
            ))}
          </div>
        )}
      </section>

      {/* ============ COMO FUNCIONA ============ */}
      <section
        aria-labelledby="como-funciona"
        className="rounded-2xl border border-gold/30 bg-gold/5 p-5"
      >
        <h2 id="como-funciona" className="font-display text-lg font-bold">
          Como funciona a publicação
        </h2>
        <ul className="mt-3 grid gap-3 text-sm leading-relaxed text-muted-foreground sm:grid-cols-3">
          <li className="rounded-xl border border-border bg-card p-3">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <ToggleLeft className="h-4 w-4" aria-hidden="true" /> Ativar / desativar
            </span>
            Ative para o banner ir à dashboard de todos; desative para tirar do
            ar sem apagar nada.
          </li>
          <li className="rounded-xl border border-border bg-card p-3">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <Pencil className="h-4 w-4" aria-hidden="true" /> Editar re-notifica
            </span>
            Ao salvar uma edição ou reativar, quem já fechou o banner vê o
            aviso de novo — é o jeito de garantir que todos fiquem sabendo.
          </li>
          <li className="rounded-xl border border-border bg-card p-3">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <Eye className="h-4 w-4" aria-hidden="true" /> Fechar não apaga
            </span>
            O usuário pode fechar o banner; ele some só para essa pessoa e
            volta se o aviso mudar.
          </li>
        </ul>
      </section>
    </div>
  );
}
