/**
 * test_cakto.ts — testes da camada Cakto (pura, sem rede):
 * constantes de tiers/URLs, formatação de nome do mural, iniciais,
 * regra anti-inadimplência (founderEligible), carência de 7 dias,
 * formatSince, eventos de webhook e guard de URL de checkout.
 *
 * Executar: bun scripts/test_cakto.ts
 */

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean) {
  if (cond) {
    passed += 1;
  } else {
    failed += 1;
    failures.push(name);
    console.error(`  ✗ ${name}`);
  }
}

import {
  CAKTO_CHECKOUT_HOST, CAKTO_FOUNDER_CHECKOUT_URL, CAKTO_FOUNDER_PRICE,
  CAKTO_OFFER_FOUNDER, CAKTO_PRODUCT_FOUNDER_ID, CAKTO_TIERS,
  FOUNDER_GRACE_MS, caktoCheckoutUrl, caktoProductIdOf, formatSince,
  formatSupporterName, founderEligible, initialsOf, isCaktoCheckoutUrl,
  isDrProductId, isDrProductName, looksLikeCaktoEvent, tierCheckoutUrl,
} from '../src/lib/cakto';

/* ============================== TIERS / URLS ============================== */

console.log('== Tiers e URLs de checkout ==');
check('3 tiers fixos', CAKTO_TIERS.length === 3);
check('valores 5/15/50', CAKTO_TIERS.map((t) => t.amount).join(',') === '5,15,50');
check('offer ids distintos', new Set(CAKTO_TIERS.map((t) => t.offerId)).size === 3);
check('host é https pay.cakto.com.br', CAKTO_CHECKOUT_HOST === 'https://pay.cakto.com.br');
check('url do tier min', tierCheckoutUrl(CAKTO_TIERS[0]!) === 'https://pay.cakto.com.br/xear8ps');
check('url do fundador', CAKTO_FOUNDER_CHECKOUT_URL === `https://pay.cakto.com.br/${CAKTO_OFFER_FOUNDER}`);
check('preço fundador 9.90', CAKTO_FOUNDER_PRICE === 9.9);
check('produto fundador UUID', /^[0-9a-f-]{36}$/.test(CAKTO_PRODUCT_FOUNDER_ID));
check('isCaktoCheckoutUrl aceita oficial', isCaktoCheckoutUrl(caktoCheckoutUrl('abc123')));
check('isCaktoCheckoutUrl rejeita http', isCaktoCheckoutUrl('http://pay.cakto.com.br/abc') === false);
check('isCaktoCheckoutUrl rejeita host estranho', isCaktoCheckoutUrl('https://evil.example.com/abc') === false);
check('isCaktoCheckoutUrl rejeita lixo', isCaktoCheckoutUrl('not a url') === false);
check('encode de offer id', caktoCheckoutUrl('a b') === 'https://pay.cakto.com.br/a%20b');

/* ============================== NOME NO MURAL ============================== */

console.log('== formatSupporterName (privacidade do mural) ==');
check('nome completo → 1º + inicial', formatSupporterName('Clodoaldo Conceicao Silva') === 'Clodoaldo S.');
check('dois nomes', formatSupporterName('Maria Santos') === 'Maria S.');
check('nome único capitalizado', formatSupporterName('ana') === 'Ana');
check('partícula final não vira inicial', formatSupporterName('João da') === 'João');
check('partícula no meio é pulada', formatSupporterName('Maria dos Santos Lima') === 'Maria L.');
check('espaços extras', formatSupporterName('  Pedro   Henrique  Oliveira  ') === 'Pedro O.');
check('vazio → Apoiador', formatSupporterName('') === 'Apoiador');
check('undefined-ish → Apoiador', formatSupporterName(undefined as unknown as string) === 'Apoiador');
check('maiúsculas preservadas', formatSupporterName('ANA COSTA') === 'ANA C.');

console.log('== initialsOf (avatar) ==');
check('duas iniciais', initialsOf('Clodoaldo S.') === 'CS');
check('nome único → 1 letra', initialsOf('Ana') === 'A');
check('vazio → ?', initialsOf('') === '?');
check('múltiplas palavras → 1ª+última', initialsOf('Maria dos Santos Lima') === 'ML');

/* ============================== REGRA ANTI-INADIMPLÊNCIA ============================== */

console.log('== founderEligible (regra do mural) ==');
const NOW = 1_800_000_000_000;
check('carência = 7 dias', FOUNDER_GRACE_MS === 7 * 24 * 60 * 60 * 1000);
check('ativa → no mural', founderEligible('active', null, NOW) === true);
check('late dentro da carência → no mural', founderEligible('late', NOW - 3 * 86_400_000, NOW) === true);
check('late fora da carência → fora', founderEligible('late', NOW - 8 * 86_400_000, NOW) === false);
check('late no limite exato → fora', founderEligible('late', NOW - FOUNDER_GRACE_MS, NOW) === false);
check('late sem referência → no mural (benefício da dúvida)', founderEligible('late', null, NOW) === true);
check('canceled → fora', founderEligible('canceled', NOW, NOW) === false);
check('expired → fora', founderEligible('expired', NOW, NOW) === false);
check('paused → fora', founderEligible('paused', NOW, NOW) === false);
check('inactive → fora', founderEligible('inactive', NOW, NOW) === false);
check('trial → fora', founderEligible('trial', NOW, NOW) === false);
check('status desconhecido → fora', founderEligible('weird', NOW, NOW) === false);

/* ============================== FORMAT SINCE ============================== */

console.log('== formatSince (mês/ano pt-BR) ==');
check('jan/2026', formatSince(Date.UTC(2026, 0, 15)) === 'jan/2026');
check('dez/2026', formatSince(Date.UTC(2026, 11, 1)) === 'dez/2026');

/* ============================== WEBHOOK ============================== */

console.log('== Eventos de webhook (shape) ==');
check('evento válido com data', looksLikeCaktoEvent({ event: 'purchase_approved', data: { refId: 'X1' } }) === true);
check('evento válido com id direto', looksLikeCaktoEvent({ event: 'subscription_created', id: 'abc' }) === true);
check('sem event → inválido', looksLikeCaktoEvent({ data: {} }) === false);
check('sem data → inválido', looksLikeCaktoEvent({ event: 'x' }) === false);
check('não-objeto → inválido', looksLikeCaktoEvent('teste') === false);
check('null → inválido', looksLikeCaktoEvent(null) === false);

/* ============================== ESCOPO DR ============================== */

console.log('== Escopo: somente produtos do Diário da Riqueza ==');
check('isDrProductId aceita id do fundador', isDrProductId(CAKTO_PRODUCT_FOUNDER_ID));
check('isDrProductId rejeita id desconhecido', !isDrProductId('b6fa67da-2b49-4611-a73c-fb9751d28e98'));
check('isDrProductId rejeita não-string', !isDrProductId(123) && !isDrProductId(null) && !isDrProductId(undefined));
check('isDrProductName cobre nome com acento', isDrProductName('Apoiador Fundador — Diário da Riqueza'));
check('isDrProductName cobre sem acento', isDrProductName('Diario da Riqueza — Apoio'));
check('isDrProductName rejeita outros apps', !isDrProductName('Destrava') && !isDrProductName('ResíduoZero PRO') && !isDrProductName('PsicoRisk'));
check('isDrProductName rejeita não-string', !isDrProductName(undefined) && !isDrProductName(42));
check('caktoProductIdOf extrai de objeto', caktoProductIdOf({ id: 'abc', name: 'X' }) === 'abc');
check('caktoProductIdOf aceita string', caktoProductIdOf('uuid-1') === 'uuid-1');
check('caktoProductIdOf rejeita vazio/objeto sem id', caktoProductIdOf('') === null && caktoProductIdOf({}) === null && caktoProductIdOf(undefined) === null);
check('pedido de outro app é reconhecível como fora', !isDrProductId(caktoProductIdOf({ id: 'b6fa67da-2b49-4611-a73c-fb9751d28e98' })));
check('pedido DR (product objeto) é reconhecível como dentro', isDrProductId(caktoProductIdOf({ id: CAKTO_PRODUCT_FOUNDER_ID })));

/* ============================== RESULTADO ============================== */

console.log('==========================================');
console.log(`RESULTADO: ${passed} passaram, ${failed} falharam`);
console.log('==========================================');
if (failed > 0) {
  console.error('Falhas:', failures.join(' | '));
  process.exit(1);
}
