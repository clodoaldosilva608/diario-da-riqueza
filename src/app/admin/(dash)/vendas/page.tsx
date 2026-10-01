/**
 * /admin/vendas — pedidos do Diário da Riqueza com busca, filtro por
 * status e paginação.
 *
 * ESCOPO: somente pedidos de produtos deste projeto (outros apps da mesma
 * conta Cakto ficam de fora — ver listDrOrders). Busca, filtro e paginação
 * são aplicados em memória sobre a janela filtrada (até 500 pedidos).
 */

import { listDrOrders } from '@/lib/cakto-server';
import {
  AdminTable, BRL, CaktoError, DateTime, PageHeader, Pager, SearchForm,
  StatusBadge, Td,
} from '../ui';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

/** Status que o operador pode filtrar (ordem de exibição) */
const STATUS_FILTERS = [
  'approved', 'pending', 'waiting_payment', 'refused',
  'refunded', 'canceled', 'chargeback',
] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const { page: pageStr, q, status: statusParam } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? '1') || 1);
  const search = (q ?? '').trim();
  const statusFilter = STATUS_FILTERS.includes(
    (statusParam ?? '') as (typeof STATUS_FILTERS)[number],
  )
    ? statusParam!
    : '';

  let all: Awaited<ReturnType<typeof listDrOrders>>['data'] = [];
  let window: Awaited<ReturnType<typeof listDrOrders>>['data'] = [];
  let error: unknown = null;
  try {
    const res = await listDrOrders();
    window = res.data;
    all = res.data;
    if (statusFilter) {
      all = all.filter((o) => o.status === statusFilter);
    }
    if (search) {
      const needle = search.toLowerCase();
      all = all.filter((o) => {
        const name =
          typeof o.customer === 'object' ? o.customer?.name : o.customer;
        const email =
          typeof o.customer === 'object' ? o.customer?.email : '';
        const pname =
          typeof o.product === 'object' ? o.product?.name : o.product;
        return [o.refId, o.id, name, email, pname]
          .some((v) => typeof v === 'string' && v.toLowerCase().includes(needle));
      });
    }
  } catch (e) {
    error = e;
  }

  // Contagens por status sobre a janela completa (fora do filtro atual)
  const counts = new Map<string, number>();
  for (const o of window) {
    if (o.status) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
  }

  const total = all.length;
  const start = (page - 1) * PAGE_SIZE;
  const rows = all.slice(start, start + PAGE_SIZE);
  const hasMore = start + PAGE_SIZE < total;

  const qs = (over: Record<string, string>) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    const status = over.status ?? statusFilter;
    if (status) params.set('status', status);
    const s = params.toString();
    return `/admin/vendas${s ? `?${s}` : ''}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendas"
        description="Pedidos dos produtos do Diário da Riqueza — apoios únicos e renovações. Pedidos de outros apps da conta não aparecem aqui."
      />

      <SearchForm
        action="/admin/vendas"
        placeholder="Buscar por cliente, e-mail ou ID do pedido…"
        defaultValue={search}
        hidden={statusFilter ? { status: statusFilter } : undefined}
      />

      {/* Filtro por status */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
        <a
          href={qs({ status: '' })}
          aria-current={!statusFilter ? 'true' : undefined}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            !statusFilter
              ? 'border-gold/50 bg-gold/10 text-gold'
              : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Todos
        </a>
        {STATUS_FILTERS.map((s) => {
          const active = statusFilter === s;
          const n = counts.get(s) ?? 0;
          return (
            <a
              key={s}
              href={qs({ status: s })}
              aria-current={active ? 'true' : undefined}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'border-gold/50 bg-gold/10 text-gold'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <StatusBadge status={s} />
              {n > 0 ? <span className="tabular-nums opacity-70">{n}</span> : null}
            </a>
          );
        })}
      </div>

      {error ? (
        <CaktoError error={error} />
      ) : (
        <>
          <AdminTable
            headers={['Pedido', 'Cliente', 'Produto', 'Valor', 'Parc.', 'Método', 'Status', 'Data']}
            empty={rows.length === 0}
          >
            {rows.map((o, i) => {
              const name =
                typeof o.customer === 'object' ? o.customer?.name : o.customer;
              const pname =
                typeof o.product === 'object' ? o.product?.name : o.product;
              return (
                <tr key={o.id ?? o.refId ?? i} className="hover:bg-muted/30">
                  <Td className="font-mono text-xs">{String(o.refId ?? o.id ?? '—')}</Td>
                  <Td className="max-w-40 truncate">{name ?? '—'}</Td>
                  <Td className="max-w-52 truncate">{pname ?? '—'}</Td>
                  <Td className="whitespace-nowrap font-semibold">{BRL(o.amount ?? o.baseAmount)}</Td>
                  <Td>{o.installments ?? 1}×</Td>
                  <Td className="text-xs text-muted-foreground">{o.paymentMethod ?? '—'}</Td>
                  <Td><StatusBadge status={o.status} /></Td>
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">
                    {DateTime(o.createdAt)}
                  </Td>
                </tr>
              );
            })}
          </AdminTable>
          {rows.length > 0 ? (
            <Pager
              base={qs({})}
              page={page}
              hasMore={hasMore}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
