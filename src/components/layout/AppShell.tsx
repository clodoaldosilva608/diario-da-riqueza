'use client';

/**
 * AppShell — casca da aplicação:
 * - Sidebar premium no desktop + drawer via menu hambúrguer no mobile
 *   (abre também com swipe da borda esquerda; fecha por arrasto — vaul)
 * - Topbar com hambúrguer (mobile), seletor de ano, busca e modo foco
 * - Modo Foco (esconde distrações)
 * - Busca global (CommandDialog)
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BookOpenCheck, LayoutDashboard, Menu, NotebookPen, Target, Wallet, LibraryBig,
  BarChart3, Trophy, Settings, Search, X, Maximize2, Minimize2, HardDrive,
  CloudOff, ChevronsUpDown, CircleDollarSign, LifeBuoy,
} from 'lucide-react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import {
  Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import { useAvailableYears, useGamification, useGlobalSearch } from '@/hooks/useData';
import { db } from '@/db';
import { maybeAutoVaultSync } from '@/obsidian/sync';
import { toast } from 'sonner';
import { LevelBadge } from '@/components/shared/ui-kit';
import type { ViewKey } from '@/types';

const NAV: Array<{ key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'dashboard', label: 'Início', icon: LayoutDashboard },
  { key: 'diario', label: 'Diário', icon: NotebookPen },
  { key: 'sonhos', label: 'Sonhos & Metas', icon: Target },
  { key: 'orcamento', label: 'Orçamento', icon: Wallet },
  { key: 'biblioteca', label: 'Biblioteca', icon: LibraryBig },
  { key: 'estatisticas', label: 'Estatísticas', icon: BarChart3 },
  { key: 'conquistas', label: 'Conquistas', icon: Trophy },
  { key: 'ajuda', label: 'Ajuda', icon: LifeBuoy },
  { key: 'config', label: 'Configurações', icon: Settings },
];

/**
 * Lista de navegação compartilhada entre a sidebar (desktop) e o drawer
 * (mobile) — garante um único modelo mental: mesmos itens, mesmos ícones,
 * mesmo estado ativo dourado e mesmos data-tour para o TourGuide.
 */
function NavList({ current, onItem }: { current: ViewKey; onItem: (key: ViewKey) => void }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-4"
    >
      {NAV.map((item) => {
        const active = current === item.key;
        return (
          <button
            key={item.key}
            data-tour={`nav-${item.key}`}
            onClick={() => onItem(item.key)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              active
                ? 'bg-gold/12 text-gold border border-gold/25'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground border border-transparent',
            )}
          >
            <item.icon className={cn('h-4.5 w-4.5 shrink-0', active && 'text-gold')} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const focusMode = useAppStore((s) => s.focusMode);
  const toggleFocus = useAppStore((s) => s.toggleFocus);
  const selectedYear = useAppStore((s) => s.selectedYear);
  const setYear = useAppStore((s) => s.setYear);
  const searchOpen = useAppStore((s) => s.searchOpen);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const folderConnected = useAppStore((s) => s.folderConnected);
  const folderName = useAppStore((s) => s.folderName);
  const tourOpen = useAppStore((s) => s.tourOpen);

  const [query, setQuery] = useState('');
  // Abertura manual do drawer (hambúrguer). O estado final é derivado:
  // manual OU tour guiado em viewport mobile — sem setState em effect.
  const [manualNavOpen, setManualNavOpen] = useState(false);
  const years = useAvailableYears();
  const entries = useLiveQuery(() => db.entries.toArray(), [], []);
  const gam = useGamification(entries);
  const hits = useGlobalSearch(query);

  // Atalho de teclado: Ctrl/Cmd+K abre a busca
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [searchOpen, setSearchOpen]);

  // Auto-sync do vault Obsidian (opt-in) — silencioso no boot
  const vaultAutoSync = useAppStore((s) => s.vaultAutoSync);
  const setVaultSynced = useAppStore((s) => s.setVaultSynced);
  useEffect(() => {
    if (!vaultAutoSync) return;
    let cancelled = false;
    maybeAutoVaultSync().then((res) => {
      if (!res || cancelled) return;
      setVaultSynced(res.at);
      const mudou = (res.merge && (res.merge.added || res.merge.updated || res.merge.removed || res.merge.conflicts)) || res.mdImported;
      if (mudou) {
        toast.success('Vault do Obsidian sincronizado', {
          description: [
            res.merge?.added ? `+${res.merge.added} novos` : null,
            res.merge?.updated ? `${res.merge.updated} atualizados` : null,
            res.mdImported ? `${res.mdImported} edição(ões) importada(s)` : null,
          ].filter(Boolean).join(' • ') || undefined,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [vaultAutoSync, setVaultSynced]);

  const viewTitle = useMemo(() => NAV.find((n) => n.key === view)?.label ?? '', [view]);

  // Viewport mobile (< lg) — reativa a redimensionamento. No SSR/antes da
  // hidratação assume false (getServerSnapshot) para evitar mismatch.
  const isMobileViewport = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(max-width: 1023px)');
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia('(max-width: 1023px)').matches,
    () => false,
  );

  // Drawer aberto = usuário abriu pelo hambúrguer OU o tour guiado está
  // rodando no mobile (o spotlight precisa enxergar os itens de navegação).
  const mobileNavOpen = manualNavOpen || (tourOpen && isMobileViewport);

  // Gesto nativo: swipe para a direita a partir da borda esquerda abre o
  // drawer (como apps nativos). Fechar por arrasto é nativo do vaul.
  // Listeners passivos — sem preventDefault, zero impacto no scroll.
  // A intenção (horizontal × vertical) é decidida uma única vez por gesto:
  // rolagens iniciadas na borda nunca disparam o menu.
  useEffect(() => {
    if (!isMobileViewport || focusMode || tourOpen || mobileNavOpen) return;
    const EDGE = 28; // zona da borda (px) — alcança o polegar sem roubar cliques do conteúdo
    const OPEN_AT = 52; // distância horizontal mínima para abrir
    let startX = 0;
    let startY = 0;
    let armed = false;
    let intent: 'horizontal' | 'vertical' | null = null;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const target = e.target instanceof Element ? e.target : null;
      // Não armar sobre elementos interativos (ex.: o próprio hambúrguer) —
      // evita abrir pelo gesto e fechar pelo click de toggle em seguida.
      armed = t.clientX <= EDGE && !target?.closest('button, a, [role="button"]');
      startX = t.clientX;
      startY = t.clientY;
      intent = null;
    };
    const onMove = (e: TouchEvent) => {
      if (!armed) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (intent === null && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
        intent = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.2 ? 'horizontal' : 'vertical';
        if (intent === 'vertical') armed = false;
      }
      if (intent === 'horizontal' && dx > OPEN_AT) {
        setManualNavOpen(true);
        armed = false;
      }
    };
    const onEnd = () => {
      armed = false;
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, [isMobileViewport, focusMode, tourOpen, mobileNavOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* ============================ SIDEBAR DESKTOP ============================ */}
      {!focusMode && (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/70 bg-sidebar lg:flex no-print">
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
              <BookOpenCheck className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-tight gold-gradient-text">
                Diário da Riqueza
              </p>
              <p className="text-[11px] text-muted-foreground">Treino mental diário</p>
            </div>
          </div>
          <div className="gold-divider mx-5" />
          <NavList current={view} onItem={setView} />
          <div className="border-t border-border/70 p-4">
            <LevelBadge xp={gam.totalXP} />
            <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              {folderConnected ? (
                <>
                  <HardDrive className="h-3.5 w-3.5 text-emerald-wealth" />
                  <span className="truncate">Pasta: {folderName}</span>
                </>
              ) : (
                <>
                  <CloudOff className="h-3.5 w-3.5" />
                  <span>Pasta não conectada</span>
                </>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* ============================ TOPBAR ============================ */}
      <header
        className={cn(
          'sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md no-print',
          !focusMode && 'lg:pl-64',
        )}
      >
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          {/* ===================== HAMBÚRGUER + DRAWER MOBILE ===================== */}
          {/* Substitui a antiga bottom nav: todas as 9 seções em um drawer
              lateral à esquerda (vaul), com a mesma linguagem visual da
              sidebar desktop (logo, divisória dourada, item ativo, XP e
              pasta). Abre por hambúrguer ou swipe da borda; fecha por
              arrasto, overlay, ESC ou X. */}
          {!focusMode && (
            <Drawer
              direction="left"
              open={mobileNavOpen}
              onOpenChange={(open) => setManualNavOpen(open)}
            >
              <DrawerTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 h-9 w-9 lg:hidden"
                  aria-label="Abrir menu de navegação"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="w-[290px] gap-0 border-r border-border/70 bg-sidebar p-0 sm:max-w-[290px]">
                <DrawerClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-3 h-8 w-8"
                    aria-label="Fechar menu"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
                <DrawerHeader className="p-0">
                  <div className="flex items-center gap-3 px-5 py-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
                      <BookOpenCheck className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <DrawerTitle className="font-display text-lg font-bold leading-tight gold-gradient-text">
                        Diário da Riqueza
                      </DrawerTitle>
                      <DrawerDescription className="text-[11px] text-muted-foreground">
                        Treino mental diário
                      </DrawerDescription>
                    </div>
                  </div>
                  <div className="gold-divider mx-5" />
                </DrawerHeader>
                <NavList
                  current={view}
                  onItem={(key) => {
                    setView(key);
                    setManualNavOpen(false);
                  }}
                />
                {/* Rodapé com safe-area para iPhones com notch */}
                <div className="border-t border-border/70 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  <LevelBadge xp={gam.totalXP} />
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {folderConnected ? (
                      <>
                        <HardDrive className="h-3.5 w-3.5 text-emerald-wealth" />
                        <span className="truncate">Pasta: {folderName}</span>
                      </>
                    ) : (
                      <>
                        <CloudOff className="h-3.5 w-3.5" />
                        <span>Pasta não conectada</span>
                      </>
                    )}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          )}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/40 bg-gold/10">
              <BookOpenCheck className="h-4 w-4 text-gold" />
            </div>
            <span className="font-display font-bold gold-gradient-text hidden sm:inline">
              Diário da Riqueza
            </span>
          </div>
          <h1 className="hidden text-sm font-semibold text-muted-foreground lg:block">
            {viewTitle}
          </h1>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Seletor de ano (múltiplos diários) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 border-gold/30">
                  {selectedYear}
                  <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Diários por ano</DropdownMenuLabel>
                {years.map((y) => (
                  <DropdownMenuItem key={y} onClick={() => setYear(y)}>
                    {y}
                    {y === selectedYear && <span className="ml-auto text-gold">•</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Buscar no diário"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={focusMode ? 'Sair do modo foco' : 'Modo foco'}
              onClick={toggleFocus}
            >
              {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            {!focusMode && (
              <div className="hidden md:block">
                <LevelBadge xp={gam.totalXP} compact />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================ CONTEÚDO ============================ */}
      <main className={cn('min-h-[calc(100vh-3.5rem)] pb-10', !focusMode && 'lg:pl-64')}>
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="screen-content mx-auto max-w-5xl px-4 py-6 sm:px-6"
        >
          {children}
        </motion.div>
      </main>

      {/* ============================ BUSCA GLOBAL ============================ */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput
          placeholder="Buscar no diário, metas, estudos e sonhos…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-80">
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          {hits.length > 0 && (
            <CommandGroup heading={`${hits.length} resultado(s)`}>
              {hits.map((h) => (
                <CommandItem
                  key={h.id}
                  value={h.id}
                  onSelect={() => {
                    if (h.kind === 'entrada') setView('diario');
                    else if (h.kind === 'meta' || h.kind === 'sonho') setView('sonhos');
                    else setView('biblioteca');
                    setSearchOpen(false);
                    setQuery('');
                  }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{h.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{h.snippet || h.kind}</p>
                  </div>
                  <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                    {h.kind}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}

/** Botão "Registrar Hoje" — usado no dashboard */
export function RegistrarHojeButton({
  registered,
  onClick,
}: {
  registered: boolean;
  onClick: () => void;
}) {
  return (
    <button
      data-tour="registrar-hoje"
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border p-5 text-left transition-all',
        registered
          ? 'border-emerald-wealth/40 bg-emerald-wealth/10'
          : 'border-gold/40 bg-gradient-to-r from-gold/15 via-gold/8 to-transparent hover:border-gold',
      )}
    >
      <div>
        <p className="font-display text-lg font-bold">
          {registered ? 'Dia registrado com disciplina ✓' : 'Registrar Hoje'}
        </p>
        <p className="text-sm text-muted-foreground">
          {registered
            ? 'Toque para revisar ou editar o registro de hoje.'
            : '+50 XP • Sua mente e sua conta agradecem'}
        </p>
      </div>
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-transform group-hover:scale-110',
          registered ? 'border-emerald-wealth/50 text-emerald-wealth' : 'border-gold/50 text-gold',
        )}
      >
        {registered ? (
          <CircleDollarSign className="h-6 w-6" />
        ) : (
          <BookOpenCheck className="h-6 w-6" />
        )}
      </div>
    </button>
  );
}
