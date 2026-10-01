/**
 * Diário da Riqueza — Dados de exemplo (semeadura pós-onboarding).
 *
 * Objetivo: o usuário nunca abre o app vazio. Recebe 3 dias de diário realistas
 * (método Haroldo Ochoa), metas com progresso, sonhos, orçamento do mês e 2
 * estudos iniciados — tudo marcado com `exemplo: true` para poder ser editado
 * ou apagado em massa sem tocar nos dados reais.
 *
 * Consistência com o sync Obsidian:
 * - Todo registro recebe `uid` estável + `createdAt`/`updatedAt` → aparece no
 *   vault normalmente (dashboard, arquivos por entidade e estado JSON).
 * - `clearExampleData()` grava tombstones (deletedLog) → deleção se propaga
 *   entre dispositivos e limpa os arquivos órfãos no vault no próximo sync.
 * - XP semeado espelha exatamente a lógica de saveEntry (50 registro + 40
 *   prática; bônus de streak só a partir de 7 dias) → totalXP coerente.
 */

import { db, newUid, logDeletion, SEED_EXAMPLES_FLAG } from '@/db';
import { computeStreak, streakBonusXP } from '@/gamification/engine';
import type {
  DiaryEntry, Dream, Goal, BudgetEntry, Study, XPEvent, MoodType,
} from '@/types';

/* ============================== HELPERS DE DATA (PUROS) ============================== */

/** 'yyyy-MM-dd' de N dias atrás */
export function daysAgoISO(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** 'yyyy-MM-dd' de N dias à frente */
export function daysAheadISO(days: number, from: Date = new Date()): string {
  return daysAgoISO(-days, from);
}

/** ISO timestamp do dia 'yyyy-MM-dd' às HH:mm (horário local) */
function at(dateISO: string, hhmm: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
    dt.getHours(),
  )}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

/* ============================== CONTEÚDO (PURO) ============================== */

export interface ExampleContent {
  entries: DiaryEntry[];
  xpEvents: XPEvent[];
  goals: Goal[];
  dreams: Dream[];
  budget: BudgetEntry[];
  studies: Array<Pick<Study, 'topic' | 'status' | 'progress' | 'notes'>>;
}

/**
 * Monta o conteúdo de exemplo relativo a `now`.
 * PURO (só funções de data/engine) — testável sem IndexedDB.
 */
export function buildExampleContent(now: Date = new Date()): ExampleContent {
  const todayISO = daysAgoISO(0, now);

  // ---------- Diário: 3 dias consecutivos terminando ontem ----------
  type Day = Omit<DiaryEntry, 'uid' | 'xpEarned' | 'createdAt' | 'updatedAt' | 'exemplo'>;
  const rawDays: Array<Day & { at: string }> = [
    {
      date: daysAgoISO(3, now),
      at: '05:45',
      wakeTime: '05:45',
      exercise: 'Caminhada 30 min',
      exerciseDone: true,
      meals: 'Café proteico, almoço limpo, jantar leve',
      studyTopic: 'Reserva de Emergência',
      studySummary: 'Entendi por que 6 meses de custos fixos vêm ANTES de qualquer investimento de risco.',
      productiveActions: '1. Organizei as contas do mês na planilha\n2. Cancelei 2 assinaturas que não uso',
      income: 0,
      expense: 148.7,
      thoughts:
        'Primeiro dia levando o método a sério. Escrever à mão o que gastei já me deu uma clareza diferente.',
      practice: 'Separei 10% do salário numa conta separada para a reserva',
      mood: 'bom' as MoodType,
      energy: 7,
    },
    {
      date: daysAgoISO(2, now),
      at: '05:30',
      wakeTime: '05:30',
      exercise: 'Musculação 45 min',
      exerciseDone: true,
      meals: 'Alimentação limpa, sem açúcar, 3L de água',
      studyTopic: 'Juros Compostos',
      studySummary: 'Einstein chamava de oitava maravilha: R$ 1.000/mês a 1% ao mês viram mais de R$ 236 mil em 10 anos.',
      productiveActions: '1. 30 min de estudo aplicado sobre juros\n2. Li 10 páginas do livro de finanças',
      income: 1200,
      expense: 96.4,
      thoughts:
        'Acordei antes do alarme. A energia de cumprir a promessa do dia anterior é combustível real.',
      practice: 'Agendei o aporte automático da reserva para o dia do salário',
      mood: 'otimo' as MoodType,
      energy: 9,
    },
    {
      date: daysAgoISO(1, now),
      at: '05:35',
      wakeTime: '05:35',
      exercise: 'Alongamento + caminhada',
      exerciseDone: true,
      meals: 'Café da manhã proteico; almoço caseiro',
      studyTopic: 'Juros Compostos',
      studySummary: 'A regra do 72: divida 72 pela taxa para saber em quantos anos o dinheiro dobra.',
      productiveActions: '1. Prospecção: 3 contatos novos\n2. Revisei o orçamento do mês',
      income: 0,
      expense: 63.2,
      thoughts:
        'Consistência batendo na porta: terceiro dia seguido. O streak do app virou motivação própria.',
      practice: 'Registrei todos os gastos do dia antes de dormir',
      mood: 'bom' as MoodType,
      energy: 8,
    },
  ];

  // XP espelha saveEntry: +50 registro, +40 prática, bônus de streak (7+ dias)
  // calculado APÓS inserir a entrada do dia (ordem idêntica à saveEntry)
  const entries: DiaryEntry[] = [];
  const xpEvents: XPEvent[] = [];
  const growing: DiaryEntry[] = [];
  for (const day of rawDays) {
    const createdAt = at(day.date, day.at);
    const entry: DiaryEntry = {
      ...day,
      uid: '', // preenchido no seed (newUid)
      xpEarned: 0,
      createdAt,
      updatedAt: createdAt,
      exemplo: true,
    };
    growing.push(entry);
    const bonus = streakBonusXP(computeStreak(growing));
    entry.xpEarned = 50 + (day.practice.trim().length > 0 ? 40 : 0) + bonus;
    entries.push(entry);
    xpEvents.push(
      {
        type: 'registro_dia',
        amount: 50,
        date: day.date,
        description: 'Dia registrado',
        createdAt,
        exemplo: true,
      },
      ...(day.practice.trim().length > 0
        ? [
            {
              type: 'pratica' as const,
              amount: 40,
              date: day.date,
              description: 'Colocou em prática',
              createdAt,
              exemplo: true,
            },
          ]
        : []),
      ...(bonus > 0
        ? [
            {
              type: 'streak' as const,
              amount: bonus,
              date: day.date,
              description: `Streak de ${growing.length} dias`,
              createdAt,
              exemplo: true,
            },
          ]
        : []),
    );
  }

  // ---------- Metas ----------
  const goals: Goal[] = [
    {
      uid: '',
      category: 'financeira',
      title: 'Reserva de emergência',
      description: '6 meses de custos fixos guardados antes de qualquer investimento de risco.',
      targetValue: 30000,
      currentValue: 5100,
      deadline: daysAheadISO(180, now),
      status: 'ativa',
      createdAt: at(daysAgoISO(3, now), '06:10'),
      updatedAt: at(daysAgoISO(1, now), '21:30'),
      exemplo: true,
    },
    {
      uid: '',
      category: 'carreira',
      title: 'Estudar finanças 30 dias seguidos',
      description: '30 minutos por dia, todos os dias — consistência acima de intensidade.',
      targetValue: 30,
      currentValue: 12,
      deadline: daysAheadISO(30, now),
      status: 'ativa',
      createdAt: at(daysAgoISO(3, now), '06:15'),
      updatedAt: at(daysAgoISO(1, now), '21:35'),
      exemplo: true,
    },
  ];

  // ---------- Sonhos ----------
  const dreams: Dream[] = [
    {
      uid: '',
      title: 'Casa própria para a família',
      description: 'Entrada de 30% e financiamento confortável — sem apertar o orçamento.',
      achieved: false,
      createdAt: at(daysAgoISO(3, now), '06:20'),
      updatedAt: at(daysAgoISO(3, now), '06:20'),
      exemplo: true,
    },
    {
      uid: '',
      title: 'Viagem dos sonhos com a família',
      description: 'Disney ou Europa — pagas à vista, sem parcelar o sonho.',
      achieved: false,
      createdAt: at(daysAgoISO(3, now), '06:22'),
      updatedAt: at(daysAgoISO(3, now), '06:22'),
      exemplo: true,
    },
  ];

  // ---------- Orçamento (mês corrente, sem datas futuras) ----------
  const dayOfMonth = now.getDate();
  const clampDay = (n: number) => Math.min(n, dayOfMonth);
  const monthPrefix = todayISO.slice(0, 8); // 'yyyy-MM-'
  const budget: BudgetEntry[] = [
    {
      uid: '',
      type: 'receita',
      category: 'Salário',
      description: 'Salário mensal',
      value: 8500,
      date: `${monthPrefix}${String(clampDay(5)).padStart(2, '0')}`,
      frequency: 'mensal',
      createdAt: at(daysAgoISO(3, now), '07:00'),
      updatedAt: at(daysAgoISO(3, now), '07:00'),
      exemplo: true,
    },
    {
      uid: '',
      type: 'receita',
      category: 'Extras',
      description: 'Freelance de fim de semana',
      value: 1200,
      date: daysAgoISO(2, now),
      frequency: 'unica',
      createdAt: at(daysAgoISO(2, now), '19:40'),
      updatedAt: at(daysAgoISO(2, now), '19:40'),
      exemplo: true,
    },
    {
      uid: '',
      type: 'despesa',
      category: 'Moradia',
      description: 'Aluguel + condomínio',
      value: 1800,
      date: `${monthPrefix}${String(clampDay(5)).padStart(2, '0')}`,
      frequency: 'mensal',
      createdAt: at(daysAgoISO(3, now), '07:02'),
      updatedAt: at(daysAgoISO(3, now), '07:02'),
      exemplo: true,
    },
    {
      uid: '',
      type: 'despesa',
      category: 'Alimentação',
      description: 'Supermercado do mês',
      value: 850,
      date: daysAgoISO(3, now),
      frequency: 'unica',
      createdAt: at(daysAgoISO(3, now), '12:20'),
      updatedAt: at(daysAgoISO(3, now), '12:20'),
      exemplo: true,
    },
    {
      uid: '',
      type: 'despesa',
      category: 'Transporte',
      description: 'Combustível',
      value: 320,
      date: daysAgoISO(1, now),
      frequency: 'unica',
      createdAt: at(daysAgoISO(1, now), '18:05'),
      updatedAt: at(daysAgoISO(1, now), '18:05'),
      exemplo: true,
    },
  ];

  // ---------- Estudos (por tópico — casam com a biblioteca semeada) ----------
  const studies: ExampleContent['studies'] = [
    {
      topic: 'Reserva de Emergência',
      status: 'concluido',
      progress: 100,
      notes:
        'Reserva certa = 6x custos fixos, em liquidez diária (Tesouro Selic/CDB 100%+). Não é investimento, é seguro de vida financeira. Concluído — revisar a cada 6 meses.',
    },
    {
      topic: 'Juros Compostos',
      status: 'estudando',
      progress: 40,
      notes:
        'Regra do 72 e o efeito tempo: começar cedo importa mais que aportar muito. Falta fechar a comparação CDB x Tesouro IPCA+.',
    },
  ];

  return { entries, xpEvents, goals, dreams, budget, studies };
}

/* ============================== OPERAÇÕES DEXIE ============================== */

/**
 * Flag de "exemplos já semeados alguma vez" (definida em @/db):
 * - seedExampleData grava '1' após semear → auto-seed do boot não repete;
 * - clearExampleData mantém '1' → exemplos apagados pelo usuário NÃO voltam;
 * - wipeAllData remove → re-onboarding volta a semear do zero.
 */
const SEED_FLAG = SEED_EXAMPLES_FLAG;

/** Semeia os dados de exemplo (idempotente; preserva registros reais existentes) */
export async function seedExampleData(opts?: { force?: boolean }): Promise<void> {
  if (!opts?.force) {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(SEED_FLAG) === '1') return;
    const existing = await countExampleData();
    if (existing > 0) return;
  }
  const content = buildExampleContent();
  const now = new Date().toISOString();

  await db.transaction(
    'rw',
    [db.entries, db.xpEvents, db.goals, db.dreams, db.budget, db.studies],
    async () => {
      // Diário — pula datas que o usuário já registrou (índice &date único)
      for (const entry of content.entries) {
        const exists = await db.entries.where('date').equals(entry.date).count();
        if (exists > 0) continue;
        await db.entries.add({ ...entry, uid: entry.uid || newUid() });
      }
      // XP — apenas para as datas efetivamente criadas
      for (const ev of content.xpEvents) {
        const entryExists = await db.entries.where('date').equals(ev.date).count();
        if (entryExists === 0) continue;
        await db.xpEvents.add(ev);
      }
      // Metas
      if (content.goals.length) {
        await db.goals.bulkAdd(content.goals.map((g) => ({ ...g, uid: g.uid || newUid() })));
      }
      // Sonhos
      if (content.dreams.length) {
        await db.dreams.bulkAdd(content.dreams.map((d) => ({ ...d, uid: d.uid || newUid() })));
      }
      // Orçamento
      if (content.budget.length) {
        await db.budget.bulkAdd(content.budget.map((b) => ({ ...b, uid: b.uid || newUid() })));
      }
      // Estudos — atualiza os temas já semeados pela biblioteca.
      // NOTA: 'topic' não é índice no Dexie → filtro em memória (tabela pequena);
      // where('topic') lançaria SchemaError.
      const allStudies = await db.studies.toArray();
      for (const s of content.studies) {
        const found = allStudies.find((r) => r.topic === s.topic);
        if (found?.id) {
          await db.studies.update(found.id, {
            ...s,
            uid: found.uid || newUid(),
            updatedAt: now,
            completedAt: s.status === 'concluido' ? at(daysAgoISO(1), '20:00') : undefined,
            exemplo: true,
          });
        } else {
          await db.studies.add({
            area: 'financas',
            ...s,
            uid: newUid(),
            createdAt: now,
            updatedAt: now,
            completedAt: s.status === 'concluido' ? at(daysAgoISO(1), '20:00') : undefined,
            exemplo: true,
          });
        }
      }
    },
  );

  if (typeof localStorage !== 'undefined') localStorage.setItem(SEED_FLAG, '1');
}

/**
 * Remove TODOS os registros marcados como exemplo.
 * Grava tombstones → deleção se propaga ao vault Obsidian e a outros dispositivos.
 * Retorna quantos registros foram removidos.
 */
export async function clearExampleData(): Promise<number> {
  let removed = 0;
  await db.transaction(
    'rw',
    [db.entries, db.goals, db.budget, db.studies, db.dreams, db.xpEvents, db.deletedLog],
    async () => {
      const tables = [
        { table: 'entries' as const, dexie: db.entries },
        { table: 'goals' as const, dexie: db.goals },
        { table: 'budget' as const, dexie: db.budget },
        { table: 'studies' as const, dexie: db.studies },
        { table: 'dreams' as const, dexie: db.dreams },
      ];
      for (const { table, dexie } of tables) {
        const rows = (await dexie.toArray()).filter((r) => (r as { exemplo?: boolean }).exemplo);
        for (const row of rows) {
          await logDeletion(table, (row as { uid?: string }).uid);
          if (row.id !== undefined) await dexie.delete(row.id);
          removed++;
        }
      }
      // XP dos exemplos (não sincroniza — apaga direto)
      const xp = (await db.xpEvents.toArray()).filter((e) => e.exemplo);
      for (const ev of xp) {
        if (ev.id !== undefined) await db.xpEvents.delete(ev.id);
        removed++;
      }
    },
  );
  // Mantém a flag de "já semeado": exemplos apagados pelo usuário não voltam
  // no próximo boot (apenas wipeAllData a remove, para re-onboarding).
  if (typeof localStorage !== 'undefined') localStorage.setItem(SEED_FLAG, '1');
  return removed;
}

/** Quantidade de registros de exemplo existentes (para UI/banner) */
export async function countExampleData(): Promise<number> {
  const [entries, goals, budget, studies, dreams] = await Promise.all([
    db.entries.toArray(),
    db.goals.toArray(),
    db.budget.toArray(),
    db.studies.toArray(),
    db.dreams.toArray(),
  ]);
  return (
    entries.filter((r) => r.exemplo).length +
    goals.filter((r) => r.exemplo).length +
    budget.filter((r) => r.exemplo).length +
    studies.filter((r) => r.exemplo).length +
    dreams.filter((r) => r.exemplo).length
  );
}
