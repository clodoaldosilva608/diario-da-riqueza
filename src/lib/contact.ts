/**
 * Diário da Riqueza — Contato e apoio ao projeto
 *
 * Centraliza os dados de WhatsApp e Pix usados nos botões da dashboard,
 * na landing page e no rodapé. Nenhuma dessas informações é enviada a
 * analytics ou servidores — os links são abertos direto no app do usuário.
 *
 * Segurança do Pix (regras do projeto):
 * - Apenas exibir a chave e permitir cópia.
 * - Não registrar a chave em analytics, não coletar dados bancários,
 *   não criar cobranças automáticas e não disparar pagamentos.
 */

/* ============================== WHATSAPP ============================== */

/** Número no formato internacional sem símbolos (padrão wa.me) */
export const WHATSAPP_NUMBER = '5581920051068';

/** Número formatado para exibição legível */
export const WHATSAPP_NUMBER_DISPLAY = '+55 81 92005-1068';

/** Mensagem inicial pré-preenchida (o usuário pode editar no WhatsApp) */
export const WHATSAPP_MESSAGE =
  'Olá! Conheci o Diário da Riqueza e gostaria de saber mais sobre o projeto.';

/** Link wa.me com mensagem pré-preenchida */
export const WHATSAPP_URL = buildWhatsAppUrl(WHATSAPP_MESSAGE);

/**
 * Constrói o link wa.me com mensagem pré-preenchida.
 * No desktop abre o WhatsApp Web em nova aba; no celular abre o aplicativo.
 */
export function buildWhatsAppUrl(message: string = WHATSAPP_MESSAGE): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/* ============================== PIX ============================== */

/** Chave Pix (tipo telefone) no formato legível para exibição */
export const PIX_KEY_DISPLAY = '+55 81 971133707';

/** Chave Pix normalizada (+55 + DDD + número) — valor usado ao copiar */
export const PIX_KEY_NORMALIZED = '+5581971133707';

/**
 * BR Code oficial ("Pix copia e cola") gerado pelo banco do criador do projeto.
 * O QR Code do modal é renderizado a partir deste payload exato, pré-validado:
 * CRC16-CCITT recalculado confere (4614) e o PNG é verificado por decodificação
 * (scripts/generate_pix_qr.py). Contém chave UUID aleatória do banco, recebedor
 * e cidade — nada de valor ou cobrança automática (QR estático, valor livre).
 */
export const PIX_BR_CODE =
  '00020126580014BR.GOV.BCB.PIX0136bde7ca55-faa9-4589-8a0f-abe387172552' +
  '5204000053039865802BR5925Clodoaldo Conceicao Silva6009SAO PAULO' +
  '62140510pMCJsdrOJX63044614';

/** Nome do recebedor que consta no BR Code (confirmação antes de pagar) */
export const PIX_RECEIVER_NAME = 'Clodoaldo Conceicao Silva';

/** Nome do projeto exibido no modal de apoio (não é o nome do favorecido no banco) */
export const PROJECT_NAME = 'Diário da Riqueza';

/** Texto de apresentação do modal de apoio */
export const PIX_SUPPORT_INTRO =
  'Gostou do Diário da Riqueza? Se quiser apoiar a continuidade do projeto, ' +
  'você pode contribuir com qualquer valor via Pix. O apoio é opcional e o ' +
  'acesso à ferramenta continua gratuito.';

/**
 * Normaliza uma chave Pix do tipo telefone para o padrão E.164 brasileiro
 * (+55 + DDD + número), aceitando as variações mais comuns de digitação:
 *
 *   "81 971133707"          → "+5581971133707"
 *   "+55 81 971133707"      → "+5581971133707"
 *   "(81) 97113-3707"       → "+5581971133707"
 *   "5581971133707"         → "+5581971133707"
 *
 * Sem DDI informado, assume +55 (chave nacional). Retorna '' se vazio.
 */
export function normalizePixPhoneKey(raw: string): string {
  const digits = (raw ?? '').replace(/\D+/g, '');
  if (!digits) return '';
  // 13 dígitos com prefixo 55 = DDI + DDD + número → remove o DDI
  const local =
    digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits;
  return `+55${local}`;
}
