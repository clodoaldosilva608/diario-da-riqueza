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

/* ============================== SITE PESSOAL / CRIADORES PARCEIROS ============================== */

/**
 * Site pessoal do criador — vitrine de todos os projetos desenvolvidos
 * por conta própria. Links abertos em nova aba (sempre com
 * rel="noopener noreferrer" nos componentes, cortando window.opener).
 */
export const PERSONAL_SITE_URL = 'https://clodoaldo.vercel.app/';

/** Página "Criadores Parceiros" — conhecer e apoiar os outros apps */
export const PARTNERS_URL = 'https://clodoaldo.vercel.app/criadores-parceiros';

/** Texto do pop-up de divulgação do site (contexto: projetos independentes) */
export const SITE_PROMO_INTRO =
  'Todos os meus projetos são desenvolvidos por conta própria, apenas com o ' +
  'apoio voluntário de diversas pessoas. O objetivo é sempre aprender e ' +
  'buscar oferecer as aplicações de forma gratuita. Visite meu site para ' +
  'ficar por dentro de tudo o que estou desenvolvendo.';

/** Texto do pop-up de apoio (pedido discreto, valor livre) */
export const SUPPORT_NUDGE_INTRO =
  'O Diário da Riqueza é gratuito e feito por uma única pessoa, nas horas ' +
  'livres. Se ele está te ajudando, considere apoiar com qualquer valor — ' +
  'de R$ 1 ao que você puder. É o apoio voluntário que mantém o projeto no ' +
  'ar e permite que ele continue 100% gratuito para todos.';

/* ============================== REDES SOCIAIS DO CRIADOR ============================== */

/**
 * Redes sociais — as mesmas do rodapé do site pessoal
 * (clodoaldo.vercel.app), mantidas aqui para o rodapé da landing page,
 * na seção do criador e no pop-up "siga nas redes".
 * Links sempre abertos em nova aba com rel="noopener noreferrer".
 */
export const INSTAGRAM_URL = 'https://www.instagram.com/clodoaldo_c_silva';

/** @ no Instagram */
export const INSTAGRAM_HANDLE = '@clodoaldo_c_silva';

export const TIKTOK_URL = 'https://www.tiktok.com/@clodoald_c_silva';

/** @ no TikTok */
export const TIKTOK_HANDLE = '@clodoald_c_silva';

export const YOUTUBE_URL = 'https://youtube.com/@clodoaldosilvaa';

/** @ no YouTube */
export const YOUTUBE_HANDLE = '@clodoaldosilvaa';

/** E-mail público de contato (o mesmo exibido no rodapé do site pessoal) */
export const CONTACT_EMAIL = 'clodoaldosilva608@gmail.com';

export const CONTACT_EMAIL_URL = `mailto:${CONTACT_EMAIL}`;

/** Página "bio" alternativa (link da árvore no rodapé do site pessoal) */
export const BIO_SITE_URL = 'https://bio.site/clodoadosilva';

export const LINKTREE_URL = 'https://linktr.ee/clodoaldo608';

/** Texto da seção "Conheça o criador" na landing page */
export const CREATOR_SECTION_INTRO =
  'O Diário da Riqueza é desenvolvido por Clodoaldo Silva — criador, ' +
  'desenvolvedor e estrategista digital que transforma ideias em produtos ' +
  'reais desde 2016. Conheça meu site para ver todos os projetos, serviços ' +
  'e conteúdos, e conheça também os outros apps independentes e gratuitos ' +
  'que estou desenvolvendo.';

/** Texto do pop-up "siga nas redes" (TikTok e Instagram) */
export const FOLLOW_INTRO =
  'Acompanhe os bastidores do desenvolvimento, dicas de uso do Diário da ' +
  'Riqueza e novidades sobre os próximos recursos. Seguir no TikTok e no ' +
  'Instagram é uma forma simples e gratuita de apoiar o projeto.';

/* ============================== COMPARTILHAR ============================== */

/** Link canônico da aplicação (o middleware redireciona o domínio antigo) */
export const SHARE_URL = 'https://diariodariqueza.vercel.app';

/** Assunto do compartilhamento por e-mail */
export const SHARE_SUBJECT = 'Diário da Riqueza — aplicação gratuita e offline';

/** Mensagem padrão de compartilhamento ("versão mais discreta", do criador) */
export const SHARE_TEXT =
  'A ideia do caderno é simples, mas poderosa: definir onde você quer chegar, ' +
  'acompanhar seus gastos e registrar o que está fazendo todos os dias. Eu ' +
  'organizei esse método em uma aplicação gratuita e offline para facilitar a ' +
  'rotina. Está aqui para quem quiser conhecer: https://diariodariqueza.vercel.app';

/** Texto curto do modal de compartilhar */
export const SHARE_INTRO =
  'Ajude mais pessoas a organizarem metas, gastos e hábitos. ' +
  'Escolha onde compartilhar:';

/** Perguntas e respostas do pop-up "Sobre o método e como ajudar" */
export const METHOD_FAQ = [
  {
    question: 'O método garante riqueza?',
    answer:
      'Não existe garantia de enriquecimento. A proposta é ajudar a pessoa a ter ' +
      'mais clareza sobre suas metas, finanças, estudos e hábitos. O resultado ' +
      'depende das decisões e da consistência de cada um. A ferramenta serve como ' +
      'apoio para acompanhar esse processo.',
  },
  {
    question: 'Como posso ajudar?',
    answer:
      'Você pode usar e compartilhar a aplicação. Se quiser apoiar diretamente o ' +
      'desenvolvimento, qualquer contribuição será muito bem-vinda. O acesso ' +
      'continua gratuito para todos.',
  },
] as const;

/**
 * Monta os alvos de compartilhamento web (abrem em nova aba — o componente
 * sempre usa rel="noopener noreferrer"). No celular o botão principal usa a
 * Web Share API, que mostra TODOS os apps instalados no dispositivo; esta
 * grade é o fallback universal (desktop) e atalho rápido.
 */
export function buildShareTargets(
  text: string,
  url: string,
): Array<{ name: string; href: string }> {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  const s = encodeURIComponent(SHARE_SUBJECT);
  return [
    { name: 'WhatsApp', href: `https://wa.me/?text=${t}%20${u}` },
    { name: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: 'X (Twitter)', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { name: 'E-mail', href: `mailto:?subject=${s}&body=${t}%20${u}` },
  ];
}

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
