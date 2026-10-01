/**
 * /admin — Dashboard: visão geral do negócio via API Cakto.
 *
 * Métricas agregadas de forma HONESTA (rótulos dizem de onde vêm):
 * - Saldo Cakto (disponível/a receber) — endpoint de saldo
 * - Assinaturas por status — contagem na listagem completa (até 500)
 * - Fundadores ativos — regra do mural (getFounders)
 * - Clientes — total da conta
 * - Receita aprovada — soma das últimas 250 vendas (janela visível)
 * - Últimas vendas — 8 mais recentes
 */

import {
  listCustomers, listOrders, listSubscriptions, getBalance, getFounders,
  CaktoApiError, CaktoList, CaktoOrder, CaktoSubscription,
} from '@/lib/cakto-server';
import { CAKTO_PRODUCT_IDS } from '@/lib/cakto';
import {
  AdminTable, BRL, CaktoError, DateTime, MetricCard, StatusBadge, Td,
} from './ui';

export const dynamic = 'force-dynamic';

const EMPTY_ORDERS: CaktoList<CaktoOrder> = {
  data: [], page: 1, pageSize: 0, total: 0, hasMore: false,
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof CaktoApiError && e.status === 401) throw e;
    return fallback;
  }
}

export default async function AdminDashboardPage() {
  let loadError: unknown = null;
  try {
    // Dispara token cedo para falhar rápido se não configurado
    await listSubscriptions(1, 1);
  } catch (e) {
    loadError = e;
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <CaktoError error={loadError} />
      </div>
    );
  }

  const [balance, subsPages, ordersRecent, customersFirst, founders] =
    await Promise.all([
      getBalance(),
      // Até 10 páginas × 50 = até 500 assinaturas para agregar status
      (async () => {
        const pages: CaktoSubscription[] = [];
        let page = 1;
        let hasMore = true;
        while (hasMore && page <= 10) {
          const res = await listSubscriptions(page, 50);
          pages.push(...res.data);
          hasMore = res.hasMore;
          page += 1;
        }
        return pages;
      })(),
      safe(() => listOrders(1, 50), EMPTY_ORDERS),
      safe(() => listCustomers(1, 1), null),
      safe(() => getFounders(Date.now()), []),
    ]);

  // Vendas: junta até 5 páginas (250 pedidos) para métricas de janela
  const orders = [...ordersRecent.data];
  if (ordersRecent.hasMore) {
    for (let p = 2; p <= 5; p++) {
      const res = await safe(() => listOrders(p, 50), EMPTY_ORDERS);
      orders.push(...res.data);
      if (!res.hasMore) break;
    }
  }

  const byStatus = subsPages.reduce<Record<string, number>>((acc, s) => {
    const k = s.status ?? '—';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const activeSubs = byStatus.active ?? 0;
  const lateSubs = byStatus.late ?? 0;

  const isProject = (o: (typeof orders)[number]) => {
    const pid = typeof o.product === 'object' ? o.product?.id : o.product;
    return !pid || (CAKTO_PRODUCT_IDS as readonly string[]).includes(pid);
  };
  const approved = orders.filter(
    (o) => o.status === 'approved' && isProject(o),
  );
  const approvedSum = approved.reduce(
    (sum, o) => sum + Number(o.amount ?? o.baseAmount ?? 0),
    0,
  );
  const cutoff30 = Date.now() - 30 * 86_400_000;
  const approved30 = approved.filter(
    (o) => o.createdAt && Date.parse(o.createdAt) >= cutoff30,
  ).length;

  const funders = founders.filter((f) => !f.pending).length;
  const pendingFounders = founders.length - funders;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral do apoio ao projeto — dados ao vivo da Cakto (cache de
          alguns segundos a minutos).
        </p>
      </div>

      {/* Métricas principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Saldo disponível"
          value={balance ? BRL(balance.available) : '—'}
          hint={balance ? `a receber: ${BRL(balance.pending)}` : 'saldo indisponível'}
        />
        <MetricCard
          label="Assinaturas ativas"
          value={String(activeSubs)}
          hint={lateSubs > 0 ? `${lateSubs} em atraso` : 'nenhuma em atraso'}
        />
        <MetricCard
          label="Fundadores no mural"
          value={String(funders)}
          hint={pendingFounders > 0 ? `${pendingFounders} pendentes (carência)` : 'todos regulares'}
        />
        <MetricCard
          label="Clientes"
          value={customersFirst ? String(customersFirst.total) : '—'}
          hint="compradores na Cakto"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Receita aprovada (últimas 250 vendas)"
          value={BRL(approvedSum)}
          hint={`${approved.length} vendas aprovadas na janela`}
        />
        <MetricCard
          label="Vendas aprovadas (30 dias)"
          value={String(approved30)}
          hint="apoios únicos + renovações"
        />
      </div>

      {/* Últimas vendas */}
      <section aria-labelledby="ultimas-vendas">
        <h2 id="ultimas-vendas" className="mb-3 font-display text-lg font-bold">
          Últimas vendas
        </h2>
        <AdminTable
          headers={['Pedido', 'Cliente', 'Produto', 'Valor', 'Método', 'Status', 'Data']}
          empty={orders.length === 0}
        >
          {orders.slice(0, 8).map((o, i) => {
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
                <Td className="text-xs text-muted-foreground">{o.paymentMethod ?? '—'}</Td>
                <Td><StatusBadge status={o.status} /></Td>
                <Td className="whitespace-nowrap text-xs text-muted-foreground">
                  {DateTime(o.createdAt)}
                </Td>
              </tr>
            );
          })}
        </AdminTable>
      </section>

      {/* Assinaturas por status */}
      <section aria-labelledby="subs-status">
        <h2 id="subs-status" className="mb-3 font-display text-lg font-bold">
          Assinaturas por status
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(byStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma assinatura ainda — o primeiro fundador aparece aqui.
            </p>
          ) : (
            Object.entries(byStatus).map(([status, count]) => (
              <span
                key={status}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm"
              >
                <StatusBadge status={status} />
                <strong>{count}</strong>
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
