'use client';

/**
 * Biblioteca de Estudos — Finanças e Negócios com curriculum pré-semeado,
 * progresso por tema, campo "O que aprendi" e XP por conclusão.
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  LibraryBig, Plus, BookOpen, GraduationCap, TrendingUp, Briefcase, Trash2, Save,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SectionHeader, StatCard } from '@/components/shared/ui-kit';
import { useStudies } from '@/hooks/useData';
import { addStudyTopic, updateStudy, deleteStudy } from '@/db/actions';
import { STUDY_AREA_LABELS } from '@/types';
import type { Study, StudyArea, StudyStatus } from '@/types';
import { cn } from '@/lib/utils';

const STATUS_META: Record<StudyStatus, { label: string; cls: string }> = {
  nao_iniciado: { label: 'Não iniciado', cls: 'bg-muted text-muted-foreground' },
  estudando: { label: 'Estudando', cls: 'bg-gold/15 text-gold' },
  concluido: { label: 'Concluído', cls: 'bg-emerald-wealth/15 text-emerald-wealth' },
};

export function LibraryView() {
  const studies = useStudies();
  const [areaFilter, setAreaFilter] = useState<'todas' | StudyArea>('todas');
  const [newTopic, setNewTopic] = useState('');
  const [newArea, setNewArea] = useState<StudyArea>('financas');

  const completed = studies.filter((s) => s.status === 'concluido').length;
  const overall = studies.length > 0 ? Math.round(studies.reduce((s, x) => s + x.progress, 0) / studies.length) : 0;

  const filtered = useMemo(
    () => (areaFilter === 'todas' ? studies : studies.filter((s) => s.area === areaFilter)),
    [studies, areaFilter],
  );

  const byArea = useMemo(() => {
    const areas: StudyArea[] = ['financas', 'negocios', 'outros'];
    return areas.map((a) => {
      const arr = studies.filter((s) => s.area === a);
      const pct = arr.length > 0 ? Math.round(arr.reduce((s, x) => s + x.progress, 0) / arr.length) : 0;
      return { area: a, total: arr.length, done: arr.filter((s) => s.status === 'concluido').length, pct };
    });
  }, [studies]);

  async function handleAddTopic() {
    if (newTopic.trim().length < 2) return;
    await addStudyTopic({ area: newArea, topic: newTopic.trim() });
    setNewTopic('');
    toast.success('Tema adicionado à biblioteca.');
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={LibraryBig}
        title="Biblioteca de Estudos"
        subtitle="Finanças e Negócios — 30 minutos por dia constroem autoridade"
      />

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Temas" value={String(studies.length)} icon={BookOpen} />
        <StatCard label="Concluídos" value={String(completed)} icon={GraduationCap} tone="green" />
        <StatCard label="Progresso geral" value={`${overall}%`} icon={TrendingUp} tone="gold" />
        <StatCard
          label="Em estudo"
          value={String(studies.filter((s) => s.status === 'estudando').length)}
          icon={Briefcase}
        />
      </div>

      {/* Barras por área */}
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          {byArea.map((a) => (
            <div key={a.area}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">{STUDY_AREA_LABELS[a.area]}</span>
                <span className="text-xs text-muted-foreground">
                  {a.done}/{a.total} • {a.pct}%
                </span>
              </div>
              <Progress value={a.pct} className="mt-2 h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Filtro + adicionar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={areaFilter} onValueChange={(v) => setAreaFilter(v as 'todas' | StudyArea)}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="financas">Finanças</TabsTrigger>
            <TabsTrigger value="negocios">Negócios</TabsTrigger>
            <TabsTrigger value="outros">Outros</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Select value={newArea} onValueChange={(v) => setNewArea(v as StudyArea)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['financas', 'negocios', 'outros'] as StudyArea[]).map((a) => (
                <SelectItem key={a} value={a}>
                  {STUDY_AREA_LABELS[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Adicionar tema…"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
          />
          <Button variant="secondary" onClick={handleAddTopic}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lista de temas */}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((s) => (
          <StudyCard key={s.id} study={s} />
        ))}
      </div>
    </div>
  );
}

function StudyCard({ study }: { study: Study }) {
  const [notes, setNotes] = useState(study.notes ?? '');
  const [notesDirty, setNotesDirty] = useState(false);

  async function setProgress(progress: number) {
    if (!study.id) return;
    const res = await updateStudy(study.id, {
      progress,
      status: progress >= 100 ? 'concluido' : progress > 0 ? 'estudando' : study.status,
    });
    if (res.xpGained > 0) {
      toast.success(`Estudo concluído! +${res.xpGained} XP — conhecimento aplicado é poder.`);
    }
    res.newAchievements.forEach((a) => toast.success(`🏆 ${a.title}`, { description: a.description }));
  }

  async function setStatus(status: StudyStatus) {
    if (!study.id) return;
    const res = await updateStudy(study.id, { status });
    if (res.xpGained > 0) {
      toast.success(`Estudo concluído! +${res.xpGained} XP`);
    }
    res.newAchievements.forEach((a) => toast.success(`🏆 ${a.title}`, { description: a.description }));
  }

  return (
    <Card className={cn('transition-colors', study.status === 'concluido' ? 'border-emerald-wealth/35' : 'hover:border-gold/35')}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{study.topic}</p>
            {study.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{study.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {STUDY_AREA_LABELS[study.area]}
            </Badge>
            <Badge className={cn('text-[10px]', STATUS_META[study.status].cls)}>
              {STATUS_META[study.status].label}
            </Badge>
          </div>
        </div>

        <Slider
          value={[study.progress]}
          max={100}
          step={5}
          onValueCommit={([v]) => setProgress(v)}
          onValueChange={() => undefined}
          aria-label={`Progresso de ${study.topic}`}
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Arraste para atualizar o progresso</span>
          <span className="font-bold text-gold tabular-nums">{study.progress}%</span>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">O que aprendi</Label>
          <Textarea
            rows={2}
            placeholder="Anote o insight principal — síntese é domínio."
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesDirty(true);
            }}
          />
          {notesDirty && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              onClick={async () => {
                if (!study.id) return;
                await updateStudy(study.id, { notes });
                setNotesDirty(false);
                toast.success('Anotação salva.');
              }}
            >
              <Save className="mr-1 h-3 w-3" /> Salvar anotação
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Select value={study.status} onValueChange={(v) => setStatus(v as StudyStatus)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_META) as StudyStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            aria-label={`Excluir tema ${study.topic}`}
            className="text-muted-foreground hover:text-loss"
            onClick={async () => {
              if (study.id) {
                await deleteStudy(study.id);
                toast.success('Tema removido.');
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
