/**
 * Diário da Riqueza — Tipos centrais do sistema
 * Todos os dados vivem localmente (IndexedDB via Dexie). Nenhum servidor envolvido.
 */

/* ============================== ENUMS / UNIÕES ============================== */

export type GoalCategory =
  | 'saude'
  | 'financeira'
  | 'relacionamento'
  | 'espiritual'
  | 'carreira'
  | 'estilo'
  | 'outros';

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  saude: 'Saúde',
  financeira: 'Financeira',
  relacionamento: 'Relacionamento',
  espiritual: 'Espiritual',
  carreira: 'Carreira',
  estilo: 'Estilo de Vida',
  outros: 'Outros',
};

export type GoalStatus = 'ativa' | 'concluida';

export type BudgetType = 'receita' | 'despesa';

/** 'unica' = lançamento pontual | 'mensal' = recorre todo mês (salário, aluguel...) */
export type BudgetFrequency = 'unica' | 'mensal';

export type StudyArea = 'financas' | 'negocios' | 'outros';

export const STUDY_AREA_LABELS: Record<StudyArea, string> = {
  financas: 'Finanças',
  negocios: 'Negócios',
  outros: 'Outros',
};

export type StudyStatus = 'nao_iniciado' | 'estudando' | 'concluido';

export type MoodType = 'pessimo' | 'baixo' | 'neutro' | 'bom' | 'otimo';

export const MOOD_LABELS: Record<MoodType, string> = {
  pessimo: 'Péssimo',
  baixo: 'Baixo',
  neutro: 'Neutro',
  bom: 'Bom',
  otimo: 'Ótimo',
};

export type XPType =
  | 'registro_dia' // +50 registrou o dia
  | 'pratica' // +40 colocou em prática
  | 'estudo' // +30 estudo concluído
  | 'streak' // bônus por consistência
  | 'meta'; // +25 meta atingida

export const XP_RULES: Record<XPType, number> = {
  registro_dia: 50,
  pratica: 40,
  estudo: 30,
  streak: 0, // dinâmico (10 / 25 / 50 por tier)
  meta: 25,
};

export type ViewKey =
  | 'dashboard'
  | 'diario'
  | 'sonhos'
  | 'orcamento'
  | 'biblioteca'
  | 'estatisticas'
  | 'conquistas'
  | 'config';

/* ============================== ENTIDADES ============================== */

/** Perfil único do usuário (registro singleton id = 'profile') */
export interface Profile {
  id: 'profile';
  name: string;
  journalName: string;
  /** Meta financeira anual em R$ */
  yearGoal: number;
  /** Data-alvo para atingir a meta — 'yyyy-MM-dd' */
  targetDate: string;
  createdAt: string;
  updatedAt: string;
}

/** Sonho livre (lista de sonhos da capa do diário físico) */
export interface Dream {
  id?: number;
  title: string;
  description?: string;
  achieved: boolean;
  createdAt: string;
}

/** Meta categorizada — mínimo recomendado: 10 */
export interface Goal {
  id?: number;
  category: GoalCategory;
  title: string;
  description?: string;
  /** Valor-alvo opcional (R$, kg, livros...) */
  targetValue?: number;
  currentValue: number;
  deadline?: string; // 'yyyy-MM-dd'
  status: GoalStatus;
  createdAt: string;
  completedAt?: string;
}

/** Lançamento do orçamento */
export interface BudgetEntry {
  id?: number;
  type: BudgetType;
  category: string;
  description: string;
  value: number;
  /** 'yyyy-MM-dd' */
  date: string;
  frequency: BudgetFrequency;
  createdAt: string;
}

/** Tema de estudo (curriculum pré-semeado + temas custom) */
export interface Study {
  id?: number;
  area: StudyArea;
  topic: string;
  description?: string;
  status: StudyStatus;
  /** 0–100 */
  progress: number;
  /** Campo "O que aprendi" */
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

/** Entrada diária do diário — o coração do app. Uma por dia (date único). */
export interface DiaryEntry {
  id?: number;
  /** 'yyyy-MM-dd' — único */
  date: string;
  /** Horário que acordou 'HH:mm' */
  wakeTime?: string;
  exercise?: string;
  exerciseDone: boolean;
  /** Alimentação do dia */
  meals?: string;
  studyTopic?: string;
  /** Resumo do aprendizado do dia */
  studySummary?: string;
  /** Ações produtivas (texto livre, 1 por linha) */
  productiveActions?: string;
  income: number;
  expense: number;
  /** Pensamentos / reflexões */
  thoughts?: string;
  /** O que coloquei em prática hoje — OBRIGATÓRIO */
  practice: string;
  mood?: MoodType;
  /** Energia 1–10 */
  energy?: number;
  xpEarned: number;
  createdAt: string;
  updatedAt: string;
}

/** Anexo de uma entrada (foto de recibo, print etc.) — guardado como dataURL */
export interface Attachment {
  id?: number;
  entryDate: string; // 'yyyy-MM-dd' da entrada
  name: string;
  mime: string;
  dataUrl: string;
  createdAt: string;
}

/** Evento de XP (auditoria da gamificação) */
export interface XPEvent {
  id?: number;
  type: XPType;
  amount: number;
  /** 'yyyy-MM-dd' referência */
  date: string;
  description?: string;
  createdAt: string;
}

/** Conquista desbloqueada */
export interface AchievementRecord {
  key: string; // PK
  unlockedAt: string;
  seen: boolean;
}

/** Backup completo salvo localmente (Dexie e/ou pasta /Backups) */
export interface LocalBackup {
  id?: number;
  createdAt: string;
  label: string;
  /** JSON completo do banco */
  data: string;
}

/** Template de entrada diária */
export interface EntryTemplate {
  id?: number;
  name: string;
  wakeTime?: string;
  exercise?: string;
  exerciseDone: boolean;
  meals?: string;
  studyTopic?: string;
  productiveActions?: string;
  mood?: MoodType;
  energy?: number;
  createdAt: string;
}

/* ============================== GAMIFICAÇÃO ============================== */

export interface LevelInfo {
  index: number;
  name: string;
  minXP: number;
  nextXP: number | null;
  /** 0–100 progresso dentro do nível atual */
  progress: number;
}

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string; // nome do ícone lucide
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  entries: DiaryEntry[];
  studies: Study[];
  goals: Goal[];
  dreams: Dream[];
  budget: BudgetEntry[];
  totalXP: number;
  streak: number;
  recordStreak: number;
}

/* ============================== EXPORTAÇÃO / FS ============================== */

export type ExportFormat = 'pdf' | 'docx' | 'xlsx' | 'md' | 'json';

export interface ExportPayload {
  profile?: Profile;
  entries: DiaryEntry[];
  budget: BudgetEntry[];
  goals: Goal[];
  dreams: Dream[];
  studies: Study[];
  attachments: Attachment[];
  generatedAt: string;
  scopeLabel: string;
}

/** Onde o arquivo foi salvo */
export type SaveDestination = 'folder' | 'download';
