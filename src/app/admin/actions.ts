'use server';

/**
 * Server Actions do painel /admin — TODAS exigem sessão válida (ou são
 * o próprio login). Executam apenas server-side; nada de credenciais
 * Cakto chega ao cliente.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  ADMIN_COOKIE, adminConfigured, checkCredentials, clearLoginFailures,
  loginBlocked, registerLoginFailure, requireAdmin, sessionCookieOptions,
} from '@/lib/admin-auth';
import { cancelSubscription } from '@/lib/cakto-server';

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
