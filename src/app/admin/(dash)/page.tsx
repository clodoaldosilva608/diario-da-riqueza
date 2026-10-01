/**
 * /admin — Dashboard: visão geral do projeto via API Cakto.
 *
 * ESCOPO: SOMENTE produtos do Diário da Riqueza (pedidos, assinaturas e
 * clientes de outros apps da mesma conta Cakto ficam de fora — ver
 * listDrOrders/listDrSubscriptions/listDrCustomers).
 *
 * Métricas agregadas de forma HONESTA (rótulos dizem de onde vêm):
 * - Saldo Cakto (disponível/a receber) — endpoint de saldo (conta)
 * - Assinaturas por status — só assinaturas de produtos do projeto
 * - Fundadores ativos — regra do mural (getFounders)
 * - Clientes — compradores de produtos do projeto
 * - Receita aprovada — soma dos pedidos aprovados do projeto (janela 500)
 * - Últimas vendas — 8 mais recentes do projeto
 */

import {
  listDrOrders, listDrSubscriptions, listDrCustomers,
  getBalance, getFounders,
  CaktoApiError,
} from '@/lib/cakto-server';
import {
  AdminTable, BRL, CaktoError, DateTime, MetricCard, StatusBadge, Td,
} from './ui';

export const dynamic = 'force-dynamic';

const EMPTY_ORDERS: Awaited<ReturnType<typeof listDrOrders>> = {
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
    await listDrSubscriptions();
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

  const [balance, drSubs, drOrders, drCustomers, founders] =
    await Promise.all([
      getBalance(),
      safe(() => listDrSubscriptions(), {
        data: [], page: 1, pageSize: 0, total: 0, hasMore: false,
      }),
      safe(() => listDrOrders(), EMPTY_ORDERS),
      safe(() => listDrCustomers(), null),
      safe(() => getFounders(Date.now()), []),
    ]);

  const orders = drOrders.data;
  const byStatus = drSubs.data.reduce<Record<string, number>>((acc, s) => {
    const k = s.status ?? '—';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const activeSubs = byStatus.active ?? 0;
  const lateSubs = byStatus.late ?? 0;

  const approved = orders.filter((o) => o.status === 'approved');
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
          Visão geral do apoio ao projeto — dados ao vivo da Cakto, apenas
          dos produtos do Diário da Riqueza (outros apps da conta ficam de
          fora). Cache de alguns segundos a minutos.
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
          value={drCustomers ? String(drCustomers.total) : '—'}
          hint="apoiadores dos produtos do projeto"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Receita aprovada (janela do projeto)"
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
