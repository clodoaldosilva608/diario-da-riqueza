'use client';

/**
 * TourGuide — tour guiado de primeira visita (spotlight overlay).
 *
 * Percorre os itens de navegação destacando cada área do app com um furo de
 * luz (box-shadow invertido) e um cartão explicativo ancorado. Funciona no
 * desktop (sidebar fixa) e no mobile (drawer do hambúrguer, que o AppShell
 * abre automaticamente durante o tour). Passos: boas-vindas → 8 áreas → conclusão com atalhos.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpenCheck, NotebookPen, Target, Wallet, LibraryBig, BarChart3, Trophy,
  LifeBuoy, Settings, LayoutDashboard, X, ChevronLeft, ChevronRight, PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';

interface TourStep {
  /** seletor data-tour; ausente = cartão centrado */
  targetId?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}

const STEPS: TourStep[] = [
  {
    icon: BookOpenCheck,
    title: 'Bem-vindo ao seu Diário da Riqueza!',
    text: 'Este tour rápido (1 minuto) mostra cada área do app. Você já começa com dados de exemplo para explorar — depois edita ou apaga tudo como quiser.',
  },
  {
    targetId: 'nav-diario',
    icon: NotebookPen,
    title: 'Diário — o coração do método',
    text: 'Registre o dia: horário que acordou, exercício, alimentação, estudo, finanças e o que colocou em prática. Cada registro vale XP.',
  },
  {
    targetId: 'nav-sonhos',
    icon: Target,
    title: 'Sonhos & Metas',
    text: 'Sua lista de sonhos da capa do diário e as metas categorizadas com barra de progresso. Recomendação do método: comece com 10 metas.',
  },
  {
    targetId: 'nav-orcamento',
    icon: Wallet,
    title: 'Orçamento',
    text: 'Lançamentos de receitas e despesas, com itens mensais recorrentes. O saldo do mês alimenta seu dashboard automaticamente.',
  },
  {
    targetId: 'nav-biblioteca',
    icon: LibraryBig,
    title: 'Biblioteca',
    text: '20 temas prontos de Finanças e Negócios. Marque o progresso e anote "O que aprendi" — estudar também vale XP.',
  },
  {
    targetId: 'nav-estatisticas',
    icon: BarChart3,
    title: 'Estatísticas',
    text: 'Gráficos de humor, energia, finanças e consistência. O que é medido, melhora.',
  },
  {
    targetId: 'nav-conquistas',
    icon: Trophy,
    title: 'Conquistas',
    text: 'Marcos desbloqueados pela sua disciplina: primeiros registros, streaks, estudos concluídos e mais.',
  },
  {
    targetId: 'nav-ajuda',
    icon: LifeBuoy,
    title: 'Ajuda — tire suas dúvidas aqui',
    text: 'Guia completo de cada aba, perguntas frequentes e solução de problemas. Volte sempre que precisar.',
  },
  {
    targetId: 'nav-config',
    icon: Settings,
    title: 'Configurações',
    text: 'Perfil, pasta no dispositivo, backup, exportações, integração com Obsidian e dados de exemplo.',
  },
  {
    icon: LayoutDashboard,
    title: 'Tudo pronto! 🎉',
    text: 'Comece pelo botão "Registrar Hoje" no Início — seu primeiro dia vale 90 XP. Os dados de exemplo são seus: explore, edite ou limpe em Configurações.',
  },
];

const PAD = 10;

export function TourGuide() {
  const tourOpen = useAppStore((s) => s.tourOpen);
  const setTourOpen = useAppStore((s) => s.setTourOpen);
  const setTourDone = useAppStore((s) => s.setTourDone);
  const setView = useAppStore((s) => s.setView);

  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardH, setCardH] = useState(260);
  const cardRef = useRef<HTMLDivElement>(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const close = useCallback(
    (done = true) => {
      setTourOpen(false);
      if (done) setTourDone(true);
      setStep(0);
    },
    [setTourDone, setTourOpen],
  );

  // Recalcula o retângulo do alvo ao trocar de passo / redimensionar / rolar
  const measure = useCallback(() => {
    if (!tourOpen) return;
    const targetId = STEPS[step]?.targetId;
    if (!targetId) {
      setRect(null);
      return;
    }
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-tour="${targetId}"]`),
    );
    const visible = candidates.find((el) => el.offsetParent !== null) ?? null;
    // Nav mobile com scroll horizontal: traz o alvo para a área visível antes
    // de medir, senão o spotlight apontaria para um item fora da tela.
    if (visible) {
      const r = visible.getBoundingClientRect();
      if (r.left < 8 || r.right > window.innerWidth - 8) {
        visible.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
    setRect(visible ? visible.getBoundingClientRect() : null);
  }, [step, tourOpen]);

  useEffect(() => {
    if (!tourOpen) return;
    const raf = requestAnimationFrame(measure);
    // Re-medição diferida: cobre a animação de abertura do drawer mobile
    // (slide-in ~500ms) e outras transições de layout que não disparam
    // scroll/resize — sem isso o spotlight apontaria para posição velha.
    const t1 = setTimeout(measure, 350);
    const t2 = setTimeout(measure, 700);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure, tourOpen]);

  // Esc fecha o tour
  useEffect(() => {
    if (!tourOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight' && !isLast) setStep((s) => Math.min(s + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tourOpen, close, isLast]);

  // Altura real do cartão (muda com quebra de botões no mobile) — usada para
  // posicionar sem estourar a viewport em telas pequenas.
  useLayoutEffect(() => {
    if (!tourOpen) return;
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [tourOpen, step, rect]);

  // Posição do cartão
  const cardStyle = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = Math.min(360, vw - 24);
    if (!rect) {
      // Centralização numérica (sem transform: o framer-motion gerencia o
      // transform da animação e sobrescreveria translate(-50%,-50%)).
      const top = Math.max(12, (vh - cardH) / 2);
      return { top, left: (vw - cardW) / 2, width: cardW } as const;
    }
    const gap = 14;
    const below = rect.bottom + gap;
    const above = rect.top - cardH - gap;
    // Prefere abaixo do alvo; senão acima; sempre preso à viewport (12px)
    let top = below + cardH + 12 <= vh ? below : above;
    top = Math.min(Math.max(12, top), Math.max(12, vh - cardH - 12));
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 12);
    return { top, left, width: cardW } as const;
  }, [rect, cardH]);

  if (!tourOpen) return null;

  const spotlight =
    rect
      ? {
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
        }
      : null;

  const Icon = current.icon;

  return (
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200]"
        role="dialog"
        aria-modal="true"
        aria-label="Tour guiado do app"
      >
        {/* Fundo escuro com furo de luz no alvo */}
        {spotlight ? (
          <div
            className="absolute rounded-2xl transition-all duration-300"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.78)',
              border: '2px solid rgba(212,175,55,0.65)',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-black/78" />
        )}

        {/* Cartão do passo */}
        <motion.div
          key={step}
          ref={cardRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl border border-gold/30 bg-card p-4 shadow-2xl shadow-black/50 sm:p-5"
          style={{ ...cardStyle, maxWidth: 360 }}
        >
          {/* Cabeçalho */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
              <Icon className="h-5 w-5 text-gold" />
            </div>
            <button
              aria-label="Encerrar tour"
              className="text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => close()}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h3 className="mt-3 font-display text-base font-bold sm:text-lg">{current.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{current.text}</p>

          {/* Progresso */}
          <div className="mt-4 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-5 bg-gold' : 'w-1.5 bg-border',
                )}
              />
            ))}
            <span className="ml-auto text-[11px] text-muted-foreground">
              {step + 1}/{STEPS.length}
            </span>
          </div>

          {/* Ações — no passo final os botões ganham grade própria (full-width
              no mobile) para não se sobreporem em telas estreitas */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => close()}>
              Pular tour
            </Button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Voltar
                </Button>
              )}
              {!isLast && (
                <Button
                  size="sm"
                  className="bg-gold text-black hover:bg-gold-light"
                  onClick={() => setStep((s) => s + 1)}
                >
                  Próximo <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {isLast && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gold/40 text-gold"
                onClick={() => {
                  close();
                  setView('diario');
                }}
              >
                <PlayCircle className="mr-1 h-4 w-4" /> Registrar primeiro dia
              </Button>
              <Button
                size="sm"
                className="bg-gold text-black hover:bg-gold-light"
                onClick={() => close()}
              >
                Concluir
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
