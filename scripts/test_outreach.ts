/**
 * Testes unitários de src/lib/outreach.ts + constantes de contato —
 * roda com: bun run scripts/test_outreach.ts
 *
 * Cobre:
 * - isRepeatDue: null (nunca exibido), dentro e fora da janela de 7 dias
 * - nextPopupDue: rotação na ordem support → share → site → method,
 *   gate (hidratação/onboarding/overlay) e exclusão da sessão
 * - URLs e mensagem de compartilhamento (buildShareTargets)
 * - Textos dos pop-ups (conteúdo mínimo esperado)
 */

import {
  OUTREACH_FIRST_DELAY_MS, OUTREACH_CHAIN_DELAY_MS, OUTREACH_REPEAT_MS,
  OUTREACH_MAX_PER_SESSION, OUTREACH_ORDER,
  gateAllows, isRepeatDue, nextPopupDue,
  type OutreachGate, type OutreachKind,
} from '../src/lib/outreach';
import {
  PARTNERS_URL, PERSONAL_SITE_URL, SHARE_URL, SHARE_TEXT, SHARE_SUBJECT,
  SHARE_INTRO, METHOD_FAQ, SUPPORT_NUDGE_INTRO, SITE_PROMO_INTRO,
  buildShareTargets,
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
const NO_LAST: Record<OutreachKind, number | null> = {
  support: null, share: null, site: null, method: null,
};
const recent = (days: number): Record<OutreachKind, number | null> => ({
  support: NOW - days * DAY, share: null, site: null, method: null,
});

/* ============================== 1. isRepeatDue ============================== */
console.log('\n[1] isRepeatDue — cadência de 7 dias');

ok(isRepeatDue(NOW, null) === true, 'null (nunca exibido) → due imediatamente');
ok(isRepeatDue(NOW, NOW - OUTREACH_REPEAT_MS) === true, 'exatamente 7 dias atrás → due (>=)');
ok(isRepeatDue(NOW, NOW - (7 * DAY - 1)) === false, '7 dias menos 1ms → ainda não due');
ok(isRepeatDue(NOW, NOW - 1 * DAY) === false, '1 dia atrás → não due');
ok(isRepeatDue(NOW, NOW - 8 * DAY) === true, '8 dias atrás → due');
ok(isRepeatDue(NOW, NOW + 1000) === false, 'futuro (drift de relógio) → não due');
ok(OUTREACH_REPEAT_MS === 7 * DAY, 'OUTREACH_REPEAT_MS = 7 dias exatos');

/* ============================== 2. Gate ============================== */
console.log('\n[2] gateAllows — condições de exibição');

ok(gateAllows(FULL_GATE) === true, 'gate completo → true');
ok(gateAllows({ ...FULL_GATE, hydrated: false }) === false, 'não hidratado → false');
ok(gateAllows({ ...FULL_GATE, onboarded: false }) === false, 'sem onboarding → false');
ok(gateAllows({ ...FULL_GATE, busyOverlay: true }) === false, 'tour/landing/busca abertos → false');

/* ============================== 3. Rotação nextPopupDue ============================== */
console.log('\n[3] nextPopupDue — rotação dos 4 pop-ups');

ok(nextPopupDue(NOW, NO_LAST, FULL_GATE) === 'support', 'todos nunca exibidos → support (1º da ordem)');
ok(
  nextPopupDue(NOW, recent(2), FULL_GATE) === 'share',
  'support exibido há 2 dias → próximo é share',
);
ok(
  nextPopupDue(NOW, { ...NO_LAST, support: NOW - 2 * DAY, share: NOW - 1 * DAY }, FULL_GATE) === 'site',
  'support + share recentes → site',
);
ok(
  nextPopupDue(
    NOW,
    { support: NOW - 2 * DAY, share: NOW - 1 * DAY, site: NOW - 3 * DAY, method: null },
    FULL_GATE,
  ) === 'method',
  'três recentes → method',
);
ok(
  nextPopupDue(
    NOW,
    { support: NOW - 2 * DAY, share: NOW - 1 * DAY, site: NOW - 3 * DAY, method: NOW - 4 * DAY },
    FULL_GATE,
  ) === null,
  'todos recentes (7 dias) → null',
);
ok(
  nextPopupDue(NOW, { ...NO_LAST, support: NOW - 9 * DAY }, FULL_GATE) === 'support',
  'support vencido há 9 dias volta a ser o 1º',
);
ok(
  nextPopupDue(NOW, NO_LAST, FULL_GATE, ['support']) === 'share',
  'exclude=[support] → share (ignora já exibido na sessão)',
);
ok(
  nextPopupDue(NOW, NO_LAST, FULL_GATE, ['support', 'share', 'site', 'method']) === null,
  'todos excluídos → null',
);
ok(nextPopupDue(NOW, NO_LAST, { ...FULL_GATE, busyOverlay: true }) === null, 'busy overlay → null');
ok(nextPopupDue(NOW, NO_LAST, { ...FULL_GATE, onboarded: false }) === null, 'sem onboarding → null');

/* ============================== 4. Constantes ============================== */
console.log('\n[4] constantes de temporização e ordem');

ok(OUTREACH_FIRST_DELAY_MS === 40_000, 'primeira checagem após 40s de uso');
ok(OUTREACH_CHAIN_DELAY_MS === 20_000, 'cadeia de 20s entre pop-ups');
ok(OUTREACH_MAX_PER_SESSION === 2, 'máx. 2 pop-ups por sessão');
ok(OUTREACH_ORDER.length === 4, '4 pop-ups no ciclo');
ok(OUTREACH_ORDER[0] === 'support' && OUTREACH_ORDER[1] === 'share' && OUTREACH_ORDER[2] === 'site' && OUTREACH_ORDER[3] === 'method',
  'ordem de prioridade support → share → site → method');

/* ============================== 5. URLs externas ============================== */
console.log('\n[5] URLs do site pessoal / criadores parceiros / share');

ok(PERSONAL_SITE_URL === 'https://clodoaldo.vercel.app/', 'site pessoal correto');
ok(
  PARTNERS_URL === 'https://clodoaldo.vercel.app/criadores-parceiros',
  'URL de criadores parceiros correta',
);
ok(SHARE_URL === 'https://diariodariqueza.vercel.app', 'SHARE_URL é o domínio canônico');

for (const [label, url] of [
  ['site pessoal', PERSONAL_SITE_URL],
  ['criadores parceiros', PARTNERS_URL],
  ['share', SHARE_URL],
] as const) {
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    /* tratado abaixo */
  }
  ok(parsed !== null, `${label} é uma URL válida`);
  ok(parsed?.protocol === 'https:', `${label} usa HTTPS`);
}

/* ============================== 6. buildShareTargets ============================== */
console.log('\n[6] buildShareTargets — intents de compartilhamento');

const targets = buildShareTargets('olá mundo', 'https://app.exemplo.dev');
const byName = new Map(targets.map((t) => [t.name, t.href]));

ok(targets.length === 6, '6 alvos de compartilhamento');
for (const name of ['WhatsApp', 'Telegram', 'Facebook', 'X (Twitter)', 'LinkedIn', 'E-mail']) {
  ok(byName.has(name), `alvo presente: ${name}`);
}
ok(byName.get('WhatsApp')?.startsWith('https://wa.me/?text=') === true, 'WhatsApp usa wa.me/?text=');
ok(byName.get('WhatsApp')?.includes('https%3A%2F%2Fapp.exemplo.dev') === true, 'WhatsApp inclui a URL encodada');
ok(byName.get('Telegram')?.startsWith('https://t.me/share/url?url=') === true, 'Telegram usa t.me/share/url');
ok(byName.get('Facebook')?.includes('sharer.php?u=') === true, 'Facebook usa sharer.php?u=');
ok(byName.get('X (Twitter)')?.startsWith('https://twitter.com/intent/tweet') === true, 'X usa intent/tweet');
ok(byName.get('LinkedIn')?.includes('share-offsite/?url=') === true, 'LinkedIn usa share-offsite');
ok(byName.get('E-mail')?.startsWith('mailto:?subject=') === true, 'E-mail usa mailto com subject');
ok(byName.get('E-mail')?.includes('%20') === true, 'espaços encodados (%20)');
ok(byName.get('WhatsApp')?.includes('%C3%A1') === true, 'acentos encodados ("á" → %C3%A1)');

/* ============================== 7. Textos dos pop-ups ============================== */
console.log('\n[7] textos exibidos nos pop-ups');

ok(SHARE_TEXT.includes('caderno é simples, mas poderosa'), 'mensagem discreta: abertura do método');
ok(SHARE_TEXT.includes('gratuita e offline'), 'mensagem discreta: gratuita e offline');
ok(SHARE_TEXT.includes('diariodariqueza.vercel.app'), 'mensagem discreta inclui o link');
ok(!SHARE_TEXT.includes('diario-da-riqueza.vercel.app'), 'mensagem discreta NÃO usa o domínio antigo');
ok(SHARE_SUBJECT.includes('Diário da Riqueza'), 'assunto de e-mail menciona o projeto');
ok(SHARE_INTRO.includes('compartilhar'), 'intro do modal pede para compartilhar');
ok(
  METHOD_FAQ[0].question.includes('garante riqueza') &&
    METHOD_FAQ[0].answer.includes('Não existe garantia'),
  'FAQ 1: método não garante riqueza (resposta honesta)',
);
ok(
  METHOD_FAQ[0].answer.includes('consistência'),
  'FAQ 1: resultado depende da consistência de cada um',
);
ok(
  METHOD_FAQ[1].question.includes('Como posso ajudar') &&
    METHOD_FAQ[1].answer.includes('usar e compartilhar'),
  'FAQ 2: ajudar é usar e compartilhar',
);
ok(
  METHOD_FAQ[1].answer.includes('O acesso continua gratuito'),
  'FAQ 2: acesso continua gratuito para todos',
);
ok(SUPPORT_NUDGE_INTRO.includes('qualquer valor'), 'pop-up de apoio menciona "qualquer valor"');
ok(SITE_PROMO_INTRO.includes('por conta própria'), 'pop-up do site contextualiza projetos independentes');
ok(SITE_PROMO_INTRO.includes('aprender'), 'pop-up do site menciona o objetivo de aprender');

/* ============================== Resumo ============================== */
console.log(`\n=== Resultado: ${passed} passaram, ${failed} falharam ===`);
if (failed > 0) process.exit(1);
