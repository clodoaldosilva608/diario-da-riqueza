/**
 * metrics.ts — agregações PURAS do Dashboard /admin (sem rede, sem IO).
 * Testadas por scripts/test_founders_wall.ts.
 */

import { CAKTO_FOUNDER_PRICE } from '@/lib/cakto';

/** Shape mínimo de pedido que as métricas consomem */
export interface MetricOrder {
  status?: string;
  amount?: string | number;
  baseAmount?: string | number;
  createdAt?: string;
}

export interface MonthBucket {
  /** rótulo curto pt-BR ("mai/26") */
  label: string;
  /** soma dos pedidos aprovados no mês (R$) */
  value: number;
  /** nº de pedidos aprovados no mês */
  count: number;
}

const MONTHS_PT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
] as const;

function amountOf(o: MetricOrder): number {
  const n = Number(o.amount ?? o.baseAmount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Série de receita aprovada por mês, dos últimos `months` meses
 * (mais antigo → mais recente). Mês sem vendas entra com zero — o
 * gráfico nunca "pula" um mês.
 */
export function monthlyRevenueSeries(
  orders: readonly MetricOrder[],
  now: number,
  months = 6,
): MonthBucket[] {
  const base = new Date(now);
  const buckets: MonthBucket[] = [];
  const index = new Map<string, MonthBucket>();

  for (let back = months - 1; back >= 0; back--) {
    const d = new Date(base.getFullYear(), base.getMonth() - back, 1);
    const label = `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
    const bucket: MonthBucket = { label, value: 0, count: 0 };
    buckets.push(bucket);
    index.set(`${d.getFullYear()}-${d.getMonth()}`, bucket);
  }

  for (const o of orders) {
    if (o.status !== 'approved' || !o.createdAt) continue;
    const d = new Date(o.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const bucket = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (!bucket) continue;
    bucket.value += amountOf(o);
    bucket.count += 1;
  }

  return buckets;
}

/** Ticket médio dos pedidos aprovados (0 se não houver) */
export function averageTicket(orders: readonly MetricOrder[]): number {
  const approved = orders.filter((o) => o.status === 'approved');
  if (approved.length === 0) return 0;
  const sum = approved.reduce((acc, o) => acc + amountOf(o), 0);
  return sum / approved.length;
}

/** MRR estimado: assinaturas ativas × preço do plano fundador */
export function mrrEstimate(activeSubscriptions: number): number {
  return Math.max(0, activeSubscriptions) * CAKTO_FOUNDER_PRICE;
}
