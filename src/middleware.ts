import { NextRequest, NextResponse } from 'next/server';

/**
 * Consolidação de domínio: tudo aponta para o host canônico.
 *
 * Porquê: o projeto já foi acessado por dois domínios da Vercel
 * (diario-da-riqueza.vercel.app e diariodariqueza.vercel.app). Como o app é
 * local-first, localStorage e IndexedDB vivem POR ORIGEM — quem alterna
 * entre os dois endereços aparece como usuário novo e "precisa criar outra
 * conta". O 308 permanente envia TODO o tráfego para um único host, unindo
 * a experiência (e preservando caminho + query, ex.: /landing).
 *
 * Localhost (dev) e endereços locais não são redirecionados.
 */

const CANONICAL_HOST = 'diariodariqueza.vercel.app';

function isLocalHost(host: string): boolean {
  return (
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('[::1]') ||
    host.endsWith('.local') ||
    host.startsWith('192.168.') ||
    host.startsWith('10.')
  );
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase();
  if (host === CANONICAL_HOST || isLocalHost(host)) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.protocol = 'https:';
  url.host = CANONICAL_HOST;
  url.port = '';
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
