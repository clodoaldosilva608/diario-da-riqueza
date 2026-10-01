/**
 * Layout do painel /admin (grupo protegido) — exige sessão válida
 * (redireciona a /admin/login caso contrário) e renderiza o shell
 * profissional: sidebar fixa (desktop) com navegação por ícones + estado
 * ativo, rodapé da sidebar com "ver site"/logout; no mobile, topo com
 * navegação rolável. Totalmente desacoplado do app principal.
 */

import Link from 'next/link';
import { ExternalLink, LogOut } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-auth';
import { logoutAction } from '../actions';
import { AdminNav } from './nav';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Painel — Diário da Riqueza',
  robots: { index: false, follow: false },
};

export default async function AdminDashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-dvh bg-muted/20">
      <div className="mx-auto flex w-full max-w-[1700px]">
        {/* ============ SIDEBAR (desktop) ============ */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card/50 lg:flex">
          <div className="border-b border-border px-5 py-5">
            <Link href="/admin" className="font-display text-xl font-black tracking-tight">
              Painel <span className="gold-gradient-text">DR</span>
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Diário da Riqueza · operação
            </p>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <AdminNav variant="sidebar" />
          </div>

          <div className="space-y-1 border-t border-border px-3 py-4">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Ver o site
            </a>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sair
              </button>
            </form>
          </div>
        </aside>

        {/* ============ CONTEÚDO ============ */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topo mobile */}
          <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/admin" className="font-display text-lg font-black tracking-tight">
                Painel <span className="gold-gradient-text">DR</span>
              </Link>
              <div className="flex items-center gap-2">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir o site em nova aba"
                  title="Ver o site"
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    Sair
                  </button>
                </form>
              </div>
            </div>
            <div className="border-t border-border bg-background">
              <AdminNav variant="scroll" />
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            {children}
          </main>

          <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
            Painel administrativo do Diário da Riqueza · dados via API Cakto ·
            confidencial
          </footer>
        </div>
      </div>
    </div>
  );
}
