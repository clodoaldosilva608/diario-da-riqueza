'use client';

/**
 * Sonhos e Objetivos:
 * - Sonhos: lista livre com checkbox "realizado"
 * - Metas: mínimo recomendado de 10, categorizadas, com progresso visual
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Target, Plus, Star, Trash2, CheckCircle2, Circle, Sparkles, Pencil,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SectionHeader, EmptyState } from '@/components/shared/ui-kit';
import { useDreams, useGoals } from '@/hooks/useData';
import { addDream, toggleDream, deleteDream, addGoal, updateGoal, deleteGoal } from '@/db/actions';
import { useAppStore } from '@/stores/useAppStore';
import { GOAL_CATEGORY_LABELS } from '@/types';
import type { Goal, GoalCategory } from '@/types';
import { cn } from '@/lib/utils';

const CATEGORIES = Object.entries(GOAL_CATEGORY_LABELS) as Array<[GoalCategory, string]>;

export function GoalsView() {
  const dreams = useDreams();
  const goals = useGoals();
  const selectedYear = useAppStore((s) => s.selectedYear);

  const [dreamTitle, setDreamTitle] = useState('');
  const [goalDialog, setGoalDialog] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'sonho' | 'meta'; id: number } | null>(null);

  // Form de meta
  const [category, setCategory] = useState<GoalCategory>('financeira');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [deadline, setDeadline] = useState('');

  const completed = goals.filter((g) => g.status === 'concluida').length;
  const goalProgress = goals.length > 0 ? Math.round((completed / goals.length) * 100) : 0;
  const needMore = Math.max(0, 10 - goals.length);

  const byCategory = useMemo(() => {
    const map = new Map<GoalCategory, Goal[]>();
    for (const g of goals) {
      const arr = map.get(g.category) ?? [];
      arr.push(g);
      map.set(g.category, arr);
    }
    return map;
  }, [goals]);

  function openNewGoal() {
    setEditing(null);
    setCategory('financeira');
    setTitle('');
    setDescription('');
    setTargetValue('');
    setCurrentValue('');
    setDeadline('');
    setGoalDialog(true);
  }

  function openEditGoal(g: Goal) {
    setEditing(g);
    setCategory(g.category);
    setTitle(g.title);
    setDescription(g.description ?? '');
    setTargetValue(g.targetValue ? String(g.targetValue) : '');
    setCurrentValue(String(g.currentValue ?? ''));
    setDeadline(g.deadline ?? '');
    setGoalDialog(true);
  }

  async function handleSaveGoal() {
    if (title.trim().length < 3) {
      toast.error('Dê um título claro à meta.');
      return;
    }
    const payload = {
      category,
      title: title.trim(),
      description: description.trim() || undefined,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      currentValue: currentValue ? parseFloat(currentValue) : 0,
      deadline: deadline || undefined,
    };
    if (editing?.id) {
      await updateGoal(editing.id, payload);
      toast.success('Meta atualizada.');
    } else {
      const res = await addGoal(payload);
      toast.success('Meta criada. Cria possibilidades, não expectativas!');
      if (res.newAchievements.length) {
        res.newAchievements.forEach((a) => toast.success(`🏆 ${a.title}`, { description: a.description }));
      }
    }
    setGoalDialog(false);
  }

  async function handleDreamAdd() {
    if (dreamTitle.trim().length < 2) return;
    await addDream(dreamTitle.trim());
    setDreamTitle('');
    toast.success('Sonho adicionado à lista. Escreva, visualise, execute.');
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Target}
        title="Sonhos e Objetivos"
        subtitle={`${goals.length} metas • ${completed} concluídas • ${needMore > 0 ? `faltam ${needMore} para as 10 recomendadas` : 'meta das 10 cumprada! 🏆'}`}
        action={
          <Button onClick={openNewGoal} className="bg-gold text-black hover:bg-gold-light">
            <Plus className="mr-1.5 h-4 w-4" /> Nova meta
          </Button>
        }
      />

      {/* Progresso geral das metas */}
      <Card className="premium-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Execução das metas de {selectedYear}</span>
            <span className="text-gold font-bold tabular-nums">{goalProgress}%</span>
          </div>
          <Progress value={goalProgress} className="mt-2.5 h-2.5" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CATEGORIES.map(([key, label]) => {
              const arr = byCategory.get(key) ?? [];
              return (
                <Badge
                  key={key}
                  variant="outline"
                  className={cn(
                    'text-[11px]',
                    arr.length === 0 ? 'opacity-40' : 'border-gold/35 text-gold',
                  )}
                >
                  {label}: {arr.length}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sonhos */}
      <Card>
        <CardContent className="p-5">
          <p className="flex items-center gap-2 font-display text-lg font-bold">
            <Star className="h-5 w-5 text-gold" /> Meus sonhos
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Lista livre — sonhos grandes e pequenos. Quem escreve, materializa.
          </p>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Ex.: Casa própria para a família"
              value={dreamTitle}
              onChange={(e) => setDreamTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDreamAdd()}
            />
            <Button variant="secondary" onClick={handleDreamAdd}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {dreams.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum sonho listado ainda — comece com 3.
              </p>
            )}
            {dreams.map((d) => (
              <div
                key={d.id}
                className="group flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-gold/35"
              >
                <button
                  aria-label={d.achieved ? 'Marcar como não realizado' : 'Marcar como realizado'}
                  onClick={() => d.id && toggleDream(d).then((r) => {
                    if (r.newAchievements.length) {
                      r.newAchievements.forEach((a) =>
                        toast.success(`🏆 ${a.title}`, { description: a.description }),
                      );
                    }
                  })}
                >
                  {d.achieved ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-wealth" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <span className={cn('flex-1 text-sm', d.achieved && 'text-muted-foreground line-through')}>
                  {d.title}
                </span>
                {d.achieved && <Badge className="bg-emerald-wealth/15 text-emerald-wealth">Realizado</Badge>}
                <button
                  aria-label={`Excluir sonho ${d.title}`}
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-loss group-hover:opacity-100"
                  onClick={() => d.id && setConfirmDelete({ kind: 'sonho', id: d.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metas por categoria */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
          <Sparkles className="h-5 w-5 text-gold" /> Metas categorizadas
        </h3>
        {goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nenhuma meta definida"
            description="O método pede no mínimo 10 metas: Saúde, Financeira, Relacionamento, Espiritual, Carreira, Estilo de Vida e Outros."
            action={
              <Button onClick={openNewGoal} className="bg-gold text-black hover:bg-gold-light">
                <Plus className="mr-1.5 h-4 w-4" /> Criar primeira meta
              </Button>
            }
          />
        ) : (
          <div className="space-y-5">
            {CATEGORIES.filter(([key]) => (byCategory.get(key) ?? []).length > 0).map(
              ([key, label]) => (
                <div key={key}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label} ({(byCategory.get(key) ?? []).length})
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(byCategory.get(key) ?? []).map((g) => {
                      const pct = g.targetValue
                        ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))
                        : g.status === 'concluida'
                          ? 100
                          : 0;
                      return (
                        <Card key={g.id} className={cn('transition-colors', g.status === 'concluida' ? 'border-emerald-wealth/40' : 'hover:border-gold/40')}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className={cn('text-sm font-semibold', g.status === 'concluida' && 'line-through text-muted-foreground')}>
                                  {g.title}
                                </p>
                                {g.deadline && (
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    Prazo: {g.deadline.split('-').reverse().join('/')}
                                  </p>
                                )}
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <button
                                  aria-label={`Editar meta ${g.title}`}
                                  className="text-muted-foreground hover:text-foreground"
                                  onClick={() => openEditGoal(g)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  aria-label={`Excluir meta ${g.title}`}
                                  className="text-muted-foreground hover:text-loss"
                                  onClick={() => g.id && setConfirmDelete({ kind: 'meta', id: g.id })}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            {g.description && (
                              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{g.description}</p>
                            )}
                            {g.targetValue ? (
                              <>
                                <Progress value={pct} className="mt-3 h-2" />
                                <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span>
                                    {g.currentValue.toLocaleString('pt-BR')} / {g.targetValue.toLocaleString('pt-BR')}
                                  </span>
                                  <span className="font-semibold text-gold">{pct}%</span>
                                </div>
                              </>
                            ) : null}
                            <div className="mt-3">
                              <Button
                                size="sm"
                                variant={g.status === 'concluida' ? 'secondary' : 'outline'}
                                className={cn(
                                  'h-7 text-xs',
                                  g.status !== 'concluida' && 'border-gold/40 text-gold hover:bg-gold/10',
                                )}
                                onClick={() =>
                                  g.id &&
                                  updateGoal(g.id, {
                                    status: g.status === 'concluida' ? 'ativa' : 'concluida',
                                  }).then((r) => {
                                    if (r.xpGained > 0) toast.success(`Meta concluída! +${r.xpGained} XP`);
                                    r.newAchievements.forEach((a) =>
                                      toast.success(`🏆 ${a.title}`, { description: a.description }),
                                    );
                                  })
                                }
                              >
                                {g.status === 'concluida' ? 'Reabrir' : 'Concluir (+25 XP)'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* Dialog de meta */}
      <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Editar meta' : 'Nova meta'}</DialogTitle>
            <DialogDescription>
              Metas claras e prazos definidos transformam desejo em plano.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as GoalCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-title">Título</Label>
              <Input
                id="goal-title"
                placeholder="Ex.: Investir R$ 12.000 em renda fixa"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-desc">Descrição</Label>
              <Textarea
                id="goal-desc"
                rows={2}
                placeholder="Por que essa meta importa?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="goal-target">Valor-alvo</Label>
                <Input
                  id="goal-target"
                  type="number"
                  min="0"
                  placeholder="Ex.: 12000"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-current">Já conquistei</Label>
                <Input
                  id="goal-current"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-deadline">Prazo</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveGoal} className="w-full bg-gold text-black hover:bg-gold-light">
              {editing ? 'Salvar alterações' : 'Criar meta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exclusão */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {confirmDelete?.kind === 'sonho' ? 'sonho' : 'meta'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é permanente neste dispositivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmDelete) return;
                if (confirmDelete.kind === 'sonho') await deleteDream(confirmDelete.id);
                else await deleteGoal(confirmDelete.id);
                toast.success('Excluído.');
                setConfirmDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
