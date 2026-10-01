'use client';

/**
 * LandingPage — apresentação pública do Diário da Riqueza.
 *
 * Exibida na rota "/" para visitantes novos (antes do onboarding) e
 * reaberta por Configurações → "Ver apresentação do projeto".
 *
 * Comunicação: organização, clareza, disciplina e acompanhamento de metas.
 * Sem promessas de enriquecimento, ganhos garantidos ou resultados financeiros.
 * Sem depoimentos, números de usuários ou parceiros inventados.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
// Animações: apenas no hero (acima da dobra). Seções abaixo são estáticas
// para garantir visibilidade total em impressão, capturas de tela e bots.
import {
  ArrowRight, BookOpenCheck, CheckCircle2, CloudOff, ExternalLink, FileDown,
  Flame, FolderSync, GraduationCap, HardDrive, HeartHandshake, Info,
  Link2, Mail, NotebookPen, PenLine, ShieldCheck, SlidersHorizontal,
  Sparkles, Target, TrendingUp, Trophy, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  InstagramIcon, LinktreeIcon, TikTokIcon, WhatsAppIcon, YouTubeIcon,
} from '@/components/support/icons';
import { PixSupportDialog } from '@/components/support/PixSupportDialog';
import { SupportOptions } from './SupportOptions';
import { FounderWall } from './FounderWall';
import { FounderTicker } from './FounderTicker';
import {
  BIO_SITE_URL, CONTACT_EMAIL, CONTACT_EMAIL_URL, CREATOR_SECTION_INTRO,
  INSTAGRAM_HANDLE, INSTAGRAM_URL, LINKTREE_URL, PARTNERS_URL,
  PERSONAL_SITE_URL, TIKTOK_HANDLE, TIKTOK_URL, WHATSAPP_URL, YOUTUBE_HANDLE,
  YOUTUBE_URL,
} from '@/lib/contact';
import { cn } from '@/lib/utils';

type LandingProps = {
  /** CTA principal — inicia o fluxo de entrada (ou volta ao app p/ usuários onboardados) */
  onEnter: () => void;
  /** Rótulo do CTA principal */
  enterLabel?: string;
  /** Se definido, mostra "Voltar ao app" no cabeçalho (usuário já onboardado) */
  onExit?: () => void;
};

const STEPS = [
  {
    icon: Target,
    title: 'Defina suas metas',
    desc: 'Escolha onde quer chegar: metas pessoais e financeiras com valor e prazo claros.',
  },
  {
    icon: Wallet,
    title: 'Organize seu orçamento',
    desc: 'Registre receitas e despesas e enxergue para onde o seu dinheiro está indo.',
  },
  {
    icon: NotebookPen,
    title: 'Registre estudos e práticas',
    desc: 'Anote o que aprendeu no dia e o que colocou em prática, todos os dias.',
  },
  {
    icon: TrendingUp,
    title: 'Acompanhe sua evolução',
    desc: 'Estatísticas, calendário de consistência e progresso das metas em um só lugar.',
  },
  {
    icon: Flame,
    title: 'Mantenha a consistência',
    desc: 'Streaks, XP e lembretes ajudam você a manter o ritmo ao longo do tempo.',
  },
] as const;

const FEATURES = [
  {
    icon: Target,
    title: 'Metas pessoais e financeiras',
    desc: 'Sonhos, metas por categoria e progresso acompanhado de perto.',
  },
  {
    icon: Wallet,
    title: 'Receitas e despesas',
    desc: 'Lançamentos únicos ou recorrentes, com gráficos e projeção até a meta.',
  },
  {
    icon: GraduationCap,
    title: 'Estudos e aprendizados',
    desc: 'Biblioteca de temas com progresso e registro do que você aprendeu.',
  },
  {
    icon: NotebookPen,
    title: 'Práticas e hábitos diários',
    desc: 'Diário diário com prática obrigatória, humor, energia e ações produtivas.',
  },
  {
    icon: PenLine,
    title: 'Reflexões pessoais',
    desc: 'Espaço para pensamentos, ideias e lições de cada dia.',
  },
  {
    icon: Trophy,
    title: 'XP, níveis e conquistas',
    desc: 'Gamificação para transformar disciplina em hábito — com streaks e recordes.',
  },
  {
    icon: CloudOff,
    title: 'Funciona offline',
    desc: 'Sem depender de internet: registre no ônibus, no metrô ou no campo.',
  },
  {
    icon: ShieldCheck,
    title: 'Dados no seu dispositivo',
    desc: 'Tudo fica no seu aparelho (IndexedDB). Nenhum servidor guarda suas informações.',
  },
  {
    icon: FileDown,
    title: 'Backup e exportação',
    desc: 'PDF, Word, Excel, Markdown, JSON e backups locais quando quiser.',
  },
  {
    icon: FolderSync,
    title: 'Integração com Obsidian',
    desc: 'Espelhe seu diário em um vault de Markdown e edite de onde preferir.',
  },
] as const;

const AUDIENCES = [
  'Pessoas que querem organizar melhor seus objetivos.',
  'Pessoas que desejam acompanhar sua vida financeira com clareza.',
  'Estudantes e empreendedores que registram o que aprendem.',
  'Pessoas que buscam desenvolver disciplina e constância.',
  'Qualquer pessoa que queira registrar sua evolução pessoal.',
] as const;

const PRIVACY = [
  {
    icon: CloudOff,
    title: 'Funcionamento offline',
    desc: 'A ferramenta foi feita para funcionar sem internet, direto no navegador.',
  },
  {
    icon: HardDrive,
    title: 'Dados mantidos no dispositivo',
    desc: 'Seus registros ficam armazenados no seu aparelho, não em servidores nossos.',
  },
  {
    icon: ShieldCheck,
    title: 'Sem promessas financeiras',
    desc: 'Nenhuma promessa de ganho ou retorno — apenas organização e acompanhamento.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Você no controle',
    desc: 'Edite, apague ou recomece quando quiser: suas informações pertencem a você.',
  },
  {
    icon: FileDown,
    title: 'Exportação e backup',
    desc: 'Leve seus dados para onde quiser, com exportações e backups a qualquer momento.',
  },
] as const;

export function LandingPage({ onEnter, enterLabel = 'Começar gratuitamente', onExit }: LandingProps) {
  const [pixOpen, setPixOpen] = useState(false);
  const year = new Date().getFullYear();

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-black"
      >
        Pular para o conteúdo
      </a>

      {/* ============================ CABEÇALHO ============================ */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0 })}
            className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Diário da Riqueza — voltar ao topo"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
              <BookOpenCheck className="h-4.5 w-4.5 text-gold" aria-hidden="true" />
            </span>
            <span className="hidden whitespace-nowrap font-display text-sm font-bold gold-gradient-text sm:inline sm:text-lg">
              Diário da Riqueza
            </span>
          </button>
          <nav aria-label="Navegação da página" className="flex items-center gap-1.5 sm:gap-2">
            {onExit && (
              <Button variant="ghost" onClick={onExit} className="hidden h-10 sm:inline-flex">
                Voltar ao app
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => scrollTo('como-funciona')}
              className="hidden h-10 sm:inline-flex"
            >
              Como funciona
            </Button>
            <Button
              onClick={onEnter}
              className="h-10 whitespace-nowrap bg-gold px-3.5 text-black hover:bg-gold-light sm:px-6"
            >
              {enterLabel}
            </Button>
          </nav>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        {/* ============================ HERO ============================ */}
        <section className="relative overflow-hidden" aria-labelledby="hero-titulo">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 50% at 50% 0%, rgba(212,175,55,0.10) 0%, transparent 70%)',
            }}
          />
          <div className="relative mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-medium text-gold"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Gratuito • 100% offline • Seus dados no seu dispositivo
            </motion.span>

            <motion.h1
              id="hero-titulo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-6 font-display text-4xl font-black leading-tight sm:text-6xl"
            >
              Transforme seus objetivos em{' '}
              <span className="gold-gradient-text">uma prática diária</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              O Diário da Riqueza ajuda você a organizar metas, orçamento, estudos e
              hábitos para acompanhar sua evolução com mais clareza e consistência.
            </motion.p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                onClick={onEnter}
                className="h-12 w-full px-8 text-base font-semibold bg-gold text-black hover:bg-gold-light sm:w-auto"
              >
                {enterLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                onClick={() => scrollTo('como-funciona')}
                className="h-12 w-full border-gold/40 px-8 text-base sm:w-auto"
              >
                Conhecer a ferramenta
              </Button>
            </div>

            <ul
              className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
              aria-label="Destaques da ferramenta"
            >
              <li className="flex items-center gap-1.5">
                <CloudOff className="h-3.5 w-3.5 text-gold" aria-hidden="true" /> Funciona offline
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-gold" aria-hidden="true" /> Dados só no seu dispositivo
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden="true" /> Comece gratuitamente
              </li>
            </ul>
          </div>
        </section>

        {/* ====================== TICKER DOS FUNDADORES (redline) ====================== */}
        <FounderTicker />

        {/* ============================ COMO FUNCIONA ============================ */}
        <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="scroll-mt-20 border-t border-border/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="como-funciona-titulo" className="font-display text-3xl font-bold sm:text-4xl">
                Como <span className="gold-gradient-text">funciona</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                Um ritual simples de alguns minutos por dia — cinco passos que
                transformam intenções em progresso visível.
              </p>
            </div>

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                                    className="relative rounded-2xl border border-border p-5 transition-colors hover:border-gold/40"
                >
                  <span
                    className="absolute -top-3 left-5 flex h-7 w-7 items-center justify-center rounded-full bg-gold text-sm font-bold text-black"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <step.icon className="mt-2 h-6 w-6 text-gold" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ============================ FUNCIONALIDADES ============================ */}
        <section id="funcionalidades" aria-labelledby="funcionalidades-titulo" className="scroll-mt-20 border-t border-border/60 bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="funcionalidades-titulo" className="font-display text-3xl font-bold sm:text-4xl">
                Tudo que você precisa,{' '}
                <span className="gold-gradient-text">nada que atrapalhe</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                Cada recurso existe para um propósito: registrar, organizar e
                acompanhar a sua evolução.
              </p>
            </div>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <li
                  key={f.title}
                                    className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-gold/40"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10">
                    <f.icon className="h-5 w-5 text-gold" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3.5 text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {f.desc}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ============================ PARA QUEM É ============================ */}
        <section id="para-quem" aria-labelledby="para-quem-titulo" className="scroll-mt-20 border-t border-border/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <h2 id="para-quem-titulo" className="font-display text-3xl font-bold sm:text-4xl">
                  Para <span className="gold-gradient-text">quem é</span>
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  O Diário da Riqueza foi feito para quem acredita que evolução
                  nasce de pequenas ações registradas todos os dias. Se você quer
                  mais clareza sobre seus objetivos, seu dinheiro e seus hábitos,
                  esta ferramenta foi pensada para você.
                </p>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  Não importa o ponto de partida: o que importa é a direção — e
                  registrar o caminho é a melhor forma de mantê-la.
                </p>
              </div>

              <ul className="space-y-3">
                {AUDIENCES.map((a) => (
                  <li
                    key={a}
                    className="flex items-start gap-3 rounded-2xl border border-border p-4 transition-colors hover:border-gold/40"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
                    <span className="text-sm leading-relaxed">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ============================ TRANSPARÊNCIA ============================ */}
        <section id="transparencia" aria-labelledby="transparencia-titulo" className="scroll-mt-20 border-t border-border/60 bg-muted/30">
          <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10">
                <Info className="h-6 w-6 text-gold" aria-hidden="true" />
              </div>
              <h2 id="transparencia-titulo" className="mt-5 font-display text-3xl font-bold sm:text-4xl">
                O que a ferramenta <span className="gold-gradient-text">não promete</span>
              </h2>
              <blockquote className="mt-6 rounded-2xl border border-gold/25 bg-gold/5 p-6 text-left leading-relaxed sm:p-8">
                <p className="text-base sm:text-lg">
                  O Diário da Riqueza não promete enriquecimento automático nem
                  substitui educação financeira, trabalho, planejamento ou
                  orientação profissional. Ele é uma ferramenta para ajudar você a
                  organizar informações, acompanhar hábitos e agir com mais clareza.
                </p>
              </blockquote>
              <p className="mt-5 text-sm text-muted-foreground">
                Sem promessas de ganhos, sem fórmulas mágicas — apenas organização,
                disciplina e o registro honesto do seu caminho.
              </p>
            </div>
          </div>
        </section>

        {/* ============================ PRIVACIDADE ============================ */}
        <section id="privacidade" aria-labelledby="privacidade-titulo" className="scroll-mt-20 border-t border-border/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="privacidade-titulo" className="font-display text-3xl font-bold sm:text-4xl">
                Privacidade <span className="gold-gradient-text">em primeiro lugar</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                Feita para funcionar offline, com seus dados sob o seu controle.
              </p>
            </div>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {PRIVACY.map((p, i) => (
                <li
                  key={p.title}
                                    className="rounded-2xl border border-border p-5"
                >
                  <p.icon className="h-6 w-6 text-gold" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold">{p.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {p.desc}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ============================ CRIADOR ============================ */}
        <section id="criador" aria-labelledby="criador-titulo" className="scroll-mt-20 border-t border-border/60 bg-muted/30">
          <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="rounded-3xl border border-gold/25 bg-card p-6 sm:p-10">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                {/* Avatar com iniciais */}
                <div className="flex shrink-0 flex-col items-center gap-3">
                  <span
                    className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10 font-display text-xl font-black text-gold"
                    aria-hidden="true"
                  >
                    CS
                  </span>
                  {/* Atalhos rápidos para as redes do criador */}
                  <div className="flex items-center gap-2" role="group" aria-label="Redes sociais do criador">
                    <a
                      href={INSTAGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-[#E4405F]/50 hover:text-[#E4405F]"
                      aria-label={`Instagram do criador (${INSTAGRAM_HANDLE}) — abre em nova aba`}
                      title={`Instagram ${INSTAGRAM_HANDLE}`}
                    >
                      <InstagramIcon className="h-4 w-4" />
                    </a>
                    <a
                      href={TIKTOK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
                      aria-label={`TikTok do criador (${TIKTOK_HANDLE}) — abre em nova aba`}
                      title={`TikTok ${TIKTOK_HANDLE}`}
                    >
                      <TikTokIcon className="h-4 w-4" />
                    </a>
                    <a
                      href={YOUTUBE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-[#FF0000]/50 hover:text-[#FF0000]"
                      aria-label={`YouTube do criador (${YOUTUBE_HANDLE}) — abre em nova aba`}
                      title={`YouTube ${YOUTUBE_HANDLE}`}
                    >
                      <YouTubeIcon className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h2 id="criador-titulo" className="font-display text-2xl font-bold sm:text-3xl">
                    Conheça o <span className="gold-gradient-text">criador</span> do projeto
                  </h2>
                  <p className="mt-4 leading-relaxed text-muted-foreground">
                    {CREATOR_SECTION_INTRO}
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button
                      asChild
                      className="h-11 bg-gold text-black hover:bg-gold-light"
                    >
                      <a
                        href={PERSONAL_SITE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Visitar o site pessoal do criador clodoaldo.vercel.app — abre em nova aba"
                        title="Abre em nova aba: https://clodoaldo.vercel.app/"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Visitar meu site
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 border-gold/40 text-gold hover:bg-gold/10"
                    >
                      <a
                        href={PARTNERS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Conhecer e apoiar outros apps — página Criadores Parceiros, abre em nova aba"
                        title="Abre em nova aba: https://clodoaldo.vercel.app/criadores-parceiros"
                      >
                        <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                        Conhecer e apoiar outros apps
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== APOIE O PROJETO (CAKTO) ==================== */}
        <SupportOptions />

        {/* ==================== MURAL DOS FUNDADORES ==================== */}
        <FounderWall />

        {/* ============================ CTA FINAL ============================ */}
        <section aria-labelledby="cta-final-titulo" className="relative overflow-hidden border-t border-border/60">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(50% 60% at 50% 100%, rgba(212,175,55,0.10) 0%, transparent 70%)',
            }}
          />
          <div className="relative mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-24">
            <div>
              <h2 id="cta-final-titulo" className="font-display text-3xl font-black leading-tight sm:text-5xl">
                Comece hoje a registrar o{' '}
                <span className="gold-gradient-text">caminho que você está construindo</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Crie seu diário em poucos passos, explore com dados de exemplo e
                mantenha o hábito — tudo no seu dispositivo, gratuitamente.
              </p>
              <Button
                onClick={onEnter}
                className="mt-8 h-12 max-w-full px-5 text-sm font-semibold bg-gold text-black hover:bg-gold-light sm:px-8 sm:text-base"
              >
                Usar o Diário da Riqueza gratuitamente
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ============================ RODAPÉ ============================ */}
      <footer className="mt-auto border-t border-border/70 bg-sidebar">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Marca */}
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
                  <BookOpenCheck className="h-4.5 w-4.5 text-gold" aria-hidden="true" />
                </span>
                <span className="font-display text-lg font-bold gold-gradient-text">
                  Diário da Riqueza
                </span>
              </div>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Organize metas, orçamento, estudos e hábitos com clareza,
                disciplina e consistência — direto no seu dispositivo.
              </p>
            </div>

            {/* Explorar */}
            <nav aria-label="Links do rodapé">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Explorar
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={onEnter}
                    className="text-muted-foreground transition-colors hover:text-gold"
                  >
                    Começar gratuitamente
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollTo('como-funciona')}
                    className="text-muted-foreground transition-colors hover:text-gold"
                  >
                    Como funciona
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollTo('transparencia')}
                    className="text-muted-foreground transition-colors hover:text-gold"
                  >
                    Privacidade e transparência
                  </button>
                </li>
                <li>
                  <a
                    href="/admin"
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-gold"
                    aria-label="Abrir o painel de administração do projeto — acesso restrito ao operador"
                    title="Painel de administração — acesso restrito ao operador"
                  >
                    <ShieldCheck className="h-4 w-4 text-gold" aria-hidden="true" />
                    Administração
                  </a>
                </li>
              </ul>
            </nav>

            {/* Contato e apoio */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Contato &amp; apoio
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-[#25D366]"
                    aria-label="Falar com o criador pelo WhatsApp — abre em nova aba ou no aplicativo"
                    title="Abre uma conversa no WhatsApp com o criador do projeto"
                  >
                    <WhatsAppIcon className="h-4 w-4 text-[#25D366]" aria-hidden="true" />
                    WhatsApp — fale comigo
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setPixOpen(true)}
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-gold"
                    aria-label="Apoiar o projeto via Pix — abre painel com a chave Pix para copiar"
                  >
                    <HeartHandshake className="h-4 w-4 text-gold" aria-hidden="true" />
                    Apoiar o projeto via Pix
                  </button>
                </li>
                <li>
                  <a
                    href={PERSONAL_SITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-gold"
                    aria-label="Visitar o site pessoal do criador — abre em nova aba"
                    title="Abre em nova aba: https://clodoaldo.vercel.app/"
                  >
                    <ExternalLink className="h-4 w-4 text-gold" aria-hidden="true" />
                    Site pessoal do criador
                  </a>
                </li>
              </ul>
            </div>

            {/* Redes sociais — as mesmas do rodapé do site pessoal do criador */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Redes sociais
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-[#E4405F]"
                    aria-label={`Seguir no Instagram (${INSTAGRAM_HANDLE}) — abre em nova aba`}
                    title={`Instagram ${INSTAGRAM_HANDLE}`}
                  >
                    <InstagramIcon className="h-4 w-4 text-[#E4405F]" aria-hidden="true" />
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href={TIKTOK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`Seguir no TikTok (${TIKTOK_HANDLE}) — abre em nova aba`}
                    title={`TikTok ${TIKTOK_HANDLE}`}
                  >
                    <TikTokIcon className="h-4 w-4 text-foreground" aria-hidden="true" />
                    TikTok
                  </a>
                </li>
                <li>
                  <a
                    href={YOUTUBE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-[#FF0000]"
                    aria-label={`Inscrever-se no canal do YouTube (${YOUTUBE_HANDLE}) — abre em nova aba`}
                    title={`YouTube ${YOUTUBE_HANDLE}`}
                  >
                    <YouTubeIcon className="h-4 w-4 text-[#FF0000]" aria-hidden="true" />
                    YouTube
                  </a>
                </li>
                <li>
                  <a
                    href={CONTACT_EMAIL_URL}
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-gold"
                    aria-label={`Enviar e-mail para ${CONTACT_EMAIL}`}
                    title={CONTACT_EMAIL_URL}
                  >
                    <Mail className="h-4 w-4 text-gold" aria-hidden="true" />
                    E-mail
                  </a>
                </li>
                <li>
                  <a
                    href={BIO_SITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-gold"
                    aria-label="Abrir a página bio.site do criador — abre em nova aba"
                    title="Abre em nova aba: https://bio.site/clodoadosilva"
                  >
                    <Link2 className="h-4 w-4 text-gold" aria-hidden="true" />
                    Bio.site
                  </a>
                </li>
                <li>
                  <a
                    href={LINKTREE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-[#43E55C]"
                    aria-label="Abrir a Linktree do criador — abre em nova aba"
                    title="Abre em nova aba: https://linktr.ee/clodoaldo608"
                  >
                    <LinktreeIcon className="h-4 w-4 text-[#43E55C]" aria-hidden="true" />
                    Linktree
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="gold-divider mt-10" />

          <div className="mt-6 space-y-2 text-xs leading-relaxed text-muted-foreground">
            <p>
              © {year} Diário da Riqueza. Ferramenta de organização pessoal — não
              oferece garantia de retorno financeiro, não promete enriquecimento e
              não substitui orientação profissional.
            </p>
            <p>
              Seus dados ficam armazenados apenas no seu dispositivo. Contribuições
              via Pix são opcionais e não desbloqueiam recursos.
            </p>
          </div>
        </div>
      </footer>

      {/* Modal de apoio via Pix (compartilhado com o rodapé) */}
      <PixSupportDialog open={pixOpen} onOpenChange={setPixOpen} />
    </div>
  );
}

