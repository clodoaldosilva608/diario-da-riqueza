/**
 * Diário da Riqueza — Outreach: cadência e rotação dos pop-ups de
 * apoio / compartilhar / site / método / seguir nas redes.
 *
 * Puro e determinístico (sem DOM/store) para ser testável em bun
 * (scripts/test_outreach.ts). O componente OutreachDialogs consome estas
 * funções junto com os timestamps persistidos no store.
 *
 * Regras de UX (o "porquê" de cada limite):
 * - NUNCA interromper overlays de onboarding: tour guiado, landing aberta ou
 *   busca global — o pop-up só aparece com o app "em repouso".
 * - ROTAÇÃO: há 5 pop-ups (apoio → compartilhar → site → método → seguir).
 *   A cada oportunidade mostra-se apenas o PRIMEIRO vencido na ordem de prioridade;
 *   os demais esperam a próxima sessão. Assim o usuário conhece todas as
 *   mensagens ao longo dos dias sem bombardeio.
 * - No máximo OUTREACH_MAX_PER_SESSION pop-ups por sessão (o 2º entra pela
 *   "cadeia": 20s após fechar o anterior, sem ação positiva do usuário).
 * - Ação positiva (apoiar, compartilhar, visitar site) NUNCA dispara cadeia.
 * - Cadência mínima de 7 dias por pop-up (timestamp persistido no store).
 * - Primeira exibição só depois de 40s de uso.
 * - Nada é enviado a servidores: só timestamps locais no localStorage.
 */

/** Cadência mínima entre exibições do mesmo pop-up: 7 dias */
export const OUTREACH_REPEAT_MS = 7 * 24 * 60 * 60 * 1000;

/** Atraso da primeira checagem após o app abrir (e após fechar tour/landing) */
export const OUTREACH_FIRST_DELAY_MS = 40_000;

/** Atraso do pop-up seguinte após fechar um (cadeia) */
export const OUTREACH_CHAIN_DELAY_MS = 20_000;

/** Máximo de pop-ups outreach por sessão (1º pelo timer, 2º pela cadeia) */
export const OUTREACH_MAX_PER_SESSION = 2;

/** Os cinco pop-ups do ciclo de engajamento */
export type OutreachKind = 'support' | 'share' | 'site' | 'method' | 'follow';

/** Ordem de prioridade quando mais de um está vencido */
export const OUTREACH_ORDER: OutreachKind[] = [
  'support', 'share', 'site', 'method', 'follow',
];

/** Condições que precisam estar verdadeiras para qualquer pop-up aparecer */
export interface OutreachGate {
  /** store Zustand hidratado (timestamps confiáveis) */
  hydrated: boolean;
  /** usuário concluiu o onboarding */
  onboarded: boolean;
  /** tour guiado, landing ou busca global abertos agora */
  busyOverlay: boolean;
}

/** O gate libera exibição? */
export function gateAllows(gate: OutreachGate): boolean {
  return gate.hydrated && gate.onboarded && !gate.busyOverlay;
}

/**
 * Um pop-up está "vencido" para reexibição?
 * `null` = nunca foi exibido → due imediatamente (assim que o gate liberar).
 * Caso contrário exige que tenha passado o intervalo mínimo (7 dias).
 */
export function isRepeatDue(now: number, lastAt: number | null): boolean {
  if (lastAt === null) return true;
  return now - lastAt >= OUTREACH_REPEAT_MS;
}

/**
 * Próximo pop-up vencido, na ordem de prioridade, ignorando os já exibidos
 * nesta sessão (`exclude`). Retorna null se o gate bloqueia ou nada está due.
 */
export function nextPopupDue(
  now: number,
  lastBy: Record<OutreachKind, number | null>,
  gate: OutreachGate,
  exclude: readonly OutreachKind[] = [],
): OutreachKind | null {
  if (!gateAllows(gate)) return null;
  for (const kind of OUTREACH_ORDER) {
    if (exclude.includes(kind)) continue;
    if (isRepeatDue(now, lastBy[kind])) return kind;
  }
  return null;
}
