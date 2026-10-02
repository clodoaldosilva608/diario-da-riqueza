import { NextResponse } from 'next/server';
import { removeSubscription } from '@/lib/push-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/push/unsubscribe — remove a inscrição deste navegador */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { endpoint?: string };
    if (!body.endpoint) {
      return NextResponse.json({ ok: false, error: 'endpoint ausente' }, { status: 400 });
    }
    await removeSubscription(body.endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo inválido.' }, { status: 400 });
  }
}
