/**
 * Diário da Riqueza — cliente Cakto SERVER-SIDE.
 *
 * ⚠️ NUNCA importar em componentes client: este módulo lê CAKTO_CLIENT_ID e
 * CAKTO_CLIENT_SECRET das env vars e faz chamadas à API pública da Cakto
 * (https://api.cakto.com.br). Todo consumo de UI passa por rotas /api/*
 * ou server components do /admin.
 *
 * Autenticação: OAuth2 client credentials — POST /public_api/token/
 * (x-www-form-urlencoded) → {access_token, expires_in}. O token é opaco e
 * fica em cache em memória até ~90% da validade (serverless: cache por
 * instância, renovação transparente em cold start).
 *
 * Resiliência: um cache em memória com TTL ("cached") protege a API de
 * rajadas (landing com vários visitantes → 1 chamada por TTL). Falhas da
 * Cakto não derrubam a página: /api/founders serve o último snapshot bom
 * enquanto estiver dentro do TTL "stale" estendido.
 */

import {
  CAKTO_PRODUCT_FOUNDER_ID,
  FounderEntry, formatSince, formatSupporterName, founderEligible,
} from './cakto';

const CAKTO_API_BASE = 'https://api.cakto.com.br';

/** Cache em memória por instância (chave → {valor, expiraEm, staleAt}) */
type CacheEntry = { value: unknown; staleAt: number; expiresAt: number };
const cache = new Map<string, CacheEntry>();

/**
 * Executa `fn` com cache TTL. Entre `staleAt` e `expiresAt` serve o valor
 * velho e dispara atualização em background (SWR simplificado).
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  staleMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;
  if (hit && hit.staleAt > now) {
    // serve stale + revalida em background (não bloqueia resposta)
    void fn().then((v) => {
      cache.set(key, {
        value: v, staleAt: now + ttlMs, expiresAt: now + staleMs,
      });
    }).catch(() => {/* mantém stale */ });
    return hit.value as T;
  }
  const value = await fn();
  cache.set(key, { value, staleAt: now + ttlMs, expiresAt: now + staleMs });
  return value;
}

/* ============================== TOKEN ============================== */

interface TokenInfo {
  access_token: string;
  expires_in: number;
  fetchedAt: number;
}

let tokenCache: TokenInfo | null = null;

/** Credenciais configuradas neste ambiente (server-side)? */
export function caktoConfigured(): boolean {
  return Boolean(
    process.env.CAKTO_CLIENT_ID && process.env.CAKTO_CLIENT_SECRET,
  );
}

/** Obtém (ou renova) o token OAuth2 da Cakto */
export async function caktoToken(): Promise<string> {
  if (!caktoConfigured()) {
    throw new Error('CAKTO_CLIENT_ID/CAKTO_CLIENT_SECRET não configurados');
  }
  const now = Date.now();
  if (tokenCache && tokenCache.fetchedAt + tokenCache.expires_in * 900 > now) {
    return tokenCache.access_token;
  }
  const res = await fetch(`${CAKTO_API_BASE}/public_api/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.CAKTO_CLIENT_ID!,
      client_secret: process.env.CAKTO_CLIENT_SECRET!,
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Cakto token HTTP ${res.status}`);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error('Cakto token: resposta sem access_token');
  }
  tokenCache = {
    access_token: data.access_token,
    expires_in: data.expires_in ?? 3600,
    fetchedAt: now,
  };
  return tokenCache.access_token;
}

/* ============================== FETCH BASE ============================== */

export interface CaktoList<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export class CaktoApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'CaktoApiError';
  }
}

/** Chamada autenticada à API da Cakto (JSON) */
export async function caktoFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await caktoToken();
  const res = await fetch(`${CAKTO_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new CaktoApiError(res.status, `Cakto ${path} HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Paginação estilo DRF usada pela Cakto: {count, next, previous, results} */
interface DrfPage<T> {
  count?: number;
  next?: string | null;
  results?: T[];
}

async function caktoList<T>(
  path: string,
  page: number,
  pageSize: number,
  extraQuery: Record<string, string> = {},
): Promise<CaktoList<T>> {
  // A API bruta da Cakto pagina com `page` + `limit` (não page_size)
  const q = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    ...extraQuery,
  });
  const raw = await caktoFetch<DrfPage<T> | T[]>(`${path}?${q.toString()}`);
  if (Array.isArray(raw)) {
    return { data: raw, page, pageSize, total: raw.length, hasMore: false };
  }
  return {
    data: raw.results ?? [],
    page,
    pageSize,
    total: raw.count ?? (raw.results?.length ?? 0),
    hasMore: Boolean(raw.next),
  };
}

/* ============================== ASSINATURAS / FUNDADORES ============================== */

export interface CaktoSubscription {
  id: string;
  status: string;
  product?: string;
  offer?: string;
  customer?: string | { id?: string; name?: string };
  current_period?: number;
  current_situation?: string;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
  [k: string]: unknown;
}

export interface CaktoCustomer {
  id: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  [k: string]: unknown;
}

/** Lista assinaturas (pagina até pageSize total) */
export async function listSubscriptions(
  page = 1,
  pageSize = 50,
): Promise<CaktoList<CaktoSubscription>> {
  return cached(
    `subs:${page}:${pageSize}`,
    5 * 60_000, 30 * 60_000,
    () => caktoList<CaktoSubscription>('/public_api/subscriptions/', page, pageSize),
  );
}

/**
 * Fundadores com nome garantido no mural, aplicando a regra
 * anti-inadimplência (src/lib/cakto.ts → founderEligible):
 * active = no mural; late = no mural durante a carência de 7 dias;
 * paused/canceled/expired/inactive = fora.
 */
export async function getFounders(now: number): Promise<FounderEntry[]> {
  // Junta todas as páginas (fundadores nunca serão milhares; limita 10)
  const first = await listSubscriptions(1, 50);
  const subs = [...first.data];
  let page = 1;
  while (first.hasMore && page < 10) {
    page += 1;
    const next = await listSubscriptions(page, 50);
    subs.push(...next.data);
    if (!next.hasMore) break;
  }

  const founderSubs = subs.filter(
    (s) => (s.product ?? '') === CAKTO_PRODUCT_FOUNDER_ID,
  );

  const entries: FounderEntry[] = [];
  for (const s of founderSubs) {
    const updatedAtRaw = s.updatedAt ?? s.updated_at ?? null;
    const updatedAt = updatedAtRaw ? Date.parse(updatedAtRaw) : null;
    if (!founderEligible(s.status, Number.isNaN(updatedAt) ? null : updatedAt, now)) {
      continue;
    }
    // Nome do cliente: embutido ou via customers_retrieve
    let fullName = '';
    if (typeof s.customer === 'object' && s.customer?.name) {
      fullName = s.customer.name;
    } else if (typeof s.customer === 'string' && s.customer) {
      try {
        const cust = await cached<CaktoCustomer | null>(
          `cust:${s.customer}`, 10 * 60_000, 60 * 60_000,
          async () => {
            try {
              return await caktoFetch<CaktoCustomer>(
                `/public_api/customers/${encodeURIComponent(s.customer as string)}/`,
              );
            } catch {
              return null; // cliente sumiu/sem acesso: mural mostra fallback
            }
          },
        );
        fullName = cust?.name ?? '';
      } catch {
        fullName = '';
      }
    }
    const createdAtRaw = s.createdAt ?? s.created_at ?? updatedAtRaw;
    const createdAt = createdAtRaw ? Date.parse(createdAtRaw) : now;
    entries.push({
      name: formatSupporterName(fullName),
      since: formatSince(Number.isNaN(createdAt) ? now : createdAt),
      period: typeof s.current_period === 'number' ? s.current_period : 1,
      pending: s.status === 'late',
    });
  }

  // Mais antigos primeiro (orgulho de quem entrou cedo)
  return entries.sort((a, b) => a.since.localeCompare(b.since) || a.period - b.period);
}

/* ============================== ORDERS / CLIENTES / BALANCE ============================== */

export interface CaktoOrder {
  id?: string;
  refId?: string;
  status?: string;
  type?: string;
  amount?: string | number;
  baseAmount?: string | number;
  discount?: string | number;
  paymentMethod?: string;
  installments?: number;
  createdAt?: string;
  customer?: { name?: string; email?: string } | string;
  product?: { id?: string; name?: string } | string;
  offer?: string;
  [k: string]: unknown;
}

export async function listOrders(
  page = 1,
  pageSize = 20,
  search = '',
): Promise<CaktoList<CaktoOrder>> {
  return cached(
    `orders:${page}:${pageSize}:${search}`,
    60_000, 10 * 60_000,
    () => caktoList<CaktoOrder>('/public_api/orders/', page, pageSize,
      search ? { search } : {}),
  );
}

export async function listCustomers(
  page = 1,
  pageSize = 20,
  search = '',
): Promise<CaktoList<CaktoCustomer>> {
  return cached(
    `customers:${page}:${pageSize}:${search}`,
    5 * 60_000, 30 * 60_000,
    () => caktoList<CaktoCustomer>('/public_api/customers/', page, pageSize,
      search ? { search } : {}),
  );
}

export interface CaktoBalance {
  currency: string;
  available: string;
  pending: string;
  reserved: string;
  anticipatable: string;
  heldByRefund: string;
}

export async function getBalance(): Promise<CaktoBalance | null> {
  try {
    return await cached(
      'balance', 60_000, 10 * 60_000,
      async () => {
        // A API pode devolver o objeto direto ou embrulhado em {data}
        const raw = await caktoFetch<CaktoBalance | { data?: CaktoBalance }>(
          '/public_api/balance/',
        );
        return (raw as { data?: CaktoBalance }).data ?? (raw as CaktoBalance);
      },
    );
  } catch {
    return null;
  }
}

/* ============================== PRODUTOS / WEBHOOKS (admin) ============================== */

export interface CaktoProduct {
  id: string;
  name: string;
  description?: string;
  price?: string | number;
  currency?: string;
  type?: string;
  status?: string;
  salesPage?: string | null;
  paymentMethods?: string[];
  [k: string]: unknown;
}

export async function listProducts(
  page = 1,
  pageSize = 50,
): Promise<CaktoList<CaktoProduct>> {
  return cached(
    `products:${page}:${pageSize}`, 5 * 60_000, 30 * 60_000,
    () => caktoList<CaktoProduct>('/public_api/products/', page, pageSize),
  );
}

export interface CaktoWebhook {
  id: string;
  name?: string;
  url?: string;
  status?: string;
  events?: string[];
  products?: string[];
  [k: string]: unknown;
}

export async function listWebhooks(
  page = 1,
  pageSize = 20,
): Promise<CaktoList<CaktoWebhook>> {
  return cached(
    `webhooks:${page}:${pageSize}`, 30_000, 5 * 60_000,
    () => caktoList<CaktoWebhook>('/public_api/webhook/', page, pageSize),
  );
}

/** Cancela assinatura (ação administrativa com confirmação na UI) */
export async function cancelSubscription(id: string): Promise<boolean> {
  const res = await caktoFetch<unknown>(
    `/public_api/subscriptions/${encodeURIComponent(id)}/cancel/`,
    { method: 'POST' },
  );
  return Boolean(res);
}
