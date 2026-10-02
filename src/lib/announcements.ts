/**
 * Portal de Notícias — tipos e helpers COMPARTILHADOS (client-safe).
 *
 * O criador publica "avisos" no painel /admin/noticias; os avisos ATIVOS
 * aparecem como banner na Dashboard de todos os usuários. Este módulo
 * define o formato do dado e os limites aceitos — sem nada de servidor
 * (o acesso a disco fica em announcements-store.ts, server-only).
 *
 * Mídia (imagem/arquivo) NUNCA vai inline no JSON: o binário é gravado
 * em data/media/<chave> e o aviso guarda só a referência (key/name/size).
 * O cliente monta a URL com mediaUrl() → /api/announcements/media?k=…
 */

/** Referência a um arquivo publicado junto do aviso (imagem ou anexo). */
export interface AnnouncementMedia {
  /** Chave do binário em data/media (UUID + extensão, ex.: "ab12….png") */
  key: string;
  /** Nome original do arquivo (sanitizado), usado no download/exibição */
  name: string;
  /** Tamanho em bytes (para exibir "1,2 MB" e validar no cliente) */
  size: number;
}

/** Aviso completo, como persistido em data/announcements.json. */
export interface Announcement {
  id: string;
  title: string;
  message: string;
  /** Link opcional (http/https) exibido como botão no banner */
  linkUrl?: string;
  /** Rótulo do botão do link (padrão: "Ver mais") */
  linkLabel?: string;
  /** Imagem opcional exibida no banner */
  image?: AnnouncementMedia;
  /** Anexo opcional (PDF, planilha…) oferecido para download */
  file?: AnnouncementMedia;
  /** Ativo = aparece na dashboard de todos; rascunho = só no painel */
  active: boolean;
  /** ISO strings */
  createdAt: string;
  updatedAt: string;
}

/* ============================== LIMITES ============================== */

export const ANNOUNCEMENT_LIMITS = {
  /** Título: curto, cabe em uma linha do banner */
  title: 120,
  /** Mensagem do aviso (textarea no painel) */
  message: 4000,
  /** Rótulo do botão do link */
  linkLabel: 60,
  /** Imagem: 2 MB — mais que isso estoura o corpo das server actions */
  imageMaxBytes: 2 * 1024 * 1024,
  /** Anexo: 3 MB */
  fileMaxBytes: 3 * 1024 * 1024,
  /** Máximo de avisos guardados (publicados + rascunhos) */
  maxItems: 50,
  /** Extensões aceitas para IMAGEM (sem SVG: pode carregar script) */
  imageExts: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'],
  /**
   * Extensões aceitas para ANEXO. Bloqueio explícito de tudo que o
   * browser poderia executar ou renderizar como HTML no MESMO ORIGEM
   * (html/svg/js) — a rota de mídia entrega attachment + octet-stream
   * para o que não é imagem/PDF conhecido.
   */
  fileExts: [
    'pdf', 'txt', 'csv', 'md', 'doc', 'docx', 'xls', 'xlsx', 'ppt',
    'pptx', 'zip', 'rar', '7z', 'png', 'jpg', 'jpeg', 'webp', 'gif',
    'mp3', 'm4a', 'wav', 'ogg', 'mp4', 'webm', 'json',
  ],
} as const;

/** Quantidade máxima de avisos exibidos por vez no banner da dashboard. */
export const BANNER_MAX_ITEMS = 3;

/* ============================== FORM (painel) ============================== */

/**
 * Estado devolvido pelas server actions do formulário (criar/editar).
 * Vive aqui (client-safe) porque arquivos 'use server' só podem exportar
 * funções async — o painel importa ANN_FORM_IDLE como estado inicial.
 */
export interface AnnFormState {
  status: 'idle' | 'ok' | 'error';
  message: string;
  /** Marca temporal do evento (útil para key/animções) */
  at: number;
}

export const ANN_FORM_IDLE: AnnFormState = { status: 'idle', message: '', at: 0 };

/* ============================== HELPERS ============================== */

/** Formata bytes em texto curto pt-BR (ex.: "1,4 MB"). */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const v = n / 1024 ** i;
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${units[i]}`;
}

/** URL pública do binário de mídia (com nome de download opcional). */
export function mediaUrl(key: string, name?: string): string {
  const k = encodeURIComponent(key);
  const n = name ? `&name=${encodeURIComponent(name)}` : '';
  return `/api/announcements/media?k=${k}${n}`;
}

/** Data curta pt-BR (ex.: "02/10 14:33") para chips do painel/banner. */
export function shortDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ====================== DESCARTES DO BANNER (cliente) ====================== */

/**
 * Quais avisos o usuário FECHOU no banner. Guardamos id → updatedAt:
 * se o criador editar/republicar o aviso (updatedAt muda), ele volta a
 * aparecer para quem já tinha fechado — intencional, é o mecanismo de
 * "re-notificar". Chave versionada para invalidar formatos antigos.
 */
export const DISMISSED_KEY = 'dr_announcements_dismissed_v1';

export type DismissedMap = Record<string, string>;

/** Lê o mapa de descartes do localStorage (vazio quando indisponível). */
export function readDismissed(): DismissedMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: DismissedMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === 'string' && typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** Persiste o mapa de descartes (best-effort; modo privado pode falhar). */
export function writeDismissed(map: DismissedMap): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
  } catch {
    /* quota/privacidade: o aviso apenas volta na próxima visita */
  }
}
