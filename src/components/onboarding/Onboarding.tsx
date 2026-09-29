'use client';

/**
 * Onboarding — criação da conta local em 5 passos:
 * Boas-vindas → Identidade → Meta financeira → Pasta no dispositivo → Tema.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowRight, ArrowLeft, BookOpenCheck, CalendarClock, FolderOpen, HardDrive,
  Moon, Sun, Sparkles, Wallet, CheckCircle2, CloudOff, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { initializeDatabase } from '@/db';
import { connectRootFolder, isFSAvailable } from '@/filesystem';
import { useAppStore } from '@/stores/useAppStore';

const STEPS = ['Boas-vindas', 'Identidade', 'Meta', 'Pasta', 'Aparência'] as const;

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [journalName, setJournalName] = useState('Meu Diário da Riqueza');
  const [goal, setGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [folderName, setFolderName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const setFolder = useAppStore((s) => s.setFolder);
  const setThemeStore = useAppStore((s) => s.setTheme);
  const fsAvailable = isFSAvailable();

  const canNext =
    (step === 0) ||
    (step === 1 && name.trim().length >= 2 && journalName.trim().length >= 2) ||
    (step === 2 && parseFloat(goal) > 0 && targetDate.length === 10) ||
    step === 3 ||
    step === 4;

  async function handleConnectFolder() {
    setBusy(true);
    const result = await connectRootFolder();
    setBusy(false);
    if (result.ok) {
      setFolderName(result.folderName ?? null);
      setFolder(true, result.folderName);
      toast.success(`Pasta "${result.folderName}" conectada com subpastas criadas!`);
    } else if (result.error !== 'cancelled') {
      toast.info(result.error);
    }
  }

  async function handleFinish() {
    setBusy(true);
    try {
      await initializeDatabase({
        name: name.trim(),
        journalName: journalName.trim(),
        yearGoal: parseFloat(goal),
        targetDate,
      });
      setThemeStore(theme);
      setOnboarded(true);
    } catch (e) {
      toast.error('Erro ao inicializar o banco local: ' + String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      {/* Fundo decorativo */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 no-print"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 70%)',
        }}
      />

      <Card className="relative w-full max-w-xl border-gold/25 shadow-2xl shadow-gold/5">
        <CardContent className="p-6 sm:p-10">
          {/* Indicador de passos */}
          <div className="mb-8 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    i <= step ? 'bg-gold' : 'bg-border',
                  )}
                />
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              {/* ------------------------- PASSO 0 ------------------------- */}
              {step === 0 && (
                <div className="text-center py-6">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-gold/40 bg-gold/10 shadow-lg shadow-gold/10">
                    <BookOpenCheck className="h-10 w-10 text-gold" />
                  </div>
                  <h1 className="mt-6 font-display text-4xl font-black gold-gradient-text">
                    Diário da Riqueza
                  </h1>
                  <p className="mt-3 text-muted-foreground">
                    Treine sua mente para a riqueza todos os dias. Meta clara, orçamento,
                    estudos, prática registrada e consistência extrema.
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-3 text-left text-sm">
                    {[
                      ['100% offline', 'Seus dados ficam no seu dispositivo'],
                      ['Sua pasta', 'Backups e exportações no seu disco'],
                      ['Treino diário', 'Registro, prática e reflexão'],
                      ['Gamificação séria', 'XP, níveis e conquistas'],
                    ].map(([t, d]) => (
                      <div key={t} className="rounded-xl border border-border p-3">
                        <p className="font-semibold text-foreground">{t}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{d}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ------------------------- PASSO 1 ------------------------- */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Vamos começar</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Nenhuma conta, nenhum servidor. Tudo é criado aqui no seu dispositivo.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ob-name">Seu nome</Label>
                    <Input
                      id="ob-name"
                      placeholder="Ex.: Haroldo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ob-journal">Nome do diário</Label>
                    <Input
                      id="ob-journal"
                      placeholder="Meu Diário da Riqueza"
                      value={journalName}
                      onChange={(e) => setJournalName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* ------------------------- PASSO 2 ------------------------- */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Sua meta financeira</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Clareza é o primeiro passo. Defina o valor e a data-alvo.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ob-goal" className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-gold" /> Meta financeira (R$)
                    </Label>
                    <Input
                      id="ob-goal"
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="Ex.: 100000"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ob-date" className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-gold" /> Data-alvo
                    </Label>
                    <Input
                      id="ob-date"
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* ------------------------- PASSO 3 ------------------------- */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Sua pasta no dispositivo</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      O app criará a estrutura <code className="text-gold">Diario_da_Riqueza</code> com
                      subpastas <code className="text-gold">Backups</code>,{' '}
                      <code className="text-gold">Exportacoes</code>,{' '}
                      <code className="text-gold">Anexos</code> e{' '}
                      <code className="text-gold">Impressoes</code>.
                    </p>
                  </div>

                  {fsAvailable ? (
                    <div className="rounded-2xl border border-border p-5">
                      <div className="flex items-center gap-3">
                        <HardDrive className="h-5 w-5 text-gold" />
                        <div className="flex-1">
                          {folderName ? (
                            <p className="text-sm font-semibold text-emerald-wealth flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" /> Conectada: {folderName}
                            </p>
                          ) : (
                            <p className="text-sm font-semibold">Escolher ou criar pasta</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Permissão de leitura e escrita — você escolhe onde fica tudo.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={folderName ? 'secondary' : 'default'}
                        className="mt-4 w-full"
                        onClick={handleConnectFolder}
                        disabled={busy}
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        {folderName ? 'Trocar pasta' : 'Escolher pasta agora'}
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border bg-muted/40 p-5">
                      <div className="flex items-start gap-3">
                        <CloudOff className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-semibold">Navegador sem suporte a pastas reais</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Sem problema: o app salvará tudo internamente e usará downloads
                            automáticos para backups e exportações. Para pastas reais, use
                            Chrome ou Edge (desktop/Android).
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 rounded-xl bg-gold/5 border border-gold/20 p-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    <p className="text-xs text-muted-foreground">
                      Você pode conectar a pasta depois, em Configurações, a qualquer momento.
                    </p>
                  </div>
                </div>
              )}

              {/* ------------------------- PASSO 4 ------------------------- */}
              {step === 4 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Aparência</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      O modo escuro premium é o padrão. Você pode trocar quando quiser.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {(
                      [
                        ['dark', 'Escuro Premium', <Moon key="m" className="h-5 w-5" />],
                        ['light', 'Claro Papel', <Sun key="s" className="h-5 w-5" />],
                      ] as const
                    ).map(([mode, label, icon]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setTheme(mode)}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-2xl border p-6 transition-all',
                          theme === mode
                            ? 'border-gold bg-gold/10 shadow-md shadow-gold/10'
                            : 'border-border hover:border-gold/40',
                        )}
                      >
                        <span className="text-gold">{icon}</span>
                        <span className="text-sm font-semibold">{label}</span>
                        {theme === mode && (
                          <span className="text-[11px] font-medium text-gold">Selecionado</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div>
                      <p className="text-sm font-semibold">Modo premium escuro por padrão</p>
                      <p className="text-xs text-muted-foreground">Recomendado para leitura noturna</p>
                    </div>
                    <Sparkles className="h-5 w-5 text-gold" />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navegação */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="min-w-32 bg-gold text-black hover:bg-gold-light"
              >
                Avançar <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={busy}
                className="min-w-40 bg-gold text-black hover:bg-gold-light"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {busy ? 'Criando…' : 'Criar meu diário'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
