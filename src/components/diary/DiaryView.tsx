'use client';

/**
 * Diário Diário — vista principal do core:
 * - Aba Entradas: lista filtrável com detalhes (incl. anexos)
 * - Aba Calendário: mês visual com marcações
 * - Aba Templates: criação/gerenciamento de templates
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  NotebookPen, Plus, CalendarDays, LayoutTemplate, Search, Trash2, Pencil,
  Coins, AlarmClock, Dumbbell, UtensilsCrossed, BookOpen, ListChecks,
  BrainCircuit, HandMetal, Flame, Paperclip,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MonthCalendar } from '@/components/diary/MonthCalendar';
import { DiaryEntryForm } from '@/components/diary/DiaryEntryForm';
import { useEntries, useAttachments, useTemplates, useEntryByDate } from '@/hooks/useData';
import { deleteEntry, addTemplate, deleteTemplate, deleteAttachment } from '@/db/actions';
import { todayISO } from '@/db';
import { useAppStore } from '@/stores/useAppStore';
import { formatBRL, formatLongDate, MONTH_NAMES } from '@/lib/format';
import { MOOD_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import type { MoodType, DiaryEntry } from '@/types';

export function DiaryView() {
  const selectedYear = useAppStore((s) => s.selectedYear);
  const entries = useEntries(selectedYear);
  const templates = useTemplates();

  const [filter, setFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editDate, setEditDate] = useState<string | null>(null);
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return entries.filter((e) => {
      if (monthFilter !== 'todos' && !e.date.startsWith(`${selectedYear}-${monthFilter}`)) return false;
      if (!q) return true;
      return [e.practice, e.thoughts, e.studySummary, e.studyTopic, e.productiveActions]
        .filter(Boolean)
        .join(' • ')
        .toLowerCase()
        .includes(q);
    });
  }, [entries, filter, monthFilter, selectedYear]);

  function openNewEntry() {
    setEditDate(null);
    setFormOpen(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Diário Diário</h2>
          <p className="text-sm text-muted-foreground">
            {entries.length} registro(s) em {selectedYear} — consistência é tudo.
          </p>
        </div>
        <Button onClick={openNewEntry} className="bg-gold text-black hover:bg-gold-light">
          <Plus className="mr-1.5 h-4 w-4" /> Registrar Hoje
        </Button>
      </div>

      <Tabs defaultValue="entradas">
        <TabsList className="grid w-full grid-cols-3 sm:w-96">
          <TabsTrigger value="entradas" className="gap-1.5">
            <NotebookPen className="h-4 w-4" /> Entradas
          </TabsTrigger>
          <TabsTrigger value="calendario" className="gap-1.5">
            <CalendarDays className="h-4 w-4" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <LayoutTemplate className="h-4 w-4" /> Templates
          </TabsTrigger>
        </TabsList>

        {/* ======================= ENTRADAS ======================= */}
        <TabsContent value="entradas" className="mt-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar em práticas, reflexões, estudos…"
                className="pl-9"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {MONTH_NAMES.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1).padStart(2, '0')}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border py-14 text-center">
              <NotebookPen className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma entrada encontrada. Comece registrando hoje!
              </p>
            </div>
          )}

          <div className="space-y-3">
            {filtered.map((e) => (
              <Card key={e.id} className="premium-card transition-colors hover:border-gold/40">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setDetailDate(e.date)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-lg font-bold">
                          {e.date.split('-').reverse().slice(0, 2).join('/')}
                        </p>
                        {e.mood && (
                          <Badge variant="secondary" className="text-[11px]">
                            {MOOD_LABELS[e.mood as MoodType]}
                          </Badge>
                        )}
                        {e.exerciseDone && (
                          <Badge variant="outline" className="gap-1 text-[11px] border-emerald-wealth/40 text-emerald-wealth">
                            <Dumbbell className="h-3 w-3" /> Treino
                          </Badge>
                        )}
                        {e.energy != null && (
                          <Badge variant="outline" className="text-[11px]">
                            ⚡ {e.energy}/10
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                        <HandMetal className="mr-1 inline h-3.5 w-3.5 text-gold" />
                        {e.practice}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {e.wakeTime && (
                          <span><AlarmClock className="mr-1 inline h-3 w-3" />{e.wakeTime}</span>
                        )}
                        {e.studyTopic && (
                          <span><BookOpen className="mr-1 inline h-3 w-3" />{e.studyTopic}</span>
                        )}
                        <span className="text-emerald-wealth">+{formatBRL(e.income)}</span>
                        <span className="text-loss">−{formatBRL(e.expense)}</span>
                        {e.xpEarned > 0 && (
                          <span className="text-gold"><Flame className="mr-1 inline h-3 w-3" />{e.xpEarned} XP</span>
                        )}
                      </div>
                    </button>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${e.date}`}
                        onClick={() => {
                          setEditDate(e.date);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir ${e.date}`}
                        className="text-loss hover:text-loss"
                        onClick={() => setConfirmDelete(e.date)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ======================= CALENDÁRIO ======================= */}
        <TabsContent value="calendario" className="mt-4">
          <MonthCalendar
            year={selectedYear}
            entries={entries}
            onSelectDay={(date, hasEntry) => {
              if (hasEntry) setDetailDate(date);
              else {
                setEditDate(date);
                setFormOpen(true);
              }
            }}
          />
        </TabsContent>

        {/* ======================= TEMPLATES ======================= */}
        <TabsContent value="templates" className="mt-4">
          <TemplatesTab templates={templates} />
        </TabsContent>
      </Tabs>

      {/* Formulário */}
      <DiaryEntryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        date={editDate}
      />

      {/* Detalhe da entrada */}
      <EntryDetailDialog
        date={detailDate}
        onEdit={(d) => {
          setDetailDate(null);
          setEditDate(d);
          setFormOpen(true);
        }}
        onClose={() => setDetailDate(null)}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              O registro de {confirmDelete?.split('-').reverse().join('/')} e seus anexos serão
              apagados permanentemente deste dispositivo. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                if (confirmDelete) {
                  await deleteEntry(confirmDelete);
                  toast.success('Registro excluído.');
                }
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

/* =========================== DETALHE DA ENTRADA =========================== */

function EntryDetailDialog({
  date,
  onEdit,
  onClose,
}: {
  date: string | null;
  onEdit: (date: string) => void;
  onClose: () => void;
}) {
  const entry = useEntryByDate(date);
  const attachments = useAttachments(date);

  return (
    <Dialog open={!!date} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="font-display text-xl">
            {date ? formatLongDate(date) : ''}
          </DialogTitle>
          <DialogDescription>Registro completo do dia</DialogDescription>
        </DialogHeader>
        {entry && (
          <ScrollArea className="max-h-[calc(90dvh-9rem)]">
            <div className="space-y-4 px-6 py-5 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Detail icon={AlarmClock} label="Acordou" value={entry.wakeTime ?? '—'} />
                <Detail
                  icon={Dumbbell}
                  label="Exercício"
                  value={entry.exerciseDone ? `Sim — ${entry.exercise ?? ''}` : 'Não'}
                />
                <Detail icon={UtensilsCrossed} label="Alimentação" value={entry.meals ?? '—'} />
                <Detail
                  icon={Coins}
                  label="Financeiro"
                  value={`+${formatBRL(entry.income)} / −${formatBRL(entry.expense)}`}
                  valueClass={entry.income - entry.expense >= 0 ? 'text-emerald-wealth' : 'text-loss'}
                />
              </div>
              {entry.studyTopic && (
                <Section icon={BookOpen} title={`Estudo: ${entry.studyTopic}`}>
                  {entry.studySummary}
                </Section>
              )}
              {entry.productiveActions && (
                <Section icon={ListChecks} title="Ações produtivas">
                  {entry.productiveActions}
                </Section>
              )}
              {entry.thoughts && (
                <Section icon={BrainCircuit} title="Pensamentos / reflexões">
                  {entry.thoughts}
                </Section>
              )}
              <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-gold">
                  <HandMetal className="h-3.5 w-3.5" /> EM PRÁTICA HOJE
                </p>
                <p className="mt-1.5 text-sm">{entry.practice}</p>
              </div>

              {entry.mood && (
                <p className="text-xs text-muted-foreground">
                  Humor: {MOOD_LABELS[entry.mood as MoodType]}
                  {entry.energy != null && ` • Energia ${entry.energy}/10`}
                  {entry.xpEarned > 0 && ` • ${entry.xpEarned} XP no dia`}
                </p>
              )}

              {attachments.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                    <Paperclip className="h-3.5 w-3.5 text-gold" /> Anexos ({attachments.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {attachments.map((a) =>
                      a.mime.startsWith('image/') ? (
                        <img
                          key={a.id}
                          src={a.dataUrl}
                          alt={a.name}
                          className="h-20 w-full rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <div
                          key={a.id}
                          className="flex h-20 flex-col items-center justify-center rounded-lg border border-border text-[10px] text-muted-foreground"
                        >
                          <span className="text-gold">PDF</span>
                          <span className="max-w-full truncate px-1">{a.name}</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => date && onEdit(date)}
              >
                <Pencil className="mr-1.5 h-4 w-4" /> Editar registro
              </Button>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  icon: Icon, label, value, valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className={cn('mt-1 font-semibold', valueClass)}>{value}</p>
    </div>
  );
}

function Section({
  icon: Icon, title, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-gold" /> {title}
      </p>
      <p className="mt-1 whitespace-pre-line">{children}</p>
    </div>
  );
}

/* =========================== TEMPLATES =========================== */

function TemplatesTab({
  templates,
}: {
  templates: Array<{ id?: number; name: string; wakeTime?: string; exercise?: string; meals?: string; studyTopic?: string }>;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (name.trim().length < 2) return;
    setBusy(true);
    await addTemplate({ name: name.trim(), exerciseDone: false });
    toast.success('Template criado — edite os valores ao registrar e ele servirá de base.');
    setName('');
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 sm:p-5">
          <p className="text-sm font-semibold">Criar template</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Templates pré-preenchem a entrada diária com seus hábitos padrão.
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Ex.: Dia de trabalho profundo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={busy || name.trim().length < 2}>
              <Plus className="mr-1 h-4 w-4" /> Criar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex items-start justify-between p-4">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[t.wakeTime && `Acorda ${t.wakeTime}`, t.exercise, t.meals, t.studyTopic]
                    .filter(Boolean)
                    .join(' • ') || 'Sem pré-definições'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-loss hover:text-loss"
                aria-label={`Excluir template ${t.name}`}
                onClick={async () => {
                  if (t.id) {
                    await deleteTemplate(t.id);
                    toast.success('Template excluído.');
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
