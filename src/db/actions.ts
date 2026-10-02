/**
 * Diário da Riqueza — Camada de ações de dados
 * Todas as mutações passam por aqui para garantir: XP correto, conquistas
 * verificadas e backups consistentes. Componentes nunca escrevem no Dexie
 * diretamente (exceto leitura via useLiveQuery).
 */

import { db, todayISO, dumpAll, restoreDump, newUid, logDeletion, type FullDump } from '@/db';
import { computeStreak, streakBonusXP, findNewlyUnlocked, computeRecordStreak } from '@/gamification/engine';
import { saveToFolder, buildFileName } from '@/filesystem';
import type {
  AchievementDef,
  AchievementRecord,
  Attachment,
  BudgetEntry,
  DiaryEntry,
  Dream,
  DreamDeposit,
  EntryTemplate,
  Goal,
  ImportBatch,
  Profile,
  Study,
  EntryTemplate as Template,
} from '@/types';

export interface ActionResult {
  xpGained: number;
  newAchievements: AchievementDef[];
}

/* ============================== CONTEXTO / CONQUISTAS ============================== */

async function buildAchievementContext(): Promise<{
  entries: DiaryEntry[];
  studies: Study[];
  goals: Goal[];
  dreams: Dream[];
  budget: BudgetEntry[];
  totalXP: number;
  streak: number;
  recordStreak: number;
}> {
  const [entries, studies, goals, dreams, budget, xpEvents] = await Promise.all([
    db.entries.toArray(),
    db.studies.toArray(),
    db.goals.toArray(),
    db.dreams.toArray(),
    db.budget.toArray(),
    db.xpEvents.toArray(),
  ]);
  const totalXP = xpEvents.reduce((s, e) => s + e.amount, 0);
  return {
    entries,
    studies,
    goals,
    dreams,
    budget,
    totalXP,
    streak: computeStreak(entries),
    recordStreak: computeRecordStreak(entries),
  };
}

/** Verifica e desbloqueia conquistas; retorna as novas */
async function checkAchievements(): Promise<AchievementDef[]> {
  const unlocked = new Set((await db.achievements.toArray()).map((a) => a.key));
  const ctx = await buildAchievementContext();
  const newly = findNewlyUnlocked(unlocked, ctx);
  if (newly.length > 0) {
    const now = new Date().toISOString();
    const records: AchievementRecord[] = newly.map((a) => ({
      key: a.key,
      unlockedAt: now,
      seen: false,
    }));
    await db.achievements.bulkPut(records);
  }
  return newly;
}

async function addXP(
  type: 'registro_dia' | 'pratica' | 'estudo' | 'streak' | 'meta' | 'desafio',
  amount: number,
  date: string,
  description?: string,
): Promise<void> {
  await db.xpEvents.add({
    type,
    amount,
    date,
    description,
    createdAt: new Date().toISOString(),
  });
}

/* ============================== PERFIL ============================== */

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.get('profile');
}

export async function updateProfile(patch: Partial<Profile>): Promise<void> {
  const current = await db.profile.get('profile');
  if (!current) return;
  await db.profile.put({ ...current, ...patch, updatedAt: new Date().toISOString() });
}

/* ============================== DIÁRIO DIÁRIO ============================== */

export interface SaveEntryInput {
  date: string;
  wakeTime?: string;
  exercise?: string;
  exerciseDone: boolean;
  meals?: string;
  studyTopic?: string;
  studySummary?: string;
  productiveActions?: string;
  income: number;
  expense: number;
  thoughts?: string;
  practice: string;
  mood?: DiaryEntry['mood'];
  energy?: number;
}

/**
 * Cria ou atualiza a entrada do dia. XP é concedido SOMENTE na primeira
 * criação do dia (+50 registro, +40 prática, bônus de streak).
 */
export async function saveEntry(input: SaveEntryInput): Promise<ActionResult> {
  const now = new Date().toISOString();
  const existing = await db.entries.where('date').equals(input.date).first();

  let xpGained = 0;
  let newAchievements: AchievementDef[] = [];

  if (!existing) {
    const entry: DiaryEntry = {
      ...input,
      uid: newUid(),
      xpEarned: 0,
      createdAt: now,
      updatedAt: now,
    };
    // XP de registro
    xpGained += 50;
    await addXP('registro_dia', 50, input.date, 'Dia registrado');
    // XP por colocar em prática
    if (input.practice.trim().length > 0) {
      xpGained += 40;
      await addXP('pratica', 40, input.date, 'Colocou em prática');
    }
    // Bônus de streak (calculado após inserir a entrada)
    await db.entries.add(entry);
    const entries = await db.entries.toArray();
    const streak = computeStreak(entries);
    const bonus = streakBonusXP(streak);
    if (bonus > 0) {
      xpGained += bonus;
      await addXP('streak', bonus, input.date, `Streak de ${streak} dias`);
    }
    await db.entries.where('date').equals(input.date).modify({ xpEarned: xpGained });
    newAchievements = await checkAchievements();
  } else {
    await db.entries.update(existing.id!, { ...input, updatedAt: now });
  }

  return { xpGained, newAchievements };
}

export async function deleteEntry(date: string): Promise<void> {
  const entry = await db.entries.where('date').equals(date).first();
  if (entry?.id) {
    await logDeletion('entries', entry.uid);
    await db.entries.delete(entry.id);
  }
  await db.attachments.where('entryDate').equals(date).delete();
}

/* ============================== ANEXOS ============================== */

export async function addAttachment(
  entryDate: string,
  file: File,
): Promise<void> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  await db.attachments.add({
    entryDate,
    name: file.name,
    mime: file.type || 'application/octet-stream',
    dataUrl,
    createdAt: new Date().toISOString(),
  });
  // Melhor esforço: copia o original para /Anexos na pasta do usuário
  try {
    await saveToFolder('Anexos', file.name, file, file.type);
  } catch {
    /* silencioso — o dado principal está no IndexedDB */
  }
}

export async function deleteAttachment(id: number): Promise<void> {
  await db.attachments.delete(id);
}

export async function getAttachmentsFor(date: string): Promise<Attachment[]> {
  return db.attachments.where('entryDate').equals(date).toArray();
}

/* ============================== SONHOS E METAS ============================== */

export async function addDream(title: string, description?: string): Promise<ActionResult> {
  const now = new Date().toISOString();
  await db.dreams.add({
    uid: newUid(),
    title,
    description,
    achieved: false,
    createdAt: now,
    updatedAt: now,
  });
  const newAchievements = await checkAchievements();
  return { xpGained: 0, newAchievements };
}

export async function toggleDream(dream: Dream): Promise<ActionResult> {
  await db.dreams.update(dream.id!, { achieved: !dream.achieved, updatedAt: new Date().toISOString() });
  const newAchievements = await checkAchievements();
  return { xpGained: 0, newAchievements };
}

export async function deleteDream(id: number): Promise<void> {
  const dream = await db.dreams.get(id);
  await logDeletion('dreams', dream?.uid);
  await db.dreams.delete(id);
}

export async function addGoal(goal: Omit<Goal, 'createdAt' | 'status'>): Promise<ActionResult> {
  const now = new Date().toISOString();
  await db.goals.add({
    ...goal,
    uid: newUid(),
    status: 'ativa',
    createdAt: now,
    updatedAt: now,
  });
  const newAchievements = await checkAchievements();
  return { xpGained: 0, newAchievements };
}

export async function updateGoal(id: number, patch: Partial<Goal>): Promise<ActionResult> {
  const current = await db.goals.get(id);
  if (!current) return { xpGained: 0, newAchievements: [] };

  const next: Goal = { ...current, ...patch, updatedAt: new Date().toISOString() };
  // Conclusão de meta: XP +25 apenas na primeira vez
  let xpGained = 0;
  if (patch.status === 'concluida' && current.status !== 'concluida') {
    next.completedAt = new Date().toISOString();
    xpGained += 25;
    await addXP('meta', 25, todayISO(), `Meta concluída: ${current.title}`);
  }
  if (patch.status === 'ativa' && current.status === 'concluida') {
    next.completedAt = undefined;
  }
  await db.goals.update(id, next);
  const newAchievements = await checkAchievements();
  return { xpGained, newAchievements };
}

export async function deleteGoal(id: number): Promise<void> {
  const goal = await db.goals.get(id);
  await logDeletion('goals', goal?.uid);
  await db.goals.delete(id);
}

/* ============================== COFRINHOS (PIGGY BANKS) ============================== */

/** Define/atualiza a meta de poupança de um sonho (habilita o cofrinho) */
export async function setDreamTarget(id: number, targetValue: number | undefined): Promise<void> {
  await db.dreams.update(id, { targetValue, updatedAt: new Date().toISOString() });
}

export interface DreamDepositInput {
  dreamId: number;
  amount: number;
  date: string;
  note?: string;
  /** Também registrar como despesa "Investimentos" no Orçamento */
  alsoBudget?: boolean;
}

/**
 * Guarda dinheiro no cofrinho de um sonho. Opcionalmente cria o
 * lançamento correspondente no Orçamento (despesa de Investimentos),
 * conectando as duas abas.
 */
export async function addDreamDeposit(input: DreamDepositInput): Promise<ActionResult> {
  const amount = Math.round(Math.abs(input.amount) * 100) / 100;
  if (!(amount > 0)) return { xpGained: 0, newAchievements: [] };
  const now = new Date().toISOString();
  const dream = await db.dreams.get(input.dreamId);
  await db.dreamDeposits.add({
    dreamId: input.dreamId,
    dreamUid: dream?.uid,
    amount,
    date: input.date,
    note: input.note?.trim() || undefined,
    createdAt: now,
  });
  if (input.alsoBudget) {
    await addBudgetEntry({
      type: 'despesa',
      category: 'Investimentos',
      description: `Cofrinho de sonho`,
      value: amount,
      date: input.date,
      frequency: 'unica',
    });
    // marca o ÚLTIMO depósito do sonho como registrado no orçamento
    const last = await db.dreamDeposits.where('dreamId').equals(input.dreamId).last();
    if (last?.id) await db.dreamDeposits.update(last.id, { registeredInBudget: true });
  }
  const newAchievements = await checkAchievements();
  return { xpGained: 0, newAchievements };
}

/** Remove um depósito do cofrinho (correção manual) */
export async function deleteDreamDeposit(id: number): Promise<void> {
  await db.dreamDeposits.delete(id);
}

/* ============================== IMPORTAÇÃO DE EXTRATOS ============================== */

export interface ImportRowInput {
  type: BudgetEntry['type'];
  category: string;
  description: string;
  value: number;
  date: string;
}

/**
 * Importa em lote as linhas confirmadas pelo usuário no preview.
 * Registra o lote (ImportBatch) para rastreabilidade e roda as conquistas.
 */
export async function importBudgetEntries(
  rows: ImportRowInput[],
  meta: { fileName: string; format: 'ofx' | 'csv'; skipped: number },
): Promise<{ imported: number }> {
  const now = new Date().toISOString();
  await db.transaction('rw', [db.budget, db.importBatches], async () => {
    await db.budget.bulkAdd(
      rows.map((r) => ({
        ...r,
        value: Math.round(Math.abs(r.value) * 100) / 100,
        frequency: 'unica' as const,
        uid: newUid(),
        createdAt: now,
        updatedAt: now,
      })),
    );
    const dates = rows.map((r) => r.date).sort();
    await db.importBatches.add({
      fileName: meta.fileName.slice(0, 160),
      format: meta.format,
      imported: rows.length,
      skipped: meta.skipped,
      from: dates[0],
      to: dates[dates.length - 1],
      importedAt: now,
    });
  });
  await checkAchievements();
  return { imported: rows.length };
}

/* ============================== DESAFIOS DA SEMANA ============================== */

/**
 * Resgata o XP de um desafio concluído. A chave única
 * `${challengeId}:${periodKey}` garante XP uma única vez por semana.
 */
export async function completeChallenge(
  challengeId: string,
  periodKey: string,
  xp: number,
): Promise<ActionResult> {
  const key = `${challengeId}:${periodKey}`;
  const existing = await db.challengeCompletions.get(key);
  if (existing) return { xpGained: 0, newAchievements: [] };
  await db.challengeCompletions.put({
    key,
    challengeId,
    periodKey,
    completedAt: new Date().toISOString(),
    xpAwarded: xp,
  });
  await addXP('desafio', xp, todayISO(), `Desafio da semana: ${challengeId}`);
  const newAchievements = await checkAchievements();
  return { xpGained: xp, newAchievements };
}

/* ============================== ORÇAMENTO ============================== */

export async function addBudgetEntry(
  entry: Omit<BudgetEntry, 'createdAt'>,
): Promise<void> {
  const now = new Date().toISOString();
  await db.budget.add({ ...entry, uid: newUid(), createdAt: now, updatedAt: now });
  await checkAchievements();
}

export async function updateBudgetEntry(id: number, patch: Partial<BudgetEntry>): Promise<void> {
  await db.budget.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteBudgetEntry(id: number): Promise<void> {
  const entry = await db.budget.get(id);
  await logDeletion('budget', entry?.uid);
  await db.budget.delete(id);
}

/* ============================== ESTUDOS ============================== */

export async function addStudyTopic(study: {
  area: Study['area'];
  topic: string;
  description?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await db.studies.add({
    ...study,
    uid: newUid(),
    status: 'nao_iniciado',
    progress: 0,
    createdAt: now,
    updatedAt: now,
  });
}

/** Atualiza progresso/status. Concluir pela 1ª vez concede +30 XP. */
export async function updateStudy(id: number, patch: Partial<Study>): Promise<ActionResult> {
  const current = await db.studies.get(id);
  if (!current) return { xpGained: 0, newAchievements: [] };

  const next: Study = { ...current, ...patch, updatedAt: new Date().toISOString() };
  if (patch.status === 'concluido' && current.status !== 'concluido') {
    next.progress = 100;
    next.completedAt = new Date().toISOString();
  }
  if (patch.status && patch.status !== 'concluido' && current.status === 'concluido') {
    next.completedAt = undefined;
  }
  // progresso 100 manual => conclui
  if (typeof patch.progress === 'number' && patch.progress >= 100 && next.status !== 'concluido') {
    next.status = 'concluido';
    next.completedAt = new Date().toISOString();
  }

  await db.studies.update(id, next);

  let xpGained = 0;
  if (next.status === 'concluido' && current.status !== 'concluido') {
    xpGained = 30;
    await addXP('estudo', 30, todayISO(), `Estudo concluído: ${next.topic}`);
  }
  const newAchievements = await checkAchievements();
  return { xpGained, newAchievements };
}

export async function deleteStudy(id: number): Promise<void> {
  const study = await db.studies.get(id);
  await logDeletion('studies', study?.uid);
  await db.studies.delete(id);
}

/* ============================== TEMPLATES ============================== */

export async function addTemplate(t: Omit<Template, 'createdAt'>): Promise<void> {
  const now = new Date().toISOString();
  await db.templates.add({ ...t, uid: newUid(), createdAt: now, updatedAt: now });
}

export async function deleteTemplate(id: number): Promise<void> {
  const template = await db.templates.get(id);
  await logDeletion('templates', template?.uid);
  await db.templates.delete(id);
}

export async function getTemplates(): Promise<EntryTemplate[]> {
  return db.templates.toArray();
}

/* ============================== BACKUP / RESTAURAÇÃO ============================== */

/** Cria backup agora: salva no Dexie (sempre) e na pasta /Backups (se conectada) */
export async function createBackup(): Promise<{ savedTo: 'folder' | 'download' | 'local' }> {
  const dump = await dumpAll();
  const json = JSON.stringify(dump, null, 2);
  const label = new Date().toLocaleString('pt-BR');
  await db.backups.add({ createdAt: new Date().toISOString(), label, data: json });

  // Mantém apenas os últimos 10 backups locais
  const all = await db.backups.orderBy('createdAt').toArray();
  if (all.length > 10) {
    const toDelete = all.slice(0, all.length - 10).map((b) => b.id!);
    await db.backups.bulkDelete(toDelete);
  }

  if (dump.profile.length === 0) return { savedTo: 'local' };
  const dest = await saveToFolder('Backups', buildFileName('DR_Backup', 'json'), json, 'application/json');
  return { savedTo: dest };
}

/** Backup automático diário — chamado ao abrir o app se ainda não houve hoje */
export async function maybeAutoBackup(enabled: boolean): Promise<void> {
  if (!enabled) return;
  const today = todayISO();
  const last = await db.backups.orderBy('createdAt').last();
  if (last && last.createdAt.slice(0, 10) === today) return;
  try {
    await createBackup();
  } catch {
    /* silencioso */
  }
}

export async function restoreFromJSON(json: string): Promise<void> {
  const dump = JSON.parse(json) as FullDump;
  await restoreDump(dump);
}

export async function deleteBackup(id: number): Promise<void> {
  await db.backups.delete(id);
}

/** Restaura a partir do conteúdo de arquivo escolhido */
export async function restoreFromPickedFile(): Promise<boolean> {
  const { pickJsonFile } = await import('@/filesystem');
  const json = await pickJsonFile();
  if (!json) return false;
  await restoreFromJSON(json);
  return true;
}

/** Exporta JSON completo (backup portátil) */
export async function exportJSON(): Promise<string> {
  const dump = await dumpAll();
  return JSON.stringify(dump, null, 2);
}
