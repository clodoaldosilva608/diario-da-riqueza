import { NextResponse } from 'next/server';
import { getVault, putVault, syncPersistenceMode } from '@/lib/sync-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/sync?vaultId=DR-XXXX-XXXX-XXXX
 * → { found, updatedAt?, iv?, blob? } — envelope cifrado (E2E).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vaultId = searchParams.get('vaultId') ?? '';
  try {
    const vault = await getVault(vaultId);
    if (!vault) return NextResponse.json({ found: false });
    return NextResponse.json({
      found: true,
      updatedAt: vault.updatedAt,
      iv: vault.iv,
      blob: vault.blob,
      persistence: syncPersistenceMode(),
    });
  } catch {
    return NextResponse.json({ found: false });
  }
}

/**
 * PUT /api/sync — sobe o envelope cifrado do cofre.
 * Corpo: { vaultId, iv, blob } (base64 do AES-GCM; a senha nunca trafega).
 */
export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { vaultId?: string; iv?: string; blob?: string };
    if (!body.vaultId || !body.iv || !body.blob) {
      return NextResponse.json({ ok: false, error: 'Campos ausentes.' }, { status: 400 });
    }
    const ok = await putVault(body.vaultId, body.iv, body.blob);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: 'Código de cofre inválido ou blob maior que 5 MB.' },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      updatedAt: new Date().toISOString(),
      persistence: syncPersistenceMode(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo inválido.' }, { status: 400 });
  }
}
