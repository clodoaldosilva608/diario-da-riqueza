/**
 * Diário da Riqueza — Banco de dados local (Dexie / IndexedDB)
 *
 * Arquitetura local-first: TODOS os dados vivem no navegador do usuário.
 * Nenhum dado sai do dispositivo. Backups e exportações vão para a pasta
 * escolhida pelo usuário via File System Access API.
 */

import Dexie, { type Table } from 'dexie';
import type {
  Profile,
  Dream,
  Goal,
  BudgetEntry,
  Study,
  DiaryEntry,
  Attachment,
  XPEvent,
  AchievementRecord,
  LocalBackup,
  EntryTemplate,
} from '@/types';

/** Handle da pasta raiz persistido no IndexedDB (structured-cloneable no Chromium) */
export interface StoredHandle {
  key: string; // 'root'
  handle: unknown; // FileSystemDirectoryHandle
  name: string;
  savedAt: string;
}

export class DiarioRiquezaDB extends Dexie {
  profile!: Table<Profile, string>;
  dreams!: Table<Dream, number>;
  goals!: Table<Goal, number>;
  budget!: Table<BudgetEntry, number>;
  studies!: Table<Study, number>;
  entries!: Table<DiaryEntry, number>;
  attachments!: Table<Attachment, number>;
  xpEvents!: Table<XPEvent, number>;
  achievements!: Table<AchievementRecord, string>;
  backups!: Table<LocalBackup, number>;
  templates!: Table<EntryTemplate, number>;
  handles!: Table<StoredHandle, string>;

  constructor() {
    super('diario_da_riqueza');
    // v2: createdAt indexado em studies/templates (necessário para orderBy)
    this.version(2).stores({
      profile: 'id',
      dreams: '++id, achieved, createdAt',
      goals: '++id, category, status, createdAt, deadline',
      budget: '++id, type, category, date, frequency',
      studies: '++id, area, status, progress, createdAt',
      entries: '++id, &date, year, createdAt',
      attachments: '++id, entryDate',
      xpEvents: '++id, type, date, createdAt',
      achievements: 'key, unlockedAt',
      backups: '++id, createdAt',
      templates: '++id, name, createdAt',
      handles: 'key',
    });
  }
}

export const db = new DiarioRiquezaDB();

/* ============================== HELPERS DE DATA ============================== */

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function isoYear(iso: string): number {
  return parseInt(iso.slice(0, 4), 10);
}

/* ============================== CURRÍCULO INICIAL ============================== */

/** Biblioteca de estudos semeada no onboarding — Finanças e Negócios */
export const SEED_STUDIES: Array<Pick<Study, 'area' | 'topic' | 'description'>> = [
  // ---- Finanças ----
  { area: 'financas', topic: 'Reserva de Emergência', description: 'Por que 6 meses de despesas mudam sua vida' },
  { area: 'financas', topic: 'Juros Compostos', description: 'A força mais poderosa do universo aplicada ao dinheiro' },
  { area: 'financas', topic: 'CDI', description: 'A taxa base dos investimentos de renda fixa no Brasil' },
  { area: 'financas', topic: 'CDB', description: 'Certificados de Depósito Bancário, garantia FGC e liquidez' },
  { area: 'financas', topic: 'Tesouro Direto', description: 'Selic, IPCA+ e Prefixados: quando usar cada um' },
  { area: 'financas', topic: 'Ações', description: 'Como analisar empresas e comprar pedaços de negócios' },
  { area: 'financas', topic: 'FIIs', description: 'Fundos de Imóveis Comerciais: renda mensal e dividendos' },
  { area: 'financas', topic: 'Diversificação', description: 'Alocação de ativos e proteção contra volatilidade' },
  { area: 'financas', topic: 'Impostos e IR', description: 'Tributação de investimentos e como ser eficiente' },
  { area: 'financas', topic: 'Independência Financeira', description: 'Regra dos 4% e a matemática da liberdade' },
  // ---- Negócios ----
  { area: 'negocios', topic: 'Vendas: Fundamentos', description: 'Espiral de vendas e a arte de servir o cliente' },
  { area: 'negocios', topic: 'Marketing Digital', description: 'Canais, funis e presença online que gera demanda' },
  { area: 'negocios', topic: 'Produto e Oferta', description: 'Como criar ofertas irresistíveis' },
  { area: 'negocios', topic: 'Precificação', description: 'Margem, valor percebido e psicologia do preço' },
  { area: 'negocios', topic: 'Copywriting', description: 'Textos que vendem: gatilhos e estrutura' },
  { area: 'negocios', topic: 'Tráfego Pago', description: 'Meta Ads e Google Ads: investimento com retorno' },
  { area: 'negocios', topic: 'Funil de Vendas', description: 'Da atenção à recompra: desenho do funil' },
  { area: 'negocios', topic: 'Atendimento e Pós-venda', description: 'Retenção é o novo crescimento' },
  { area: 'negocios', topic: 'Branding Pessoal', description: 'Autoridade e reputação como ativos' },
  { area: 'negocios', topic: 'Escala e Processos', description: 'Sistemas, delegação e crescimento sustentável' },
];

/* ============================== SEED / RESET ============================== */

const DEFAULT_TEMPLATE: Omit<EntryTemplate, 'id'> = {
  name: 'Dia produtivo padrão',
  wakeTime: '05:30',
  exercise: 'Treino na academia',
  exerciseDone: true,
  meals: 'Alimentação limpa, sem açúcar',
  studyTopic: 'Finanças',
  productiveActions: '1. Prospecção de clientes\n2. 30min de estudo aplicado',
  mood: 'bom',
  energy: 8,
  createdAt: new Date().toISOString(),
};

/** Cria o perfil + seeds após o onboarding */
export async function initializeDatabase(data: {
  name: string;
  journalName: string;
  yearGoal: number;
  targetDate: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction(
    'rw',
    [db.profile, db.studies, db.templates],
    async () => {
      await db.profile.put({
        id: 'profile',
        name: data.name,
        journalName: data.journalName,
        yearGoal: data.yearGoal,
        targetDate: data.targetDate,
        createdAt: now,
        updatedAt: now,
      });
      // Só semeia se as tabelas estiverem vazias (idempotente)
      const studyCount = await db.studies.count();
      if (studyCount === 0) {
        await db.studies.bulkAdd(
          SEED_STUDIES.map((s) => ({
            ...s,
            status: 'nao_iniciado' as const,
            progress: 0,
            createdAt: now,
          })),
        );
      }
      const templateCount = await db.templates.count();
      if (templateCount === 0) {
        await db.templates.add(DEFAULT_TEMPLATE);
      }
    },
  );
}

/** Limpa TODOS os dados (zona de perigo das configurações) */
export async function wipeAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.profile,
      db.dreams,
      db.goals,
      db.budget,
      db.studies,
      db.entries,
      db.attachments,
      db.xpEvents,
      db.achievements,
      db.backups,
      db.templates,
    ],
    async () => {
      await Promise.all([
        db.profile.clear(),
        db.dreams.clear(),
        db.goals.clear(),
        db.budget.clear(),
        db.studies.clear(),
        db.entries.clear(),
        db.attachments.clear(),
        db.xpEvents.clear(),
        db.achievements.clear(),
        db.backups.clear(),
        db.templates.clear(),
      ]);
    },
  );
}

/** Dump completo de todas as tabelas — usado por backup JSON e restauração */
export interface FullDump {
  version: number;
  exportedAt: string;
  profile: Profile[];
  dreams: Dream[];
  goals: Goal[];
  budget: BudgetEntry[];
  studies: Study[];
  entries: DiaryEntry[];
  attachments: Attachment[];
  xpEvents: XPEvent[];
  achievements: AchievementRecord[];
  backups: LocalBackup[];
  templates: EntryTemplate[];
}

export async function dumpAll(): Promise<FullDump> {
  const [
    profile,
    dreams,
    goals,
    budget,
    studies,
    entries,
    attachments,
    xpEvents,
    achievements,
    backups,
    templates,
  ] = await Promise.all([
    db.profile.toArray(),
    db.dreams.toArray(),
    db.goals.toArray(),
    db.budget.toArray(),
    db.studies.toArray(),
    db.entries.toArray(),
    db.attachments.toArray(),
    db.xpEvents.toArray(),
    db.achievements.toArray(),
    db.backups.toArray(),
    db.templates.toArray(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    dreams,
    goals,
    budget,
    studies,
    entries,
    attachments,
    xpEvents,
    achievements,
    backups,
    templates,
  };
}

/** Restaura um dump completo (substitui registros por id/key) */
export async function restoreDump(dump: FullDump): Promise<void> {
  if (!dump || dump.version !== 1) {
    throw new Error('Formato de backup inválido ou incompatível.');
  }
  await db.transaction(
    'rw',
    [
      db.profile,
      db.dreams,
      db.goals,
      db.budget,
      db.studies,
      db.entries,
      db.attachments,
      db.xpEvents,
      db.achievements,
      db.backups,
      db.templates,
    ],
    async () => {
      if (dump.profile) await db.profile.bulkPut(dump.profile);
      if (dump.dreams) await db.dreams.bulkPut(dump.dreams);
      if (dump.goals) await db.goals.bulkPut(dump.goals);
      if (dump.budget) await db.budget.bulkPut(dump.budget);
      if (dump.studies) await db.studies.bulkPut(dump.studies);
      if (dump.entries) await db.entries.bulkPut(dump.entries);
      if (dump.attachments) await db.attachments.bulkPut(dump.attachments);
      if (dump.xpEvents) await db.xpEvents.bulkPut(dump.xpEvents);
      if (dump.achievements) await db.achievements.bulkPut(dump.achievements);
      if (dump.backups) await db.backups.bulkPut(dump.backups);
      if (dump.templates) await db.templates.bulkPut(dump.templates);
    },
  );
}
