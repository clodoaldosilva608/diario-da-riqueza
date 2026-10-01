/**
 * /admin/produtos — catálogo do Diário da Riqueza na Cakto (leitura + link).
 *
 * ESCOPO: somente produtos deste projeto (os demais produtos da conta —
 * outros apps do criador — ficam de fora; ver listDrProducts).
 *
 * Edição de produtos no v1 é propositalmente SOMENTE LEITURA: preço/nome
 * afetam vendas em produção e o painel do criador da Cakto continua sendo
 * a fonte segura para alterações estruturais. Aqui o operador confere
 * status, preços e links públicos de checkout.
 */

import { listDrProducts } from '@/lib/cakto-server';
import { BRL, CaktoError, StatusBadge, Td } from '../ui';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  let data: Awaited<ReturnType<typeof listDrProducts>> | null = null;
  let error: unknown = null;
  try {
    data = await listDrProducts();
  } catch (e) {
    error = e;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Produtos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catálogo do Diário da Riqueza na Cakto — os outros produtos da
          conta (Destrava, ResíduoZero, PsicoRisk e afins) não aparecem
          aqui. Alterações estruturais continuam no painel da Cakto — aqui é
          leitura e conferência.
        </p>
      </div>

      {error ? (
        <CaktoError error={error} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {['Produto', 'Tipo', 'Preço', 'Status', 'Métodos', 'Página de vendas'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!data || data.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhum produto do projeto na conta.
                  </td>
                </tr>
              ) : (
                data.data.map((p, i) => (
                  <tr key={p.id ?? i} className="hover:bg-muted/30">
                    <Td>
                      <p className="font-semibold">{p.name}</p>
                      <p className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">
                        {p.description ?? ''}
                      </p>
                    </Td>
                    <Td className="text-xs">
                      {p.type === 'subscription' ? 'assinatura' : 'único'}
                    </Td>
                    <Td className="whitespace-nowrap font-semibold">{BRL(p.price)}</Td>
                    <Td><StatusBadge status={p.status} /></Td>
                    <Td className="text-xs text-muted-foreground">
                      {(p.paymentMethods ?? []).join(', ') || '—'}
                    </Td>
                    <Td className="max-w-48 truncate text-xs">
                      {p.salesPage ? (
                        <a
                          href={p.salesPage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold underline-offset-2 hover:underline"
                        >
                          {p.salesPage}
                        </a>
                      ) : '—'}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
