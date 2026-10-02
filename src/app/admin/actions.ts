'use server';

/**
 * Server Actions do painel /admin — TODAS exigem sessão válida (ou são
 * o próprio login). Executam apenas server-side; nada de credenciais
 * Cakto chega ao cliente.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import {
  ADMIN_COOKIE, adminConfigured, checkCredentials, clearLoginFailures,
  loginBlocked, registerLoginFailure, requireAdmin, sessionCookieOptions,
} from '@/lib/admin-auth';
import { cancelSubscription } from '@/lib/cakto-server';
import {
  ANNOUNCEMENT_LIMITS, ANN_FORM_IDLE, type Announcement,
  type AnnouncementMedia, type AnnFormState,
} from '@/lib/announcements';
import {
  deleteMedia, listAnnouncements, saveAnnouncements, saveMedia,
} from '@/lib/announcements-store';

/** IP do chamador (atrás do proxy da Vercel) para o rate limit do login */
async function clientKey(): Promise<string> {
  const { headers } = await import('next/headers');
  const h = await headers();
  return (
    h.get('x-real-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'desconhecido'
  );
}

/** Login do operador — form action da página /admin/login */
export async function loginAction(formData: FormData): Promise<void> {
  if (!adminConfigured()) {
    redirect('/admin/login?erro=config');
  }
  const key = await clientKey();
  if (loginBlocked(key)) {
    redirect('/admin/login?erro=rate');
  }
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  if (!email || !password || !checkCredentials(email, password)) {
    registerLoginFailure(key);
    redirect('/admin/login?erro=1');
  }
  clearLoginFailures(key);
  const store = await cookies();
  store.set(sessionCookieOptions(Date.now()));
  redirect('/admin');
}

/** Logout — remove o cookie de sessão */
export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

/**
 * Cancela uma assinatura na Cakto (irreversível do lado da plataforma —
 * a UI pede confirmação explícita antes de chamar esta action).
 */
export async function cancelSubscriptionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  try {
    await cancelSubscription(id);
  } catch (e) {
    redirect(`/admin/assinaturas?erro=${encodeURIComponent(String(e))}`);
  }
  revalidatePath('/admin/assinaturas');
  redirect('/admin/assinaturas?ok=cancelada');
}

/* ==========================================================================
 * PORTAL DE NOTÍCIAS — CRUD de avisos exibidos na dashboard dos usuários.
 *
 * Fluxo: o formulário do /admin/noticias envia multipart (texto + arquivos)
 * para estas actions; a mídia é gravada via announcements-store e o JSON
 * guarda apenas referências. TODAS as actions passam por requireAdmin().
 * (AnnFormState e ANN_FORM_IDLE vivem em lib/announcements.ts — arquivos
 * 'use server' só podem exportar funções async.)
 * ========================================================================== */

/** Extensão minúscula e segura a partir do nome do arquivo. */
function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot < 0 || dot === name.length - 1) return '';
  return name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Nome original sanitizado (sem caminho, controle, aspas; ≤ 80 chars). */
function safeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'arquivo';
  const clean = base
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/["'\\]/g, '')
    .replace(/[^a-zA-Z0-9._ ()+-]/g, '_')
    .trim();
  return (clean || 'arquivo').slice(-80);
}

const MAX_BYTES = {
  image: ANNOUNCEMENT_LIMITS.imageMaxBytes,
  file: ANNOUNCEMENT_LIMITS.fileMaxBytes,
} as const;

type MediaKind = keyof typeof MAX_BYTES;

/**
 * Extrai e valida um campo de arquivo do FormData. Vazio → undefined
 * (nada a fazer). Rejeita extensão fora da whitelist e tamanho acima do
 * limite — a mensagem fala a linguagem do operador.
 */
async function extractMedia(
  fd: FormData,
  field: string,
  kind: MediaKind,
): Promise<{ media?: AnnouncementMedia; error?: string }> {
  const f = fd.get(field);
  if (!(f instanceof File) || f.size === 0) return {};

  const allowed =
    kind === 'image' ? ANNOUNCEMENT_LIMITS.imageExts : ANNOUNCEMENT_LIMITS.fileExts;
  const ext = extOf(f.name);
  if (!ext || !(allowed as readonly string[]).includes(ext)) {
    return {
      error:
        kind === 'image'
          ? `Imagem em formato não suportado (${ext || 'sem extensão'}). Use: ${allowed.join(', ')}.`
          : `Arquivo em formato não suportado (${ext || 'sem extensão'}). Use: ${allowed.slice(0, 8).join(', ')}…`,
    };
  }
  const max = MAX_BYTES[kind];
  if (f.size > max) {
    const mb = Math.floor(max / 1024 / 1024);
    return { error: `Arquivo muito grande (máx. ${mb} MB): ${safeName(f.name)}` };
  }
  const buf = Buffer.from(await f.arrayBuffer());
  const key = await saveMedia(buf, ext);
  return { media: { key, name: safeName(f.name), size: f.size } };
}

/** Valida os campos de texto do aviso (título, mensagem, link). */
function parseTextFields(fd: FormData):
  | { ok: true; title: string; message: string; linkUrl?: string; linkLabel?: string }
  | { ok: false; error: string } {
  const title = String(fd.get('title') ?? '').trim().slice(0, ANNOUNCEMENT_LIMITS.title);
  const message = String(fd.get('message') ?? '').trim().slice(0, ANNOUNCEMENT_LIMITS.message);
  if (!title) return { ok: false, error: 'Informe um título para o aviso.' };
  if (!message) return { ok: false, error: 'Escreva o texto do aviso.' };

  const rawLink = String(fd.get('linkUrl') ?? '').trim();
  let linkUrl: string | undefined;
  if (rawLink) {
    try {
      const u = new URL(rawLink);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return { ok: false, error: 'O link deve começar com http:// ou https://.' };
      }
      linkUrl = u.toString().slice(0, 500);
    } catch {
      return { ok: false, error: 'O link informado não é uma URL válida.' };
    }
  }
  const linkLabel = String(fd.get('linkLabel') ?? '')
    .trim()
    .slice(0, ANNOUNCEMENT_LIMITS.linkLabel);

  return {
    ok: true,
    title,
    message,
    linkUrl,
    linkLabel: linkLabel || undefined,
  };
}

/**
 * Cria um aviso (publicado ou rascunho, conforme o switch "publicar").
 * Ação de estado do formulário de criação (useActionState).
 */
export async function createAnnouncementAction(
  _prev: AnnFormState,
  fd: FormData,
): Promise<AnnFormState> {
  await requireAdmin();

  const text = parseTextFields(fd);
  if (!text.ok) return { status: 'error', message: text.error, at: Date.now() };

  const image = await extractMedia(fd, 'image', 'image');
  if (image.error) return { status: 'error', message: image.error, at: Date.now() };
  const file = await extractMedia(fd, 'file', 'file');
  if (file.error) {
    if (image.media) await deleteMedia(image.media.key); // não órfão
    return { status: 'error', message: file.error, at: Date.now() };
  }

  const now = new Date().toISOString();
  const announcement: Announcement = {
    id: randomUUID(),
    title: text.title,
    message: text.message,
    linkUrl: text.linkUrl,
    linkLabel: text.linkLabel,
    image: image.media,
    file: file.media,
    active: fd.get('active') !== null,
    createdAt: now,
    updatedAt: now,
  };

  const list = await listAnnouncements();
  if (list.length >= ANNOUNCEMENT_LIMITS.maxItems) {
    if (image.media) await deleteMedia(image.media.key);
    if (file.media) await deleteMedia(file.media.key);
    return {
      status: 'error',
      message: `Limite de ${ANNOUNCEMENT_LIMITS.maxItems} avisos atingido — exclua algum antigo.`,
      at: Date.now(),
    };
  }
  list.unshift(announcement);
  await saveAnnouncements(list);

  revalidatePath('/admin/noticias');
  return {
    status: 'ok',
    message: announcement.active
      ? 'Aviso publicado! Ele já aparece na dashboard de todos os usuários.'
      : 'Rascunho salvo — ative quando quiser exibir na dashboard.',
    at: Date.now(),
  };
}

/**
 * Edita um aviso existente. Regras de mídia: novo upload substitui o
 * anterior (antigo é apagado do disco); checkbox "remover" limpa sem
 * substituir; campos vazios mantêm o que já existe.
 */
export async function updateAnnouncementAction(
  _prev: AnnFormState,
  fd: FormData,
): Promise<AnnFormState> {
  await requireAdmin();

  const id = String(fd.get('id') ?? '').trim();
  const list = await listAnnouncements();
  const current = list.find((a) => a.id === id);
  if (!current) {
    return { status: 'error', message: 'Aviso não encontrado — recarregue a página.', at: Date.now() };
  }

  const text = parseTextFields(fd);
  if (!text.ok) return { status: 'error', message: text.error, at: Date.now() };

  const image = await extractMedia(fd, 'image', 'image');
  if (image.error) return { status: 'error', message: image.error, at: Date.now() };
  const file = await extractMedia(fd, 'file', 'file');
  if (file.error) {
    if (image.media) await deleteMedia(image.media.key);
    return { status: 'error', message: file.error, at: Date.now() };
  }

  const removeImage = fd.get('removeImage') !== null;
  const removeFile = fd.get('removeFile') !== null;

  // Mídia antiga que será descartada (substituída ou removida de fato)
  const staleKeys: string[] = [];
  let nextImage = current.image;
  if (image.media) {
    if (current.image) staleKeys.push(current.image.key);
    nextImage = image.media;
  } else if (removeImage) {
    if (current.image) staleKeys.push(current.image.key);
    nextImage = undefined;
  }
  let nextFile = current.file;
  if (file.media) {
    if (current.file) staleKeys.push(current.file.key);
    nextFile = file.media;
  } else if (removeFile) {
    if (current.file) staleKeys.push(current.file.key);
    nextFile = undefined;
  }

  const wasActive = current.active;
  const nextActive = fd.get('active') !== null;

  current.title = text.title;
  current.message = text.message;
  current.linkUrl = text.linkUrl;
  current.linkLabel = text.linkLabel;
  current.image = nextImage;
  current.file = nextFile;
  current.active = nextActive;
  // Reativar (ou editar um publicado) re-notifica: updatedAt novo faz o
  // banner reaparecer para quem já tinha fechado.
  current.updatedAt = new Date().toISOString();

  const idx = list.findIndex((a) => a.id === id);
  list[idx] = current;
  await saveAnnouncements(list);
  await Promise.all(staleKeys.map((k) => deleteMedia(k)));

  revalidatePath('/admin/noticias');
  const changedVisibility = nextActive !== wasActive;
  return {
    status: 'ok',
    message: nextActive
      ? changedVisibility
        ? 'Aviso ativado — voltou a aparecer na dashboard de todos.'
        : 'Aviso atualizado — a dashboard dos usuários já mostra a versão nova.'
      : 'Aviso desativado — saiu da dashboard dos usuários.',
    at: Date.now(),
  };
}

/** Liga/desliga a publicação de um aviso (botão do card). */
export async function toggleAnnouncementAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  const list = await listAnnouncements();
  const ann = list.find((a) => a.id === id);
  if (!ann) return;
  ann.active = !ann.active;
  // Ativar = re-notificar todo mundo (updatedAt novo desfaz o "fechar").
  ann.updatedAt = new Date().toISOString();
  await saveAnnouncements(list);
  revalidatePath('/admin/noticias');
}

/** Exclui um aviso e sua mídia (confirmado na UI com AlertDialog). */
export async function deleteAnnouncementAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  const list = await listAnnouncements();
  const ann = list.find((a) => a.id === id);
  if (!ann) return;
  const keys = [ann.image?.key, ann.file?.key].filter((k): k is string => Boolean(k));
  await saveAnnouncements(list.filter((a) => a.id !== id));
  await Promise.all(keys.map((k) => deleteMedia(k)));
  revalidatePath('/admin/noticias');
}
