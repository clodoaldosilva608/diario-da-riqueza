import { NextResponse } from 'next/server';
import { getVapidPublicKey, isPushConfigured } from '@/lib/push';
import { pushPersistenceMode } from '@/lib/push-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/push/status — estado público do sistema de push.
 * O cliente usa `configured` para mostrar/ocultar a UI e `publicKey`
 * para a inscrição (applicationServerKey, base64url).
 */
export async function GET() {
  return NextResponse.json({
    configured: isPushConfigured(),
    publicKey: getVapidPublicKey(),
    persistence: pushPersistenceMode(),
  });
}
