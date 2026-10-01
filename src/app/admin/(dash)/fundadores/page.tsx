/**
 * /admin/fundadores — gestão do Mural dos Fundadores.
 *
 * Mostra TODAS as assinaturas do produto "Apoiador Fundador" com o efeito
 * da regra anti-inadimplência aplicada (no mural / carência / fora),
 * nome formatado como aparece publicamente e mês de entrada.
 */

import { getFounders, listSubscriptions, CaktoApiError } from '@/lib/cakto-server';
import { CAKTO_PRODUCT_FOUNDER_ID, FOUNDER_GRACE_MS, formatSupporterName } from '@/lib/cakto';
import { CaktoError, DateTime, MetricCard, StatusBadge, Td } from '../ui';

export const dynamic = 'force-dynamic';

export default async function AdminFoundersPage() {
  let error: unknown = null;
  let all: Awaited<ReturnType<typeof listSubscriptions>>['data'] = [];
  let wall: Awaited<ReturnType<typeof getFounders>> = [];
  try {
    // Puxa todas as páginas e filtra o produto de fundador
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 10) {
      const res = await listSubscriptions(page, 50);
      all.push(...res.data.filter((s) => s.product === CAKTO_PRODUCT_FOUNDER_ID));
      hasMore = res.hasMore;
      page += 1;
    }
    wall = await getFounders(Date.now());
  } catch (e) {
    if (e instanceof CaktoApiError) error = e;
    else error = e;
  }

  const inWallIds = new Set(wall.map((f) => f.name));
  const onWall = all.filter((s) => {
    const name = formatSupporterName(
      (typeof s.customer === 'object' ? s.customer?.name : '') ?? '',
    );
    return inWallIds.has(name);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Fundadores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assinaturas do produto &quot;Apoiador Fundador&quot; e o efeito da regra do mural
          (carência de {FOUNDER_GRACE_MS / 86_400_000} dias para atrasos).
        </p>
      </div>

      {error ? (
        <CaktoError error={error} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="No mural agora" value={String(onWall.length)} hint="assinaturas regulares" />
            <MetricCard
              label="Pendentes (carência)"
              value={String(wall.filter((f) => f.pending).length)}
              hint="atrasadas dentro dos 7 dias"
            />
            <MetricCard label="Total de fundadores" value={String(all.length)} hint="desde o início" />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  {['Nome no mural', 'Recorrência', 'Status', 'Situação no mural', 'Criada em', 'Último evento'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {all.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum fundador ainda — compartilhe o link do plano para começar o mural.
                    </td>
                  </tr>
                ) : (
                  all.map((s, i) => {
                    const fullName =
                      typeof s.customer === 'object' ? s.customer?.name ?? '' : '';
                    const updatedAtRaw = s.updatedAt ?? s.updated_at ?? undefined;
                    const lateMs = s.status === 'late' && updatedAtRaw
                      ? Date.now() - Date.parse(updatedAtRaw)
                      : 0;
                    const withinGrace = s.status === 'late'
                      && Number.isFinite(lateMs) && lateMs < FOUNDER_GRACE_MS;
                    const situation =
                      s.status === 'active'
                        ? ['no mural', 'text-emerald-500']
                        : withinGrace
                          ? [`carência (${Math.max(0, Math.ceil((FOUNDER_GRACE_MS - lateMs) / 86_400_000))}d restantes)`, 'text-amber-500']
                          : ['fora do mural', 'text-muted-foreground'];
                    return (
                      <tr key={s.id ?? i} className="hover:bg-muted/30">
                        <Td className="font-semibold">{formatSupporterName(fullName)}</Td>
                        <Td className="text-xs">
                          {typeof s.current_period === 'number' ? `mês ${s.current_period}` : '—'}
                        </Td>
                        <Td><StatusBadge status={s.status} /></Td>
                        <Td className={`text-xs font-semibold ${situation[1]}`}>{situation[0]}</Td>
                        <Td className="whitespace-nowrap text-xs text-muted-foreground">
                          {DateTime(s.createdAt ?? s.created_at)}
                        </Td>
                        <Td className="whitespace-nowrap text-xs text-muted-foreground">
                          {DateTime(updatedAtRaw)}
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
