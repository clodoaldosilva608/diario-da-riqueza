/**
 * /admin — Dashboard: visão geral do projeto via API Cakto.
 *
 * ESCOPO: SOMENTE produtos do Diário da Riqueza (pedidos, assinaturas e
 * clientes de outros apps da mesma conta Cakto ficam de fora — ver
 * listDrOrders/listDrSubscriptions/listDrCustomers).
 *
 * Painel completo:
 * - KPIs: saldo Cakto, MRR estimado (assinaturas ativas × R$ 9,90),
 *   fundadores (mural público), clientes, receita aprovada, vendas 30d,
 *   ticket médio e assinaturas ativas;
 * - Gráfico de receita por mês (últimos 6 meses, barras server-safe);
 * - Distribuição de assinaturas por status;
 * - Mural público (exibição na landing): Fundador Ouro + comunidade + reais;
 * - Últimas vendas (10 mais recentes).
 */

import Link from 'next/link';
import { ExternalLink, RefreshCcw } from 'lucide-react';
import {
  listDrOrders, listDrSubscriptions, listDrCustomers,
  getBalance, getFounders,
  CaktoApiError,
} from '@/lib/cakto-server';
import { CAKTO_FOUNDER_PRICE } from '@/lib/cakto';
import {
  wallDisplayCount,
} from '@/lib/founder-showcase';
import {
  averageTicket, monthlyRevenueSeries, mrrEstimate,
} from './metrics';
import {
  AdminTable, BRL, CaktoError, DateTime, MetricCard, MiniBars,
  PageHeader, StatusBadge, Td,
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
        <PageHeader title="Dashboard" />
        <CaktoError error={loadError} />
      </div>
    );
  }

  const now = Date.now();
  const [balance, drSubs, drOrders, drCustomers, founders] =
    await Promise.all([
      getBalance(),
      safe(() => listDrSubscriptions(), {
        data: [], page: 1, pageSize: 0, total: 0, hasMore: false,
      }),
      safe(() => listDrOrders(), EMPTY_ORDERS),
      safe(() => listDrCustomers(), null),
      safe(() => getFounders(now), []),
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
  const cutoff30 = now - 30 * 86_400_000;
  const approved30 = approved.filter(
    (o) => o.createdAt && Date.parse(o.createdAt) >= cutoff30,
  ).length;
  const ticket = averageTicket(orders);
  const mrr = mrrEstimate(activeSubs);
  const series = monthlyRevenueSeries(orders, now, 6);

  const wallTotal = wallDisplayCount(founders, now);
  const realFounders = founders.filter((f) => !f.pending).length;
  const pendingFounders = founders.length - realFounders;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Visão geral do apoio ao projeto — dados ao vivo da Cakto, apenas dos produtos do Diário da Riqueza (outros apps da conta ficam de fora). Cache de alguns segundos a minutos."
        action={
          <div className="flex gap-2">
            <Link
              href="/admin"
              className="flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Recarregar dados do dashboard"
            >
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Atualizar
            </Link>
            <a
              href="/#fundadores"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center gap-1.5 rounded-xl border border-gold/40 px-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
              title="Abrir o Mural dos Fundadores na landing"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Ver mural
            </a>
          </div>
        }
      />

      {/* KPIs — linha 1 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Saldo disponível"
          value={balance ? BRL(balance.available) : '—'}
          hint={balance ? `a receber: ${BRL(balance.pending)}` : 'saldo indisponível'}
        />
        <MetricCard
          label="MRR estimado"
          value={BRL(mrr)}
          hint={`${activeSubs} assinatura(s) ativa(s) × ${BRL(CAKTO_FOUNDER_PRICE)}`}
        />
        <MetricCard
          label="Fundadores (mural público)"
          value={String(wallTotal)}
          hint={
            pendingFounders > 0
              ? `${realFounders} reais + ${pendingFounders} em carência`
              : 'inclui Fundador Ouro + comunidade'
          }
        />
        <MetricCard
          label="Clientes"
          value={drCustomers ? String(drCustomers.total) : '—'}
          hint="apoiadores dos produtos do projeto"
        />
      </div>

      {/* KPIs — linha 2 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Receita aprovada (janela)"
          value={BRL(approvedSum)}
          hint={`${approved.length} vendas aprovadas na janela`}
        />
        <MetricCard
          label="Vendas aprovadas (30 dias)"
          value={String(approved30)}
          hint="apoios únicos + renovações"
        />
        <MetricCard
          label="Ticket médio"
          value={approved.length > 0 ? BRL(ticket) : '—'}
          hint="média das vendas aprovadas"
        />
        <MetricCard
          label="Assinaturas ativas"
          value={String(activeSubs)}
          hint={lateSubs > 0 ? `${lateSubs} em atraso` : 'nenhuma em atraso'}
        />
      </div>

      {/* Receita por mês + status */}
      <div className="grid gap-6 xl:grid-cols-5">
        <section
          aria-labelledby="receita-mes"
          className="rounded-2xl border border-border bg-card p-5 xl:col-span-3"
        >
          <h2 id="receita-mes" className="font-display text-lg font-bold">
            Receita aprovada por mês
          </h2>
          <p className="mb-5 mt-1 text-xs text-muted-foreground">
            Últimos 6 meses · pedidos aprovados dos produtos do projeto
          </p>
          <MiniBars data={series} />
        </section>

        <section
          aria-labelledby="subs-status"
          className="rounded-2xl border border-border bg-card p-5 xl:col-span-2"
        >
          <h2 id="subs-status" className="font-display text-lg font-bold">
            Assinaturas por status
          </h2>
          <p className="mb-4 mt-1 text-xs text-muted-foreground">
            Estado atual das recorrências do plano fundador
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma assinatura ainda — o primeiro fundador aparece aqui.
              </p>
            ) : (
              Object.entries(byStatus).map(([status, count]) => (
                <span
                  key={status}
                  className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-sm"
                >
                  <StatusBadge status={status} />
                  <strong>{count}</strong>
                </span>
              ))
            )}
          </div>
          <div className="mt-5 rounded-xl border border-gold/30 bg-gold/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              Mural público
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              A landing exibe <strong className="text-foreground">{wallTotal} nomes</strong>:
              Fundador Ouro + comunidade + {realFounders} assinatura(s) real(is) regular(es).
            </p>
            <Link
              href="/admin/fundadores"
              className="mt-2 inline-block text-xs font-semibold text-gold hover:underline"
            >
              Gerenciar fundadores →
            </Link>
          </div>
        </section>
      </div>

      {/* Últimas vendas */}
      <section aria-labelledby="ultimas-vendas">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="ultimas-vendas" className="font-display text-lg font-bold">
            Últimas vendas
          </h2>
          <Link
            href="/admin/vendas"
            className="text-sm font-semibold text-gold hover:underline"
          >
            Ver todas →
          </Link>
        </div>
        <AdminTable
          headers={['Pedido', 'Cliente', 'Produto', 'Valor', 'Método', 'Status', 'Data']}
          empty={orders.length === 0}
        >
          {orders.slice(0, 10).map((o, i) => {
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
    </div>
  );
}
