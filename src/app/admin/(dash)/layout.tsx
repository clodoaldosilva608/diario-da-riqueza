/**
 * Layout do painel /admin (grupo protegido) — exige sessão válida
 * (redireciona a /admin/login caso contrário) e renderiza o shell:
 * topo com navegação + logout. Totalmente desacoplado do app principal.
 */

import Link from 'next/link';
import {
  BarChart3, CreditCard, Crown, LogOut, Package, Users, Webhook, Wallet,
} from 'lucide-react';
import { requireAdmin } from '@/lib/admin-auth';
import { logoutAction } from '../actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Painel — Diário da Riqueza',
  robots: { index: false, follow: false },
};

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/vendas', label: 'Vendas', icon: CreditCard },
  { href: '/admin/assinaturas', label: 'Assinaturas', icon: Wallet },
  { href: '/admin/fundadores', label: 'Fundadores', icon: Crown },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/produtos', label: 'Produtos', icon: Package },
  { href: '/admin/webhooks', label: 'Webhooks', icon: Webhook },
] as const;

export default async function AdminDashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link
            href="/admin"
            className="font-display text-lg font-black tracking-tight"
          >
            Painel <span className="gold-gradient-text">DR</span>
          </Link>
          <nav aria-label="Navegação do painel" className="flex flex-1 flex-wrap gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Painel administrativo do Diário da Riqueza · dados via API Cakto ·
        confidencial
      </footer>
    </div>
  );
}
