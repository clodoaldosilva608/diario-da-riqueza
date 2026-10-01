/**
 * /admin/login — porta do painel administrativo.
 *
 * Página pública (única do admin sem sessão): formulário de senha única
 * server-side. Sem env vars configuradas mostra aviso "painel não
 * configurado" (fail-closed) — nada de credenciais no bundle.
 */

import { cookies, } from 'next/headers';
import { redirect } from 'next/navigation';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { loginAction } from '../actions';
import { adminConfigured, verifySessionValue } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Painel — Diário da Riqueza',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  // Já logado → direto ao painel
  const store = await cookies();
  if (verifySessionValue(store.get('dr_admin')?.value)) {
    redirect('/admin');
  }
  const { erro } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10">
          <KeyRound className="h-7 w-7 text-gold" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-center font-display text-xl font-bold">
          Painel administrativo
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Diário da Riqueza — área restrita do operador
        </p>

        {!adminConfigured() ? (
          <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-amber-500">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              Painel não configurado
            </p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Defina <code className="font-mono text-xs">ADMIN_PASSWORD</code> e{' '}
              <code className="font-mono text-xs">ADMIN_SESSION_SECRET</code> nas
              variáveis de ambiente do servidor para habilitar o acesso.
            </p>
          </div>
        ) : (
          <form action={loginAction} className="mt-6 space-y-3">
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-semibold"
              >
                Senha do operador
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20"
                aria-describedby={erro ? 'login-erro' : undefined}
              />
            </div>
            {erro ? (
              <p
                id="login-erro"
                role="alert"
                className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500"
              >
                {erro === 'config'
                  ? 'Painel não configurado no servidor.'
                  : 'Senha incorreta. Tente novamente.'}
              </p>
            ) : null}
            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-gold text-base font-semibold text-black transition-colors hover:bg-gold-light"
            >
              Entrar no painel
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Sessão expira em 8 horas · acesso monitorado
        </p>
      </div>
    </main>
  );
}
