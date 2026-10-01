/**
 * /admin/clientes — compradores da conta Cakto, com busca.
 */

import { listCustomers } from '@/lib/cakto-server';
import { CaktoError, DateTime, Pager, SearchForm, Td } from '../ui';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageStr, q } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? '1') || 1);
  const search = (q ?? '').trim();

  let data: Awaited<ReturnType<typeof listCustomers>> | null = null;
  let error: unknown = null;
  try {
    data = await listCustomers(page, 20, search);
  } catch (e) {
    error = e;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pessoas que apoiaram o projeto via checkout da Cakto.
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
                {!data || data.data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum cliente ainda — os apoios criam o cadastro automaticamente.
                    </td>
                  </tr>
                ) : (
                  data.data.map((c, i) => (
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
          {data && data.data.length > 0 ? (
            <Pager
              base={`/admin/clientes${search ? `?q=${encodeURIComponent(search)}` : ''}`}
              page={page}
              hasMore={data.hasMore}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
