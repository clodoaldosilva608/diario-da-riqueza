/**
 * GET /api/announcements — feed público do Portal de Notícias.
 *
 * Retorna apenas os avisos ATIVOS (mais recentes primeiro), sem nada de
 * mídia inline — o cliente busca os binários em /api/announcements/media
 * sob demanda, então este payload é sempre pequeno.
 *
 * no-store de propósito: quando o criador publica/desativa um aviso no
 * painel, a dashboard de TODOS os usuários reflete na próxima visita
 * (sem esperar cache de CDN expirar).
 */

import { NextResponse } from 'next/server';
import { listAnnouncements } from '@/lib/announcements-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const all = await listAnnouncements();
  const active = all
    .filter((a) => a.active)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return NextResponse.json(
    { count: active.length, announcements: active },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
