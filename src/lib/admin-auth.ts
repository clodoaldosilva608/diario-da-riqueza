/**
 * Diário da Riqueza — autenticação do painel /admin (SERVER-ONLY).
 *
 * ⚠️ NUNCA importar em código client.
 *
 * Modelo: senha única em env var (ADMIN_PASSWORD) → cookie de sessão
 * assinado com HMAC-SHA256 (ADMIN_SESSION_SECRET) + expiração de 8h.
 * - Cookie: httpOnly (inacessível a JS), sameSite=lax, secure em produção.
 * - Comparação de senha e de HMAC sempre em tempo constante.
 * - Sem usuários/roles: é um painel de um único operador (o criador).
 * - Fail-closed: sem env vars configuradas, login negado e páginas
 *   protegidas redirecionam para /admin/login.
 *
 * O painel é desacoplado do app: rotas próprias, layout próprio, sem
 * nenhum link público apontando para cá e bloqueado no robots.txt.
 */

import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const ADMIN_COOKIE = 'dr_admin';
/** Sessão de 8 horas */
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function timingSafeStrEq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Senha do operador configurada? (fail-closed quando ausente) */
export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

/** Confere a senha do operador em tempo constante */
export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeStrEq(input, expected);
}

/** Valor do cookie de sessão: "{expiraEmMs}.{hmac}" */
function makeSessionValue(now: number): string {
  const expiresAt = String(now + SESSION_TTL_MS);
  const secret = process.env.ADMIN_SESSION_SECRET!;
  return `${expiresAt}.${sign(expiresAt, secret)}`;
}

/** O valor do cookie é uma sessão válida e não expirada? */
export function verifySessionValue(value: string | undefined): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !value) return false;
  const dot = value.indexOf('.');
  if (dot <= 0) return false;
  const expiresAt = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  if (!/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Date.now()) return false;
  return timingSafeStrEq(mac, sign(expiresAt, secret));
}

/** Cookie de sessão recém-emitido (opções prontas para cookies().set) */
export function sessionCookieOptions(now: number) {
  return {
    name: ADMIN_COOKIE,
    value: makeSessionValue(now),
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  };
}

/**
 * Guarda das páginas protegidas: exige sessão válida ou redireciona ao login.
 * Usar no topo de cada server component / server action do /admin.
 */
export async function requireAdmin(): Promise<void> {
  const store = await cookies();
  if (!verifySessionValue(store.get(ADMIN_COOKIE)?.value)) {
    redirect('/admin/login');
  }
}
