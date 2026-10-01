/**
 * Diário da Riqueza — Outreach: cadência dos pop-ups de apoio e divulgação.
 *
 * Pura e determinística (sem DOM/store) para ser testável em bun
 * (scripts/test_outreach.ts). O componente OutreachDialogs consome estas
 * funções junto com os timestamps persistidos no store.
 *
 * Regras de UX (o "porquê" de cada limite):
 * - NUNCA interromper overlays de onboarding: tour guiado, landing aberta ou
 *   busca global — o pop-up só aparece com o app "em repouso".
 * - No máximo 1 exibição de cada pop-up por sessão (ref no componente).
 * - Cadência mínima de 7 dias por pop-up (timestamp persistido no store);
 *   assim quem fecha "Agora não" não é bombardeado no dia seguinte.
 * - Primeira exibição só depois de 40s de uso (não assusta quem acabou de
 *   entrar) e nunca antes do onboarding/tour terminarem.
 * - Nada é enviado a servidores: só timestamps locais no localStorage.
 */

/** Cadência mínima entre exibições do mesmo pop-up: 7 dias */
export const OUTREACH_REPEAT_MS = 7 * 24 * 60 * 60 * 1000;

/** Atraso da primeira checagem após o app abrir (e após fechar tour/landing) */
export const OUTREACH_FIRST_DELAY_MS = 40_000;

/** Atraso do pop-up do site após o usuário fechar o pop-up de apoio */
export const OUTREACH_CHAIN_DELAY_MS = 20_000;

/** Condições que precisam estar verdadeiras para qualquer pop-up aparecer */
export interface OutreachGate {
  /** store Zustand hidratado (timestamps confiáveis) */
  hydrated: boolean;
  /** usuário concluiu o onboarding */
  onboarded: boolean;
  /** tour guiado, landing ou busca global abertos agora */
  busyOverlay: boolean;
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

/** Pop-up de apoio pode aparecer agora? */
export function shouldShowSupportNudge(
  now: number,
  lastAt: number | null,
  gate: OutreachGate,
): boolean {
  return gate.hydrated && gate.onboarded && !gate.busyOverlay && isRepeatDue(now, lastAt);
}

/** Pop-up do site / criadores parceiros pode aparecer agora? */
export function shouldShowSitePromo(
  now: number,
  lastAt: number | null,
  gate: OutreachGate,
): boolean {
  return gate.hydrated && gate.onboarded && !gate.busyOverlay && isRepeatDue(now, lastAt);
}
