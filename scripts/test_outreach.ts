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
  FOLLOW_INTRO, CREATOR_SECTION_INTRO, buildShareTargets,
  INSTAGRAM_URL, TIKTOK_URL, YOUTUBE_URL, BIO_SITE_URL, LINKTREE_URL,
  CONTACT_EMAIL, CONTACT_EMAIL_URL, INSTAGRAM_HANDLE, TIKTOK_HANDLE,
  YOUTUBE_HANDLE,
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
  support: null, share: null, site: null, method: null, follow: null,
};
const recent = (days: number): Record<OutreachKind, number | null> => ({
  support: NOW - days * DAY, share: null, site: null, method: null, follow: null,
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
console.log('\n[3] nextPopupDue — rotação dos 5 pop-ups');

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
    { support: NOW - 2 * DAY, share: NOW - 1 * DAY, site: NOW - 3 * DAY, method: null, follow: null },
    FULL_GATE,
  ) === 'method',
  'três recentes → method',
);
ok(
  nextPopupDue(
    NOW,
    { support: NOW - 2 * DAY, share: NOW - 1 * DAY, site: NOW - 3 * DAY, method: NOW - 4 * DAY, follow: null },
    FULL_GATE,
  ) === 'follow',
  'quatro recentes → follow (5º da ordem)',
);
ok(
  nextPopupDue(
    NOW,
    { support: NOW - 2 * DAY, share: NOW - 1 * DAY, site: NOW - 3 * DAY, method: NOW - 4 * DAY, follow: NOW - 5 * DAY },
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
  nextPopupDue(NOW, NO_LAST, FULL_GATE, ['support', 'share', 'site', 'method', 'follow']) === null,
  'todos excluídos → null',
);
ok(nextPopupDue(NOW, NO_LAST, { ...FULL_GATE, busyOverlay: true }) === null, 'busy overlay → null');
ok(nextPopupDue(NOW, NO_LAST, { ...FULL_GATE, onboarded: false }) === null, 'sem onboarding → null');

/* ============================== 4. Constantes ============================== */
console.log('\n[4] constantes de temporização e ordem');

ok(OUTREACH_FIRST_DELAY_MS === 40_000, 'primeira checagem após 40s de uso');
ok(OUTREACH_CHAIN_DELAY_MS === 20_000, 'cadeia de 20s entre pop-ups');
ok(OUTREACH_MAX_PER_SESSION === 2, 'máx. 2 pop-ups por sessão');
ok(OUTREACH_ORDER.length === 5, '5 pop-ups no ciclo');
ok(
  OUTREACH_ORDER[0] === 'support' && OUTREACH_ORDER[1] === 'share' &&
  OUTREACH_ORDER[2] === 'site' && OUTREACH_ORDER[3] === 'method' &&
  OUTREACH_ORDER[4] === 'follow',
  'ordem de prioridade support → share → site → method → follow',
);

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

/* ==================== 8. Redes sociais do criador (rodapé do site) ==================== */
console.log('\n[8] redes sociais do criador — mesmas do rodapé do site pessoal');

ok(INSTAGRAM_URL === 'https://www.instagram.com/clodoaldo_c_silva', 'URL do Instagram correta');
ok(TIKTOK_URL === 'https://www.tiktok.com/@clodoald_c_silva', 'URL do TikTok correta');
ok(YOUTUBE_URL === 'https://youtube.com/@clodoaldosilvaa', 'URL do YouTube correta');
ok(BIO_SITE_URL === 'https://bio.site/clodoadosilva', 'URL do Bio.site correta');
ok(LINKTREE_URL === 'https://linktr.ee/clodoaldo608', 'URL da Linktree correta');
ok(CONTACT_EMAIL === 'clodoaldosilva608@gmail.com', 'e-mail de contato correto');
ok(CONTACT_EMAIL_URL === 'mailto:clodoaldosilva608@gmail.com', 'mailto correto');
ok(INSTAGRAM_HANDLE === '@clodoaldo_c_silva', 'handle do Instagram correto');
ok(TIKTOK_HANDLE === '@clodoald_c_silva', 'handle do TikTok correto');
ok(YOUTUBE_HANDLE === '@clodoaldosilvaa', 'handle do YouTube correto');

for (const [label, url] of [
  ['Instagram', INSTAGRAM_URL],
  ['TikTok', TIKTOK_URL],
  ['YouTube', YOUTUBE_URL],
  ['Bio.site', BIO_SITE_URL],
  ['Linktree', LINKTREE_URL],
] as const) {
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    /* tratado abaixo */
  }
  ok(parsed !== null, `URL da rede ${label} é válida`);
  ok(parsed?.protocol === 'https:', `URL da rede ${label} usa HTTPS`);
}

/* ==================== 9. Textos da seção do criador e do pop-up "siga" ==================== */
console.log('\n[9] textos — seção do criador e pop-up seguir nas redes');

ok(CREATOR_SECTION_INTRO.includes('Clodoaldo Silva'), 'seção do criador apresenta o criador pelo nome');
ok(CREATOR_SECTION_INTRO.includes('2016'), 'seção do criador menciona o histórico desde 2016');
ok(CREATOR_SECTION_INTRO.includes('gratuit'), 'seção do criador reforça gratuidade');
ok(FOLLOW_INTRO.includes('TikTok'), 'pop-up seguir menciona o TikTok');
ok(FOLLOW_INTRO.includes('Instagram'), 'pop-up seguir menciona o Instagram');
ok(FOLLOW_INTRO.includes('gratuit'), 'pop-up seguir reforça que seguir é gratuito');

/* ============================== Resumo ============================== */
console.log(`\n=== Resultado: ${passed} passaram, ${failed} falharam ===`);
if (failed > 0) process.exit(1);
