/**
 * Diário da Riqueza — autenticação do painel /admin (SERVER-ONLY).
 *
 * ⚠️ NUNCA importar em código client.
 *
 * Modelo: credenciais em env vars (ADMIN_EMAIL + ADMIN_PASSWORD) →
 * cookie de sessão assinado com HMAC-SHA256 (ADMIN_SESSION_SECRET) +
 * expiração de 8h.
 * - Cookie: httpOnly (inacessível a JS), sameSite=lax, secure em produção.
 * - Comparação de senha, de e-mail e de HMAC sempre em tempo constante.
 * - Sem usuários/roles: é um painel de um único operador (o criador).
 * - Fail-closed: sem env vars configuradas, login negado e páginas
 *   protegidas redirecionam para /admin/login.
 * - Rate limit em memória no login (5 tentativas / 15 min por IP) para
 *   conter força-bruta — proteção primeira instância (por serverless).
 *
 * O painel é desacoplado do app: rotas próprias, layout próprio,
 * bloqueado no robots.txt.
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

/** Credenciais do operador configuradas? (fail-closed quando ausentes) */
export function adminConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_SESSION_SECRET,
  );
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Confere e-mail + senha do operador em tempo constante.
 * E-mail normalizado (trim + lowercase) antes da comparação.
 */
export function checkCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) return false;
  return (
    timingSafeStrEq(normalizeEmail(email), normalizeEmail(expectedEmail)) &&
    timingSafeStrEq(password, expectedPassword)
  );
}

/* =================== rate limit do login (1ª instância) =================== */

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginFailures = new Map<string, { count: number; firstAt: number }>();

/** A chave (IP) já estourou o limite de tentativas? */
export function loginBlocked(key: string): boolean {
  const entry = loginFailures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > LOGIN_WINDOW_MS) {
    loginFailures.delete(key);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

/** Registra uma tentativa falha; limpa janelas antigas ocasionalmente */
export function registerLoginFailure(key: string): void {
  // varredura oportunista: mantém o Map pequeno em instâncias longevas
  if (loginFailures.size > 500) {
    const now = Date.now();
    for (const [k, v] of loginFailures) {
      if (now - v.firstAt > LOGIN_WINDOW_MS) loginFailures.delete(k);
    }
  }
  const entry = loginFailures.get(key);
  if (!entry || Date.now() - entry.firstAt > LOGIN_WINDOW_MS) {
    loginFailures.set(key, { count: 1, firstAt: Date.now() });
    return;
  }
  entry.count += 1;
}

/** Sucesso no login — zera as tentativas da chave */
export function clearLoginFailures(key: string): void {
  loginFailures.delete(key);
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
