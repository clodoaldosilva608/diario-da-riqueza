/**
 * Diário da Riqueza — Cakto (plataforma de pagamento) — constantes e
 * regras PURAS, seguras para importar em qualquer camada (client ou server).
 *
 * A Cakto (https://cakto.com.br) processa os apoios voluntários do projeto:
 * - 3 produtos de contribuição única (valores fixos);
 * - 1 assinatura mensal "Apoiador Fundador" (Mural dos Fundadores);
 * - O Pix direto do criador continua como opção de VALOR LIVRE (ver
 *   src/lib/contact.ts) — o checkout hospedado da Cakto não aceita
 *   "pague quanto quiser", e o Pix direto tem zero taxa de PII/intermediário.
 *
 * Segurança:
 * - Offer IDs e URLs de checkout são PÚBLICOS (são links de pagamento).
 * - Nenhuma credencial Cakto vive neste arquivo: CAKTO_CLIENT_ID e
 *   CAKTO_CLIENT_SECRET ficam apenas em env vars server-side
 *   (src/lib/cakto-server.ts + rotas /api/*).
 * - Todos os links abrem em nova aba com rel="noopener noreferrer".
 */

/* ============================== PRODUTOS ============================== */

/** Produto Cakto "Apoio mínimo" (R$ 5) — offer id do link de checkout */
export const CAKTO_OFFER_MIN = 'xear8ps';

/** Produto Cakto "Apoio R$ 15" */
export const CAKTO_OFFER_15 = '3doo9ob';

/** Produto Cakto "Apoio R$ 50" */
export const CAKTO_OFFER_50 = '3a8wteb';

/** Produto Cakto "Apoiador Fundador" (assinatura mensal R$ 9,90) */
export const CAKTO_OFFER_FOUNDER = '7utmjxk';

/** Host público dos checkouts hospedados da Cakto */
export const CAKTO_CHECKOUT_HOST = 'https://pay.cakto.com.br';

/** IDs dos produtos Cakto (UUID) — usados para filtrar assinaturas/pedidos */
export const CAKTO_PRODUCT_FOUNDER_ID = 'fcbe8c19-83c6-43a0-bff8-46e19bfacadd';
export const CAKTO_PRODUCT_MIN_ID = '89a28c15-75b2-4d24-8f07-1413a9989aef';
export const CAKTO_PRODUCT_15_ID = '8a75ab17-789d-411a-831a-e032b82b2449';
export const CAKTO_PRODUCT_50_ID = '5a33cbba-b04c-47f1-a6d6-72594622a772';

/** Todos os produtos de apoio criados na Cakto para este projeto */
export const CAKTO_PRODUCT_IDS = [
  CAKTO_PRODUCT_MIN_ID, CAKTO_PRODUCT_15_ID,
  CAKTO_PRODUCT_50_ID, CAKTO_PRODUCT_FOUNDER_ID,
] as const;

/* ====================== ESCOPO: PRODUTOS DO PROJETO ====================== */

/**
 * A conta Cakto também contém produtos de OUTROS apps do criador
 * (Destrava, ResíduoZero, PsicoRisk...). Todo dado do painel /admin e das
 * APIs deste projeto é filtrado para incluir SOMENTE produtos do Diário da
 * Riqueza — por ID conhecido ou pelo nome do produto.
 */

/** O id pertence a um produto do projeto? */
export function isDrProductId(id: unknown): boolean {
  return (
    typeof id === 'string' &&
    (CAKTO_PRODUCT_IDS as readonly string[]).includes(id)
  );
}

/** Nome de produto pertence ao projeto? (cobre futuros produtos do DR) */
export function isDrProductName(name: unknown): boolean {
  return typeof name === 'string' && /di[aá]rio da riqueza/i.test(name);
}

/**
 * Extrai o id de produto de um pedido/assinatura da Cakto — o campo
 * `product` chega como UUID string ou como objeto {id, name}.
 */
export function caktoProductIdOf(product: unknown): string | null {
  if (typeof product === 'object' && product !== null) {
    const id = (product as { id?: unknown }).id;
    return typeof id === 'string' && id ? id : null;
  }
  return typeof product === 'string' && product ? product : null;
}

/* ============================== TIERS DE APOIO ============================== */

export interface CaktoTier {
  /** slug estável (key de listas/testes) */
  id: 'min' | 't15' | 't50';
  /** valor em reais (exibição) */
  amount: number;
  /** offer id → https://pay.cakto.com.br/{offerId} */
  offerId: string;
  /** rótulo curto do botão */
  label: string;
  /** frase de impacto exibida sob o valor */
  hint: string;
}

/** Tiers de contribuição única (valores fixos no checkout da Cakto) */
export const CAKTO_TIERS: readonly CaktoTier[] = [
  {
    id: 'min', amount: 5, offerId: CAKTO_OFFER_MIN,
    label: 'Apoiar com R$ 5',
    hint: 'O empurrãozinho que mantém o projeto no ar',
  },
  {
    id: 't15', amount: 15, offerId: CAKTO_OFFER_15,
    label: 'Apoiar com R$ 15',
    hint: 'Cobre um mês de infraestrutura e ferramentas',
  },
  {
    id: 't50', amount: 50, offerId: CAKTO_OFFER_50,
    label: 'Apoiar com R$ 50',
    hint: 'Acelera novos recursos e melhorias',
  },
] as const;

/** Preço mensal do Apoiador Fundador (exibição) */
export const CAKTO_FOUNDER_PRICE = 9.9;

/** Monta a URL de checkout hospedado a partir do offer id */
export function caktoCheckoutUrl(offerId: string): string {
  return `${CAKTO_CHECKOUT_HOST}/${encodeURIComponent(offerId)}`;
}

/** URL do checkout de qualquer tier fixo */
export function tierCheckoutUrl(tier: CaktoTier): string {
  return caktoCheckoutUrl(tier.offerId);
}

/** URL do checkout da assinatura Apoiador Fundador */
export const CAKTO_FOUNDER_CHECKOUT_URL = caktoCheckoutUrl(CAKTO_OFFER_FOUNDER);

/** URL de checkout é segura (host exato da Cakto, HTTPS)? */
export function isCaktoCheckoutUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'pay.cakto.com.br';
  } catch {
    return false;
  }
}

/* ============================== MURAL DOS FUNDADORES ============================== */

/**
 * Regra anti-inadimplência do Mural dos Fundadores:
 * - Assinatura `active` → nome no mural.
 * - Assinatura `late` (atrasada) → a Cakto tenta recorrência até 3x
 *   (max_retries da oferta); durante a CARÊNCIA o nome permanece com
 *   selo "pendente". Passada a carência sem regularizar → sai do mural.
 * - `paused`, `canceled`, `expired`, `inactive` → fora do mural.
 * O status é sempre calculado server-side a partir da API da Cakto
 * (src/lib/cakto-server.ts) — nada é decidido no cliente.
 */

/** Carência do nome no mural após a assinatura entrar em atraso: 7 dias */
export const FOUNDER_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/** Status relevantes da API de assinaturas da Cakto */
export type CaktoSubscriptionStatus =
  | 'active' | 'inactive' | 'canceled' | 'expired' | 'paused' | 'late' | 'trial';

/** Shape mínimo que /api/founders devolve por fundador */
export interface FounderEntry {
  /** nome exibido no mural (já formatado, ex.: "Clodoaldo S.") */
  name: string;
  /** mês/ano de entrada ("mar/2026") */
  since: string;
  /** nº da recorrência atual (1 = primeira mensalidade paga) */
  period: number;
  /** true se a assinatura está em atraso mas ainda dentro da carência */
  pending: boolean;
}

/**
 * Assinatura garante nome no mural AGORA?
 * @param status   status bruto da assinatura Cakto
 * @param updatedAtRef  timestamp de referência do último evento da assinatura
 *                    (ms) — usado como início do atraso quando status=late
 * @param now      timestamp atual (ms)
 */
export function founderEligible(
  status: string,
  updatedAtRef: number | null,
  now: number,
): boolean {
  if (status === 'active') return true;
  if (status === 'late') {
    if (updatedAtRef === null) return true; // sem referência: benefit of the doubt
    return now - updatedAtRef < FOUNDER_GRACE_MS;
  }
  return false;
}

const MONTHS_PT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
] as const;

/** Formata "mês/ano" em pt-BR curto a partir de um timestamp (ms) */
export function formatSince(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS_PT[d.getMonth()]}/${d.getFullYear()}`;
}

/** Iniciais para o avatar circular do mural ("Clodoaldo S." → "CS") */
export function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]![0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]![0]! : '';
  return (first + last).toUpperCase();
}

/**
 * Formata o nome do pagador para exibição pública no mural:
 * primeiro nome + inicial do último sobrenome ("Clodoaldo Conceicao Silva"
 * → "Clodoaldo S."). Partículas ("da", "de", "dos"...) não entram como
 * sobrenome exibido quando há outro disponível. Um nome só fica como está.
 * Sem PII além disso — nome completo nunca vai para a página pública.
 */
export function formatSupporterName(fullName: string): string {
  const parts = (fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'Apoiador';
  const particles = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
  const first = parts[0]!;
  if (parts.length === 1) {
    return first.charAt(0).toUpperCase() + first.slice(1);
  }
  let last = '';
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts[i]!.toLowerCase();
    if (!particles.has(candidate)) {
      last = candidate;
      break;
    }
  }
  if (!last) return first.charAt(0).toUpperCase() + first.slice(1);
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}

/* ============================== WEBHOOK ============================== */

/**
 * Eventos de webhook da Cakto que a aplicação aceita
 * (POST /api/cakto/webhook — validação por token na URL + shape mínimo).
 * Fase 1 não tem banco: o webhook responde 200 (para a Cakto não reenviar
 * com backoff) e registra no log do servidor. O MURAL lê o estado VIVO da
 * API — o webhook existe para auditoria e para a Fase 2 (banco + moderação).
 */
export const CAKTO_WEBHOOK_EVENTS = [
  'purchase_approved',
  'subscription_created',
  'subscription_renewed',
  'subscription_late',
  'subscription_late_recovered',
  'subscription_paused',
  'subscription_resumed',
  'subscription_canceled',
  'subscription_renewal_refused',
  'refund',
  'chargeback',
] as const;

/** O payload tem cara de evento Cakto (shape mínimo defensivo)? */
export function looksLikeCaktoEvent(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  const hasEvent = typeof p.event === 'string' && p.event.length > 0;
  // Cakto envolve dados em "data" (ou envia campos diretos em variantes)
  const hasData = typeof p.data === 'object' || 'id' in p || 'refId' in p;
  return hasEvent && hasData;
}
