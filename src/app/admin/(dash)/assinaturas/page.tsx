/**
 * /admin/assinaturas — assinaturas recorrentes com filtro de status e
 * ação de cancelamento (com confirmação explícita no cliente).
 *
 * Observação de design: o cancelamento é uma ação IRREVERSÍVEL na Cakto;
 * o botão usa confirm() nativo antes de submeter o form para a server action.
 */

import { listSubscriptions } from '@/lib/cakto-server';
import { BRL, CaktoError, DateTime, Pager, StatusBadge, Td } from '../ui';
import { cancelSubscriptionAction } from '../../actions';

export const dynamic = 'force-dynamic';

const STATUSES = [
  { value: '', label: 'Todas' },
  { value: 'active', label: 'Ativas' },
  { value: 'late', label: 'Atrasadas' },
  { value: 'paused', label: 'Pausadas' },
  { value: 'canceled', label: 'Canceladas' },
  { value: 'expired', label: 'Expiradas' },
] as const;

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; ok?: string; erro?: string }>;
}) {
  const { page: pageStr, status = '', ok, erro } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? '1') || 1);

  let data: Awaited<ReturnType<typeof listSubscriptions>> | null = null;
  let error: unknown = null;
  try {
    const res = await listSubscriptions(page, 20);
    const filtered = status
      ? res.data.filter((s) => s.status === status)
      : res.data;
    data = { ...res, data: filtered, hasMore: res.hasMore && !status };
  } catch (e) {
    error = e;
  }

  // Preços por oferta (para exibir valor mensal) — melhor esforço
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Assinaturas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recorrências ativas e históricas — inclui os Apoiadores Fundadores.
        </p>
      </div>

      {ok ? (
        <p className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-500">
          Assinatura cancelada com sucesso.
        </p>
      ) : null}
      {erro ? (
        <p className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">
          Falha ao cancelar: {erro}
        </p>
      ) : null}

      <nav aria-label="Filtrar por status" className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <a
            key={s.value}
            href={`/admin/assinaturas${s.value ? `?status=${s.value}` : ''}`}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              status === s.value
                ? 'border-gold/60 bg-gold/10 text-gold'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {s.label}
          </a>
        ))}
      </nav>

      {error ? (
        <CaktoError error={error} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  {['Assinatura', 'Situação', 'Recorrência', 'Método', 'Criada em', 'Atualizada', 'Ação'].map((h) => (
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
                {!data || data.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhuma assinatura{status ? ` com status "${status}"` : ''} ainda.
                    </td>
                  </tr>
                ) : (
                  data.data.map((s, i) => (
                    <tr key={s.id ?? i} className="hover:bg-muted/30">
                      <Td className="font-mono text-xs">{String(s.id ?? '—')}</Td>
                      <Td>
                        <StatusBadge status={s.status} />
                        {s.current_situation === 'renewed' ? (
                          <span className="ml-1.5 inline-flex rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            renovada
                          </span>
                        ) : null}
                      </Td>
                      <Td className="text-xs">
                        {typeof s.current_period === 'number' ? `mês ${s.current_period}` : '—'}
                      </Td>
                      <Td className="text-xs text-muted-foreground">
                        {String((s as { payment_method?: string }).payment_method ?? '—')}
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-muted-foreground">
                        {DateTime(s.createdAt ?? s.created_at)}
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-muted-foreground">
                        {DateTime(s.updatedAt ?? s.updated_at)}
                      </Td>
                      <Td>
                        {s.status === 'active' || s.status === 'late' ? (
                          <form
                            action={cancelSubscriptionAction}
                            onSubmit={(e) => {
                              if (!confirm('Cancelar esta assinatura? Isso remove o fundador do mural após o ciclo atual. Ação irreversível.')) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="id" value={String(s.id)} />
                            <button
                              type="submit"
                              className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                            >
                              Cancelar
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data && data.data.length > 0 && !status ? (
            <Pager base="/admin/assinaturas" page={page} hasMore={data.hasMore} />
          ) : null}
        </>
      )}
    </div>
  );
}
