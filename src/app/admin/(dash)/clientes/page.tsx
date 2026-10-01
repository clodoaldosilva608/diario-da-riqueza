/**
 * /admin/clientes — pessoas que apoiaram o Diário da Riqueza via Cakto.
 *
 * ESCOPO: somente clientes com pelo menos um pedido de produto deste
 * projeto (clientes de outros apps da mesma conta ficam de fora — ver
 * listDrCustomers). Busca e paginação em memória sobre o conjunto filtrado.
 */

import { listDrCustomers } from '@/lib/cakto-server';
import { CaktoError, DateTime, Pager, SearchForm, Td } from '../ui';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageStr, q } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? '1') || 1);
  const search = (q ?? '').trim();

  let data: Awaited<ReturnType<typeof listDrCustomers>> | null = null;
  let error: unknown = null;
  try {
    data = await listDrCustomers(search);
  } catch (e) {
    error = e;
  }

  const total = data?.data.length ?? 0;
  const start = (page - 1) * PAGE_SIZE;
  const rows = data?.data.slice(start, start + PAGE_SIZE) ?? [];
  const hasMore = start + PAGE_SIZE < total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pessoas que apoiaram o Diário da Riqueza via checkout da Cakto.
        </p>
      </div>

      <SearchForm
        action="/admin/clientes"
        placeholder="Buscar por nome ou e-mail…"
        defaultValue={search}
      />

      {error ? (
        <CaktoError error={error} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  {['Nome', 'E-mail', 'Telefone', 'Cliente desde'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!rows || rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum cliente ainda — os apoios criam o cadastro automaticamente.
                    </td>
                  </tr>
                ) : (
                  rows.map((c, i) => (
                    <tr key={c.id ?? i} className="hover:bg-muted/30">
                      <Td className="font-semibold">{c.name ?? '—'}</Td>
                      <Td className="text-muted-foreground">{c.email ?? '—'}</Td>
                      <Td className="text-muted-foreground">
                        {String((c as { phone?: string }).phone ?? '—')}
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-muted-foreground">
                        {DateTime(
                          (c as { createdAt?: string }).createdAt
                            ?? (c as { created_at?: string }).created_at,
                        )}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {rows.length > 0 ? (
            <Pager
              base={`/admin/clientes${search ? `?q=${encodeURIComponent(search)}` : ''}`}
              page={page}
              hasMore={hasMore}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
