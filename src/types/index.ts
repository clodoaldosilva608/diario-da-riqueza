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
  | 'meta' // +25 meta atingida
  | 'desafio'; // +15..50 desafio da semana resgatado

export const XP_RULES: Record<XPType, number> = {
  registro_dia: 50,
  pratica: 40,
  estudo: 30,
  streak: 0, // dinâmico (10 / 25 / 50 por tier)
  meta: 25,
  desafio: 0, // dinâmico (definido por desafio)
};

export type ViewKey =
  | 'dashboard'
  | 'diario'
  | 'sonhos'
  | 'orcamento'
  | 'biblioteca'
  | 'estatisticas'
  | 'conquistas'
  | 'ajuda'
  | 'config';

/* ============================== ENTIDADES ==============================
 *
 * Sincronização entre dispositivos (Obsidian/vault):
 * - `uid` é a identidade ESTÁVEL do registro entre dispositivos (o `id` local
 *   do Dexie é auto-incremento e difere em cada dispositivo).
 * - `updatedAt` alimenta o last-write-wins do merge.
 */

/** Registro apagado — impede ressurreição no sync multi-dispositivo */
export interface DeletedLogEntry {
  /** `${table}:${uid}` — chave estável e universal */
  key: string;
  table: string;
  uid: string;
  deletedAt: string;
}

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
  uid?: string;
  title: string;
  description?: string;
  achieved: boolean;
  /** Meta do cofrinho (R$) — habilita o modo poupança do sonho */
  targetValue?: number;
  createdAt: string;
  updatedAt?: string;
  /** Dado semeado como exemplo — pode ser limpo em massa nas Configurações */
  exemplo?: boolean;
}

/** Meta categorizada — mínimo recomendado: 10 */
export interface Goal {
  id?: number;
  uid?: string;
  category: GoalCategory;
  title: string;
  description?: string;
  /** Valor-alvo opcional (R$, kg, livros...) */
  targetValue?: number;
  currentValue: number;
  deadline?: string; // 'yyyy-MM-dd'
  status: GoalStatus;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  exemplo?: boolean;
}

/** Lançamento do orçamento */
export interface BudgetEntry {
  id?: number;
  uid?: string;
  type: BudgetType;
  category: string;
  description: string;
  value: number;
  /** 'yyyy-MM-dd' */
  date: string;
  frequency: BudgetFrequency;
  createdAt: string;
  updatedAt?: string;
  exemplo?: boolean;
}

/** Tema de estudo (curriculum pré-semeado + temas custom) */
export interface Study {
  id?: number;
  uid?: string;
  area: StudyArea;
  topic: string;
  description?: string;
  status: StudyStatus;
  /** 0–100 */
  progress: number;
  /** Campo "O que aprendi" */
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  exemplo?: boolean;
}

/** Entrada diária do diário — o coração do app. Uma por dia (date único). */
export interface DiaryEntry {
  id?: number;
  uid?: string;
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
  exemplo?: boolean;
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
  /** XP semeado como exemplo (limpo junto com os dados de exemplo) */
  exemplo?: boolean;
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
  uid?: string;
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
  updatedAt?: string;
  exemplo?: boolean;
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

/* ============================== NOVAS FEATURES (v4) ============================== */

/**
 * Depósito no cofrinho de um sonho (piggy bank).
 * Conecta o Orçamento aos Sonhos: cada depósito é um passo registrado
 * em direção ao sonho — com histórico auditável.
 */
export interface DreamDeposit {
  id?: number;
  /** id local do sonho (Dexie auto-increment) */
  dreamId: number;
  /** uid do sonho — vínculo estável entre dispositivos no sync E2E */
  dreamUid?: string;
  /** Valor guardado em R$ (sempre positivo) */
  amount: number;
  /** 'yyyy-MM-dd' */
  date: string;
  note?: string;
  /** true quando o depósito também virou despesa no Orçamento */
  registeredInBudget?: boolean;
  createdAt: string;
}

/**
 * Lote de importação de extrato (OFX/CSV) — rastreabilidade do Orçamento.
 */
export interface ImportBatch {
  id?: number;
  fileName: string;
  format: 'ofx' | 'csv';
  /** Quantidade efetivamente importada (após dedupe) */
  imported: number;
  /** Quantidade pulada por duplicidade */
  skipped: number;
  /** Período coberto pelo extrato (min–max das datas) */
  from?: string;
  to?: string;
  importedAt: string;
}

/**
 * Resgate de desafio concluído — chave = `${challengeId}:${periodKey}`
 * garante XP único por desafio/semana.
 */
export interface ChallengeCompletion {
  key: string;
  challengeId: string;
  /** Ex.: '2026-W40' (semana ISO) */
  periodKey: string;
  completedAt: string;
  xpAwarded: number;
}
