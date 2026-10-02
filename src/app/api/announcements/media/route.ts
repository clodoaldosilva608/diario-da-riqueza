/**
 * GET /api/announcements/media?k=<chave>&name=<nome> — binários do portal.
 *
 * Política de conteúdo deliberada (segurança same-origin):
 * - IMAGENS conhecidas → Content-Type correto + inline (o banner exibe).
 * - PDF → inline (visualizador do browser; scripts de PDF ficam no sandbox
 *   do viewer).
 * - QUALQUER outra coisa (zip, docx, mp3, desconhecido…) → application/
 *   octet-stream + Content-Disposition attachment: força DOWNLOAD, nunca
 *   renderização no origen. SVG/HTML/JS sequer passam no upload
 *   (whitelist de extensão nas server actions) — defesa em profundidade.
 * - Cache imutável: a chave é um UUID e o conteúdo nunca muda.
 * - Nome de download sanitizado via query `name` (o painel envia o nome
 *   original já sanitizado; aqui só strip de aspas/controle).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMedia } from '@/lib/announcements-store';

export const dynamic = 'force-dynamic';

const INLINE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  pdf: 'application/pdf',
};

function sanitizeName(raw: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/[\r\n"\\]/g, '')
    .replace(/[\u0000-\u001f]/g, '')
    .slice(0, 120);
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('k') ?? '';
  if (!key) {
    return NextResponse.json({ error: 'chave ausente' }, { status: 400 });
  }

  const media = await getMedia(key);
  if (!media) {
    return NextResponse.json({ error: 'mídia não encontrada' }, { status: 404 });
  }

  const mime = INLINE_MIME[media.ext];
  const inline = Boolean(mime);
  const contentType = mime ?? 'application/octet-stream';

  const name = sanitizeName(req.nextUrl.searchParams.get('name'));
  const filename = name || `arquivo.${media.ext}`;
  const disposition = inline ? 'inline' : 'attachment';

  const body = new Uint8Array(media.buf);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(media.buf.byteLength),
      'Content-Disposition': `${disposition}; filename="${filename}"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
