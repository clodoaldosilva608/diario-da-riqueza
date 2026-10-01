/**
 * Helpers de UI do painel /admin (server components puros, sem estado).
 * Badges de status, cards de métrica, tabelas e barra de paginação —
 * visual consistente com a identidade preto+dourado do app.
 */

import Link from 'next/link';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { CaktoApiError } from '@/lib/cakto-server';

/* ============================== STATUS BADGE ============================== */

const STATUS_STYLES: Record<string, string> = {
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
  paid: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
  renewed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
  late: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
  trial: 'border-sky-500/40 bg-sky-500/10 text-sky-500',
  pix_gerado: 'border-sky-500/40 bg-sky-500/10 text-sky-500',
  waiting_payment: 'border-sky-500/40 bg-sky-500/10 text-sky-500',
  refused: 'border-red-500/40 bg-red-500/10 text-red-500',
  canceled: 'border-red-500/40 bg-red-500/10 text-red-500',
  cancelled: 'border-red-500/40 bg-red-500/10 text-red-500',
  expired: 'border-red-500/40 bg-red-500/10 text-red-500',
  chargeback: 'border-red-500/40 bg-red-500/10 text-red-500',
  refund: 'border-orange-500/40 bg-orange-500/10 text-orange-500',
  refunded: 'border-orange-500/40 bg-orange-500/10 text-orange-500',
  paused: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-400',
  inactive: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-400',
  disabled: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-400',
  deleted: 'border-red-500/40 bg-red-500/10 text-red-500',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'aprovada',
  paid: 'paga',
  active: 'ativa',
  renewed: 'renovada',
  pending: 'pendente',
  late: 'atrasada',
  trial: 'teste',
  waiting_payment: 'aguardando',
  refused: 'recusada',
  canceled: 'cancelada',
  cancelled: 'cancelada',
  expired: 'expirada',
  chargeback: 'chargeback',
  refund: 'reembolso',
  refunded: 'reembolsada',
  paused: 'pausada',
  inactive: 'inativa',
  disabled: 'desativado',
  deleted: 'excluído',
};

export function StatusBadge({ status }: { status: string | undefined }) {
  const s = status ?? '—';
  const cls = STATUS_STYLES[s] ?? 'border-border bg-muted/40 text-muted-foreground';
  const label = STATUS_LABELS[s] ?? s;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

/* ============================== MÉTRICA ============================== */

export function MetricCard({
  label, value, hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-black">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/* ============================== TABELA ============================== */

export function AdminTable({
  headers, children, empty,
}: {
  headers: string[];
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            {headers.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {empty ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                Nada aqui ainda — os dados aparecem conforme as vendas acontecem.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({
  children, className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

/* ============================== PAGINAÇÃO ============================== */

export function Pager({
  base, page, hasMore,
}: {
  base: string;
  page: number;
  hasMore: boolean;
}) {
  const sep = base.includes('?') ? '&' : '?';
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link
          href={`${base}${sep}page=${page - 1}`}
          className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-muted"
        >
          ← Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground">página {page}</span>
      {hasMore ? (
        <Link
          href={`${base}${sep}page=${page + 1}`}
          className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-muted"
        >
          Próxima →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

/* ============================== ERRO / FORM ============================== */

export function CaktoError({ error }: { error: unknown }) {
  const isCfg = !(error instanceof CaktoApiError) && error instanceof Error
    && /não configurados/.test(error.message);
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm">
      <p className="flex items-center gap-2 font-semibold text-amber-500">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        Não foi possível consultar a Cakto
      </p>
      <p className="mt-2 leading-relaxed text-muted-foreground">
        {isCfg
          ? 'As variáveis CAKTO_CLIENT_ID/CAKTO_CLIENT_SECRET não estão configuradas neste ambiente. Adicione-as no servidor (Vercel → Settings → Environment Variables) e faça um redeploy.'
          : 'A API da Cakto respondeu com erro. Tente recarregar; se persistir, confira o status da plataforma.'}
      </p>
    </div>
  );
}

export function BRL(v: string | number | undefined): string {
  const n = typeof v === 'string' ? Number(v) : (v ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';
}

export function DateTime(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function SearchForm({
  action, placeholder, defaultValue, hidden,
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form action={action} className="flex flex-wrap gap-2">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20"
      />
      <button
        type="submit"
        className="flex h-10 items-center gap-1.5 rounded-xl bg-gold px-4 text-sm font-semibold text-black hover:bg-gold-light"
      >
        <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Buscar
      </button>
    </form>
  );
}
