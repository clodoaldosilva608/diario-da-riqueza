'use client';

/**
 * AdminNav — navegação do painel /admin com estado ativo (usePathname).
 * Client component: o layout (server) não conhece o pathname corrente.
 * Dois formatos: 'sidebar' (coluna, desktop) e 'scroll' (linha com rolagem
 * horizontal, mobile).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, CreditCard, Crown, Package, Settings, Users, Wallet, Webhook,
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/vendas', label: 'Vendas', icon: CreditCard },
  { href: '/admin/assinaturas', label: 'Assinaturas', icon: Wallet },
  { href: '/admin/fundadores', label: 'Fundadores', icon: Crown },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/produtos', label: 'Produtos', icon: Package },
  { href: '/admin/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

export function AdminNav({ variant }: { variant: 'sidebar' | 'scroll' }) {
  const pathname = usePathname();

  if (variant === 'scroll') {
    return (
      <nav
        aria-label="Navegação do painel"
        className="flex gap-1 overflow-x-auto px-3 py-2"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-gold/15 text-gold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Navegação do painel" className="flex flex-col gap-1 px-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            title={label}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'border border-gold/30 bg-gold/10 text-gold'
                : 'border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
