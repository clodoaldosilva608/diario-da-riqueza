/**
 * Testes unitários de src/lib/outreach.ts + constantes de contato novas —
 * roda com: bun run scripts/test_outreach.ts
 *
 * Cobre:
 * - isRepeatDue: null (nunca exibido), dentro e fora da janela de 7 dias
 * - shouldShowSupportNudge / shouldShowSitePromo: gate completo
 * - URLs do site pessoal / criadores parceiros (https + caminho exato)
 * - Textos dos pop-ups (conteúdo mínimo esperado)
 */

import {
  OUTREACH_FIRST_DELAY_MS, OUTREACH_CHAIN_DELAY_MS, OUTREACH_REPEAT_MS,
  isRepeatDue, shouldShowSupportNudge, shouldShowSitePromo,
  type OutreachGate,
} from '../src/lib/outreach';
import {
  PARTNERS_URL, PERSONAL_SITE_URL, SITE_PROMO_INTRO, SUPPORT_NUDGE_INTRO,
} from '../src/lib/contact';

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string, extra?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_750_000_000_000; // época fixa (determinística)

const FULL_GATE: OutreachGate = { hydrated: true, onboarded: true, busyOverlay: false };

/* ============================== 1. isRepeatDue ============================== */
console.log('\n[1] isRepeatDue — cadência de 7 dias');

ok(isRepeatDue(NOW, null) === true, 'null (nunca exibido) → due imediatamente');
ok(isRepeatDue(NOW, NOW - OUTREACH_REPEAT_MS) === true, 'exatamente 7 dias atrás → due (>=)');
ok(isRepeatDue(NOW, NOW - (7 * DAY - 1)) === false, '7 dias menos 1ms → ainda não due');
ok(isRepeatDue(NOW, NOW - 1 * DAY) === false, '1 dia atrás → não due');
ok(isRepeatDue(NOW, NOW - 8 * DAY) === true, '8 dias atrás → due');
ok(isRepeatDue(NOW, NOW + 1000) === false, 'futuro (drift de relógio) → não due');
ok(OUTREACH_REPEAT_MS === 7 * DAY, 'OUTREACH_REPEAT_MS = 7 dias exatos');

/* ============================== 2. Gate: pop-up de apoio ============================== */
console.log('\n[2] shouldShowSupportNudge — gate');

ok(shouldShowSupportNudge(NOW, null, FULL_GATE) === true, 'gate completo + nunca exibido → true');
ok(
  shouldShowSupportNudge(NOW, null, { ...FULL_GATE, hydrated: false }) === false,
  'não hidratado → false (timestamps não confiáveis)',
);
ok(
  shouldShowSupportNudge(NOW, null, { ...FULL_GATE, onboarded: false }) === false,
  'sem onboarding → false (não interrompe visitante novo)',
);
ok(
  shouldShowSupportNudge(NOW, null, { ...FULL_GATE, busyOverlay: true }) === false,
  'tour/landing/busca abertos → false',
);
ok(shouldShowSupportNudge(NOW, NOW - 2 * DAY, FULL_GATE) === false, 'exibido há 2 dias → false');
ok(shouldShowSupportNudge(NOW, NOW - 9 * DAY, FULL_GATE) === true, 'exibido há 9 dias → true');

/* ============================== 3. Gate: pop-up do site ============================== */
console.log('\n[3] shouldShowSitePromo — gate independente');

ok(shouldShowSitePromo(NOW, null, FULL_GATE) === true, 'gate completo + nunca exibido → true');
ok(
  shouldShowSitePromo(NOW, null, { ...FULL_GATE, busyOverlay: true }) === false,
  'busy overlay → false',
);
ok(
  shouldShowSitePromo(NOW, null, { ...FULL_GATE, onboarded: false }) === false,
  'sem onboarding → false',
);
ok(shouldShowSitePromo(NOW, NOW - 3 * DAY, FULL_GATE) === false, 'exibido há 3 dias → false');
ok(shouldShowSitePromo(NOW, NOW - 10 * DAY, FULL_GATE) === true, 'exibido há 10 dias → true');

/* ============================== 4. Temporização ============================== */
console.log('\n[4] constantes de temporização');

ok(OUTREACH_FIRST_DELAY_MS === 40_000, 'primeira checagem após 40s de uso');
ok(OUTREACH_CHAIN_DELAY_MS === 20_000, 'pop-up do site 20s após fechar o de apoio');

/* ============================== 5. URLs externas ============================== */
console.log('\n[5] URLs do site pessoal / criadores parceiros');

ok(PERSONAL_SITE_URL === 'https://clodoaldo.vercel.app/', 'site pessoal correto');
ok(
  PARTNERS_URL === 'https://clodoaldo.vercel.app/criadores-parceiros',
  'URL de criadores parceiros correta',
);

for (const [label, url] of [
  ['site pessoal', PERSONAL_SITE_URL],
  ['criadores parceiros', PARTNERS_URL],
] as const) {
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    /* tratado abaixo */
  }
  ok(parsed !== null, `${label} é uma URL válida`);
  ok(parsed?.protocol === 'https:', `${label} usa HTTPS`);
  ok(parsed?.hostname === 'clodoaldo.vercel.app', `${label} aponta para clodoaldo.vercel.app`);
}

/* ============================== 6. Textos dos pop-ups ============================== */
console.log('\n[6] textos exibidos nos pop-ups');

ok(
  SUPPORT_NUDGE_INTRO.includes('qualquer valor'),
  'pop-up de apoio menciona "qualquer valor"',
);
ok(
  SUPPORT_NUDGE_INTRO.includes('gratuit'),
  'pop-up de apoio reforça que o app é gratuito',
);
ok(
  SITE_PROMO_INTRO.includes('por conta própria'),
  'pop-up do site contextualiza projetos por conta própria',
);
ok(
  SITE_PROMO_INTRO.includes('apoio voluntário'),
  'pop-up do site menciona apoio voluntário',
);
ok(
  SITE_PROMO_INTRO.includes('gratuit'),
  'pop-up do site reforça oferta gratuita',
);
ok(
  SITE_PROMO_INTRO.includes('aprender'),
  'pop-up do site menciona o objetivo de aprender',
);

/* ============================== Resumo ============================== */
console.log(`\n=== Resultado: ${passed} passaram, ${failed} falharam ===`);
if (failed > 0) process.exit(1);
