'use client';

/**
 * Formulário da entrada diária — o coração do app.
 * Campos: despertar, exercício, alimentação, estudo, ações produtivas,
 * receita/despesa, reflexões, PRÁTICA (obrigatório), humor/energia e anexos.
 * Suporta templates e valida com Zod.
 */

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlarmClock, Dumbbell, UtensilsCrossed, BookOpen, ListChecks, Coins,
  BrainCircuit, HandMetal, ImagePlus, Save, LayoutTemplate, X,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { parseBRLNumber } from '@/lib/format';
import { MoneyInput } from '@/components/ui/money-input';
import { saveEntry, addAttachment, deleteAttachment } from '@/db/actions';
import { db, todayISO } from '@/db';
import { useAttachments, useEntryByDate, useTemplates } from '@/hooks/useData';
import { useAppStore } from '@/stores/useAppStore';
import { MOOD_LABELS } from '@/types';
import type { MoodType } from '@/types';

const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  practice: z.string().trim().min(3, 'Descreva o que você colocou em prática (mín. 3 caracteres)'),
  income: z.coerce.number().min(0),
  expense: z.coerce.number().min(0),
  energy: z.number().int().min(1).max(10),
});

export interface DiaryEntryFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Data editada (yyyy-MM-dd) ou null = hoje */
  date: string | null;
  /** Callback após salvar com XP ganho */
  onSaved?: (xp: number) => void;
}

export function DiaryEntryForm({ open, onOpenChange, date, onSaved }: DiaryEntryFormProps) {
  const selectedYear = useAppStore((s) => s.selectedYear);
  const celebrate = useAppStore((s) => s.celebrate);

  const effectiveDate = date ?? todayISO();
  const existing = useEntryByDate(open ? effectiveDate : null);
  const attachments = useAttachments(open ? effectiveDate : null);
  const templates = useTemplates();

  // ---- Estado do formulário ----
  const [formDate, setFormDate] = useState(effectiveDate);
  const [wakeTime, setWakeTime] = useState('');
  const [exercise, setExercise] = useState('');
  const [exerciseDone, setExerciseDone] = useState(false);
  const [meals, setMeals] = useState('');
  const [studyTopic, setStudyTopic] = useState('');
  const [studySummary, setStudySummary] = useState('');
  const [productiveActions, setProductiveActions] = useState('');
  const [income, setIncome] = useState('');
  const [expense, setExpense] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [practice, setPractice] = useState('');
  const [mood, setMood] = useState<MoodType | ''>('');
  const [energy, setEnergy] = useState(7);
  const [saving, setSaving] = useState(false);

  // Carrega a entrada existente (ou reseta) quando abre
  useEffect(() => {
    if (!open) return;
    setFormDate(effectiveDate);
    if (existing) {
      setWakeTime(existing.wakeTime ?? '');
      setExercise(existing.exercise ?? '');
      setExerciseDone(existing.exerciseDone);
      setMeals(existing.meals ?? '');
      setStudyTopic(existing.studyTopic ?? '');
      setStudySummary(existing.studySummary ?? '');
      setProductiveActions(existing.productiveActions ?? '');
      setIncome(existing.income ? String(existing.income) : '');
      setExpense(existing.expense ? String(existing.expense) : '');
      setThoughts(existing.thoughts ?? '');
      setPractice(existing.practice ?? '');
      setMood(existing.mood ?? '');
      setEnergy(existing.energy ?? 7);
    } else {
      setWakeTime('');
      setExercise('');
      setExerciseDone(false);
      setMeals('');
      setStudyTopic('');
      setStudySummary('');
      setProductiveActions('');
      setIncome('');
      setExpense('');
      setThoughts('');
      setPractice('');
      setMood('');
      setEnergy(7);
    }
  }, [open, effectiveDate, existing?.id]);

  async function applyTemplate(templateId: string) {
    const t = templates.find((x) => String(x.id) === templateId);
    if (!t) return;
    setWakeTime(t.wakeTime ?? '');
    setExercise(t.exercise ?? '');
    setExerciseDone(t.exerciseDone);
    setMeals(t.meals ?? '');
    setStudyTopic(t.studyTopic ?? '');
    setProductiveActions(t.productiveActions ?? '');
    setMood(t.mood ?? '');
    if (typeof t.energy === 'number') setEnergy(t.energy);
    toast.success(`Template "${t.name}" aplicado`);
  }

  async function handleSave() {
    const parsed = entrySchema.safeParse({
      date: formDate,
      practice,
      income: parseBRLNumber(income) || 0,
      expense: parseBRLNumber(expense) || 0,
      energy,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    // Bloqueia datas fora do diário (ano selecionado)
    if (!formDate.startsWith(String(selectedYear))) {
      toast.error(`Este diário é do ano ${selectedYear}. Troque o ano no topo para registrar outras datas.`);
      return;
    }

    setSaving(true);
    try {
      const result = await saveEntry({
        date: formDate,
        wakeTime: wakeTime || undefined,
        exercise: exercise || undefined,
        exerciseDone,
        meals: meals || undefined,
        studyTopic: studyTopic || undefined,
        studySummary: studySummary || undefined,
        productiveActions: productiveActions || undefined,
        income: parsed.data.income,
        expense: parsed.data.expense,
        thoughts: thoughts || undefined,
        practice: parsed.data.practice,
        mood: mood || undefined,
        energy,
      });

      const levelUpMessage = result.newAchievements.length
        ? ` Conquista: ${result.newAchievements.map((a) => a.title).join(', ')}!`
        : '';
      if (result.xpGained > 0) {
        celebrate(result.xpGained, `Dia registrado com disciplina.${levelUpMessage}`);
      } else {
        toast.success('Dia atualizado com sucesso.');
      }
      result.newAchievements.forEach((a) => toast.success(`🏆 ${a.title}`, { description: a.description }));
      onSaved?.(result.xpGained);
      onOpenChange(false);
    } catch (e) {
      toast.error('Erro ao salvar: ' + String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 4 * 1024 * 1024) {
        toast.warning(`"${file.name}" maior que 4MB — reduza a imagem.`);
        continue;
      }
      await addAttachment(formDate, file);
    }
    e.target.value = '';
    toast.success('Anexo adicionado');
  }

  const moodOptions = useMemo(
    () => (Object.keys(MOOD_LABELS) as MoodType[]).map((m) => ({ value: m, label: MOOD_LABELS[m] })),
    [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-full max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="font-display text-xl">
            {existing ? 'Editar registro do dia' : 'Registrar meu dia'}
          </DialogTitle>
          <DialogDescription>
            Treino de {formDate.split('-').reverse().join('/')} — disciplina registrada é
            disciplina treinada.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92dvh-10rem)]">
          <div className="space-y-5 px-6 py-5">
            {/* Data + Template */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="de-date">Data</Label>
                <Input
                  id="de-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              {templates.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <LayoutTemplate className="h-3.5 w-3.5 text-gold" /> Template
                  </Label>
                  <Select onValueChange={applyTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Aplicar template…" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Despertar + Exercício */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="de-wake" className="flex items-center gap-1.5">
                  <AlarmClock className="h-3.5 w-3.5 text-gold" /> Horário que acordou
                </Label>
                <Input
                  id="de-wake"
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="de-ex" className="flex items-center gap-1.5">
                  <Dumbbell className="h-3.5 w-3.5 text-gold" /> Exercício físico
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="de-ex"
                    placeholder="Ex.: caminhada 30min"
                    value={exercise}
                    onChange={(e) => setExercise(e.target.value)}
                  />
                  <Switch checked={exerciseDone} onCheckedChange={setExerciseDone} aria-label="Fez exercício?" />
                </div>
              </div>
            </div>

            {/* Alimentação */}
            <div className="space-y-1.5">
              <Label htmlFor="de-meals" className="flex items-center gap-1.5">
                <UtensilsCrossed className="h-3.5 w-3.5 text-gold" /> Alimentação
              </Label>
              <Input
                id="de-meals"
                placeholder="Como você se alimentou hoje?"
                value={meals}
                onChange={(e) => setMeals(e.target.value)}
              />
            </div>

            {/* Estudos */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <BookOpen className="h-4 w-4 text-gold" /> Estudo do dia
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Tema (ex.: CDB)"
                  value={studyTopic}
                  onChange={(e) => setStudyTopic(e.target.value)}
                />
                <Input
                  placeholder="Resumo do aprendizado"
                  value={studySummary}
                  onChange={(e) => setStudySummary(e.target.value)}
                />
              </div>
            </div>

            {/* Ações produtivas */}
            <div className="space-y-1.5">
              <Label htmlFor="de-actions" className="flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5 text-gold" /> Ações produtivas (1 por linha)
              </Label>
              <Textarea
                id="de-actions"
                rows={3}
                placeholder={'1. Prospetei 3 clientes\n2. Revisei meu orçamento'}
                value={productiveActions}
                onChange={(e) => setProductiveActions(e.target.value)}
              />
            </div>

            {/* Financeiro do dia */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="de-income" className="flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-emerald-wealth" /> Receita do dia (R$)
                </Label>
                <MoneyInput
                  id="de-income"
                  placeholder="0,00"
                  value={income}
                  onValueChange={setIncome}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="de-expense" className="flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-loss" /> Despesa do dia (R$)
                </Label>
                <MoneyInput
                  id="de-expense"
                  placeholder="0,00"
                  value={expense}
                  onValueChange={setExpense}
                />
              </div>
            </div>

            {/* Reflexões */}
            <div className="space-y-1.5">
              <Label htmlFor="de-thoughts" className="flex items-center gap-1.5">
                <BrainCircuit className="h-3.5 w-3.5 text-gold" /> Pensamentos / reflexões
              </Label>
              <Textarea
                id="de-thoughts"
                rows={3}
                placeholder="O que passou pela sua cabeça hoje?"
                value={thoughts}
                onChange={(e) => setThoughts(e.target.value)}
              />
            </div>

            {/* PRÁTICA — OBRIGATÓRIO */}
            <div className="space-y-1.5 rounded-xl border border-gold/30 bg-gold/5 p-4">
              <Label htmlFor="de-practice" className="flex items-center gap-1.5 text-gold">
                <HandMetal className="h-4 w-4" /> O que coloquei em prática hoje? *
              </Label>
              <Textarea
                id="de-practice"
                rows={3}
                required
                placeholder="Conhecimento sem ação é entretenimento. O que você EXECUTOU hoje?"
                value={practice}
                onChange={(e) => setPractice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Campo obrigatório — +40 XP por colocar em prática.
              </p>
            </div>

            {/* Humor / Energia */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Humor</Label>
                <Select value={mood || undefined} onValueChange={(v) => setMood(v as MoodType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Como você está?" />
                  </SelectTrigger>
                  <SelectContent>
                    {moodOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Energia: <span className="text-gold font-semibold">{energy}/10</span></Label>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[energy]}
                  onValueChange={([v]) => setEnergy(v)}
                />
              </div>
            </div>

            {/* Anexos */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ImagePlus className="h-3.5 w-3.5 text-gold" /> Anexos (recibos, prints)
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-gold/50 hover:text-foreground">
                  Adicionar arquivos
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFilePicked} />
                </label>
                {attachments.map((a) => (
                  <span
                    key={a.id}
                    className="group flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs"
                  >
                    {a.mime.startsWith('image/') ? (
                      <img src={a.dataUrl} alt={a.name} className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <span className="text-gold">PDF</span>
                    )}
                    <span className="max-w-28 truncate">{a.name}</span>
                    <button
                      aria-label={`Remover ${a.name}`}
                      className="opacity-50 hover:opacity-100"
                      onClick={() => a.id && deleteAttachment(a.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Ações */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-6 py-4">
          <p className={cn('text-xs', practice.trim().length >= 3 ? 'text-muted-foreground' : 'text-loss')}>
            {practice.trim().length >= 3
              ? 'Pronto para registrar. Vai pra cima com força!'
              : 'A prática do dia é obrigatória.'}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gold text-black hover:bg-gold-light">
              <Save className="mr-1.5 h-4 w-4" />
              {existing ? 'Salvar alterações' : 'Registrar dia (+50 XP)'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
