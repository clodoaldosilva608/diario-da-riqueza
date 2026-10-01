/**
 * /admin/vendas — pedidos da conta Cakto com busca e paginação.
 */

import { listOrders } from '@/lib/cakto-server';
import {
  AdminTable, BRL, CaktoError, DateTime, Pager, SearchForm, StatusBadge, Td,
} from '../ui';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageStr, q } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? '1') || 1);
  const search = (q ?? '').trim();

  let data: Awaited<ReturnType<typeof listOrders>> | null = null;
  let error: unknown = null;
  try {
    data = await listOrders(page, 20, search);
  } catch (e) {
    error = e;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Vendas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos os pedidos processados pela Cakto — apoios únicos e renovações.
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
            empty={!data || data.data.length === 0}
          >
            {data?.data.map((o, i) => {
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
          {data && data.data.length > 0 ? (
            <Pager
              base={`/admin/vendas${search ? `?q=${encodeURIComponent(search)}` : ''}`}
              page={page}
              hasMore={data.hasMore}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
