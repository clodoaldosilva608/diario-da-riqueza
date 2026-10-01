/**
 * /admin/vendas — pedidos do Diário da Riqueza com busca e paginação.
 *
 * ESCOPO: somente pedidos de produtos deste projeto (outros apps da mesma
 * conta Cakto ficam de fora — ver listDrOrders). Busca e paginação são
 * aplicadas em memória sobre a janela filtrada (até 500 pedidos).
 */

import { listDrOrders } from '@/lib/cakto-server';
import {
  AdminTable, BRL, CaktoError, DateTime, Pager, SearchForm, StatusBadge, Td,
} from '../ui';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageStr, q } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? '1') || 1);
  const search = (q ?? '').trim();

  let all: Awaited<ReturnType<typeof listDrOrders>>['data'] = [];
  let error: unknown = null;
  try {
    const res = await listDrOrders();
    all = res.data;
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

  const total = all.length;
  const start = (page - 1) * PAGE_SIZE;
  const rows = all.slice(start, start + PAGE_SIZE);
  const hasMore = start + PAGE_SIZE < total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Vendas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pedidos dos produtos do Diário da Riqueza — apoios únicos e
          renovações. Pedidos de outros apps da conta não aparecem aqui.
        </p>
      </div>

      <SearchForm
        action="/admin/vendas"
        placeholder="Buscar por cliente, e-mail ou ID do pedido…"
        defaultValue={search}
      />

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
              base={`/admin/vendas${search ? `?q=${encodeURIComponent(search)}` : ''}`}
              page={page}
              hasMore={hasMore}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
