/**
 * Testes unitários de src/lib/contact.ts — roda com: bun run scripts/test_contact.ts
 *
 * Cobre:
 * - normalização da chave Pix telefone (todas as variações de digitação comuns)
 * - link do WhatsApp (número + mensagem pré-preenchida encodada)
 * - garantias de mensagem/constantes usadas pela UI
 */

import {
  buildWhatsAppUrl, normalizePixPhoneKey,
  WHATSAPP_NUMBER, WHATSAPP_URL, WHATSAPP_MESSAGE,
  PIX_KEY_DISPLAY, PIX_KEY_NORMALIZED, normalizePixPhoneKey as norm,
  PROJECT_NAME, PIX_BR_CODE, PIX_RECEIVER_NAME,
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

/* ============================== 1. PIX ============================== */
console.log('\n[1] normalizePixPhoneKey');

const pixCases: Array<[string, string]> = [
  ['81 971133707', '+5581971133707'],
  ['+55 81 971133707', '+5581971133707'],
  ['(81) 97113-3707', '+5581971133707'],
  ['81.97113.3707', '+5581971133707'],
  ['5581971133707', '+5581971133707'],
  ['+5581971133707', '+5581971133707'],
  ['81199990000', '+5581199990000'], // outro DDD/número, 11 dígitos sem DDI
  ['', ''],
  ['   ', ''],
];

for (const [input, expected] of pixCases) {
  const got = norm(input);
  ok(got === expected, `normalize(${JSON.stringify(input)}) === ${expected}`, `recebido: ${got}`);
}

ok(
  normalizePixPhoneKey(PIX_KEY_DISPLAY) === PIX_KEY_NORMALIZED,
  `PIX_KEY_DISPLAY normaliza para PIX_KEY_NORMALIZED (${PIX_KEY_NORMALIZED})`,
);

/* ============================== 2. WHATSAPP ============================== */
console.log('\n[2] WhatsApp');

ok(WHATSAPP_NUMBER === '5581920051068', 'número wa.me correto (5581920051068)');
ok(WHATSAPP_URL.startsWith('https://wa.me/5581920051068?text='), 'URL começa com wa.me + número + ?text=');
ok(WHATSAPP_URL === buildWhatsAppUrl(WHATSAPP_MESSAGE), 'WHATSAPP_URL é o build com a mensagem padrão');

// A mensagem encodada deve decodificar de volta ao texto original
const decoded = decodeURIComponent(WHATSAPP_URL.split('?text=')[1] ?? '');
ok(decoded === WHATSAPP_MESSAGE, 'mensagem decodifica de volta ao texto original', `recebido: ${decoded}`);
ok(decoded.includes('Diário da Riqueza'), 'mensagem menciona o nome do projeto');

// Caracteres especiais críticos: espaço, ! e acentos devem estar encodados
ok(WHATSAPP_URL.includes('%20'), 'espaços encodados (%20)');
ok(WHATSAPP_URL.includes('%C3%A1'), '"á" encodado (%C3%A1)');

// URL customizada não altera o número
ok(buildWhatsAppUrl('teste').startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`), 'buildWhatsAppUrl mantém o número');

/* ============================== 3. CONSTANTES DE UI ============================== */
console.log('\n[3] constantes de exibição');

ok(PIX_KEY_DISPLAY === '+55 81 971133707', 'chave Pix exibida com formatação legível');
ok(PROJECT_NAME === 'Diário da Riqueza', 'nome do projeto correto no modal');

/* ============================== 4. BR CODE (QR PIX) ============================== */
console.log('\n[4] BR Code — payload do QR');

// CRC16-CCITT (0x1021/0xFFFF), padrão do BR Code — revalida a constante contra
// edições manuais acidentais: se alguém alterar o payload, o CRC para de bater.
function crc16CCITT(s: string): number {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc;
}

ok(PIX_BR_CODE.length === 157, `payload com 157 caracteres (recebido: ${PIX_BR_CODE.length})`);
ok(/^[\x20-\x7E]*$/.test(PIX_BR_CODE), 'payload 100% ASCII imprimível');
ok(PIX_BR_CODE.startsWith('000201'), 'começa com Payload Format Indicator 000201');
ok(PIX_BR_CODE.includes('BR.GOV.BCB.PIX'), 'contém a GUI oficial BR.GOV.BCB.PIX');
ok(PIX_BR_CODE.includes('Clodoaldo Conceicao Silva'), 'nome do recebedor no payload');
ok(PIX_BR_CODE.includes('SAO PAULO'), 'cidade do recebedor no payload');
ok(PIX_BR_CODE.includes('5303986'), 'moeda BRL (986) no payload');
ok(PIX_RECEIVER_NAME === 'Clodoaldo Conceicao Silva', 'constante PIX_RECEIVER_NAME conferida');

const crcEmbedded = PIX_BR_CODE.slice(-4);
const crcComputed = crc16CCITT(PIX_BR_CODE.slice(0, -4)).toString(16).toUpperCase().padStart(4, '0');
ok(crcEmbedded === crcComputed, `CRC16 embarcado ${crcEmbedded} == recalculado ${crcComputed}`);

// TLV íntegro: soma dos campos deve consumir o payload inteiro (sem sobras)
let cursor = 0;
let tlvOk = true;
while (cursor < PIX_BR_CODE.length) {
  const len = parseInt(PIX_BR_CODE.slice(cursor + 2, cursor + 4), 10);
  if (Number.isNaN(len) || cursor + 4 + len > PIX_BR_CODE.length) { tlvOk = false; break; }
  cursor += 4 + len;
}
ok(tlvOk && cursor === PIX_BR_CODE.length, 'estrutura TLV íntegra (campos sem truncamento/sobra)');

/* ============================== RESUMO ============================== */
console.log(`\n=== RESULTADO: ${passed} passaram, ${failed} falharam ===`);
process.exit(failed > 0 ? 1 : 0);
