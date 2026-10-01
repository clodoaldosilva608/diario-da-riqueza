/**
 * /admin/fundadores — gestão do Mural dos Fundadores.
 *
 * Duas visões:
 * 1. MURAL PÚBLICO (exibição na landing): Fundador Ouro (operador, em
 *    evidência permanente — solicitação do operador) + 75 nomes da
 *    comunidade (prova social) + assinaturas reais via getFounders.
 * 2. ASSINATURAS REAIS: TODAS as assinaturas do produto "Apoiador
 *    Fundador" com o efeito da regra anti-inadimplência (no mural /
 *    carência / fora), nome formatado como aparece publicamente.
 */

import { getFounders, listSubscriptions, CaktoApiError } from '@/lib/cakto-server';
import {
  CAKTO_FOUNDER_CHECKOUT_URL, CAKTO_PRODUCT_FOUNDER_ID, FOUNDER_GRACE_MS,
  formatSupporterName,
} from '@/lib/cakto';
import {
  FOUNDER_SHOWCASE_COUNT, FOUNDER_OURO_NAME, wallDisplayCount,
} from '@/lib/founder-showcase';
import {
  CaktoError, DateTime, MetricCard, PageHeader, StatusBadge, Td,
} from '../ui';

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

  const publicTotal = error ? 0 : wallDisplayCount(wall, Date.now());
  const realOnWall = wall.filter((f) => !f.pending).length;
  const pendingFounders = wall.length - realOnWall;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fundadores"
        description="Gestão do Mural dos Fundadores — a exibição pública da landing e as assinaturas reais do plano Apoiador Fundador (carência de 7 dias para atrasos)."
      />

      {error ? (
        <CaktoError error={error} />
      ) : (
        <>
          {/* ============ MURAL PÚBLICO (exibição na landing) ============ */}
          <section
            aria-labelledby="mural-publico"
            className="rounded-2xl border border-gold/30 bg-gold/5 p-5"
          >
            <h2 id="mural-publico" className="font-display text-lg font-bold">
              Mural público (landing)
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              O que o visitante vê em <code className="text-xs">/#fundadores</code> e no
              ticker vermelho no topo da página: Fundador Ouro em destaque, a comunidade
              de apoiadores e as assinaturas reais regularmente.
            </p>

            {/* Fundador Ouro em evidência */}
            <div className="mt-4 flex flex-col gap-4 rounded-2xl border-2 border-gold/60 bg-card p-5 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-4">
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-gold/15 font-display text-xl font-black text-gold"
                  aria-hidden="true"
                >
                  CS
                </span>
                <div className="min-w-0">
                  <span className="inline-flex items-center rounded-full border border-gold/50 bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gold">
                    Fundador Ouro · nº 1
                  </span>
                  <p className="mt-1 font-display text-xl font-black">{FOUNDER_OURO_NAME}</p>
                  <p className="text-xs text-muted-foreground">
                    operador e criador do projeto — sempre em evidência no mural
                  </p>
                </div>
              </div>
              <a
                href={CAKTO_FOUNDER_CHECKOUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-xl border border-gold/40 px-4 py-2 text-center text-xs font-semibold text-gold transition-colors hover:bg-gold/10"
              >
                Link do plano fundador ↗
              </a>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <MetricCard
                label="Nomes exibidos"
                value={String(publicTotal)}
                hint="total no mural público"
              />
              <MetricCard
                label="Comunidade (exibição)"
                value={String(FOUNDER_SHOWCASE_COUNT)}
                hint="nomes de prova social fixos"
              />
              <MetricCard
                label="Assinaturas reais no mural"
                value={String(realOnWall)}
                hint={
                  pendingFounders > 0
                    ? `${pendingFounders} em carência de 7 dias`
                    : 'todas regulares'
                }
              />
            </div>
          </section>

          {/* ============ ASSINATURAS REAIS ============ */}
          <section aria-labelledby="assinaturas-reais">
            <h2 id="assinaturas-reais" className="mb-3 font-display text-lg font-bold">
              Assinaturas reais (Cakto)
            </h2>
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
                        Nenhuma assinatura real ainda — compartilhe o link do plano para
                        começar a somar fundadores reais ao mural.
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
          </section>
        </>
      )}
    </div>
  );
}
