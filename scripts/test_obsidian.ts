/**
 * Testes unitários da integração Obsidian — roda com: bun run scripts/test_obsidian.ts
 * Cobre: markdown (frontmatter/slug/seções), gerador de vault, motor de merge
 * e criptografia .drq (round-trip + senha errada).
 */

import {
  slugify, frontmatter, parseFrontmatter, splitFrontmatter, extractSection,
  bar, escapeMd, unescapeMd,
} from '../src/obsidian/markdown';
import {
  buildVaultFiles, parseStateFile, VAULT_DIRS, DATA_FILE,
  type VaultSnapshot,
} from '../src/obsidian/vault';
import { computeMerge, type LocalTables } from '../src/obsidian/merge';
import { encryptState, decryptState } from '../src/obsidian/crypto';
import {
  splitVaultPath, putPathAt, readPathAt, removePathAt,
} from '../src/obsidian/paths';
import type { DirHandle } from '../src/filesystem';
import type {
  Profile, DiaryEntry, Goal, Dream, Study, BudgetEntry, XPEvent, EntryTemplate, DeletedLogEntry,
} from '../src/types';

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string, extra?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

/* ============================== 1. MARKDOWN ============================== */
console.log('\n[1] markdown.ts');

ok(slugify('Reserva de Emergência') === 'reserva-de-emergencia', 'slugify com acentos');
ok(slugify('Meta #1: R$ 1.000.000!') === 'meta-1-r-1000000', 'slugify remove símbolos');
ok(slugify('') === 'sem-nome', 'slugify vazio → sem-nome');

const fm = frontmatter([
  ['app', 'diario-da-riqueza'],
  ['tipo', 'diario'],
  ['data', '2026-10-01'],
  ['uid', 'abc-123'],
  ['xp', 90],
  ['energia', 8],
  ['realizado', false],
  ['tags', ['diario-riqueza', "obsidian's"]],
]);
ok(fm.startsWith('---\napp: '), 'frontmatter abre com ---');
const parsed = parseFrontmatter(fm);
ok(parsed.tipo === 'diario', 'parse: string');
ok(parsed.xp === 90, 'parse: número');
ok(parsed.realizado === false, 'parse: booleano');
ok(Array.isArray(parsed.tags) && (parsed.tags as string[])[1] === "obsidian's", 'parse: array com aspas escapadas');

const doc = `${fm}\n\n# Título\n\ncorpo`;
const split = splitFrontmatter(doc);
ok(split.fm.tipo === 'diario' && split.body.startsWith('# Título'), 'splitFrontmatter separa fm/corpo');

const secBody = [
  '## Reflexões',
  '',
  escapeMd('Linha normal\n## Não sou header\n### Também não'),
  '',
  '## Em prática',
  '',
  'Ação de teste',
].join('\n');
const reflex = extractSection(secBody, 'Reflexões');
ok(reflex === 'Linha normal\n## Não sou header\n### Também não', 'extractSection respeita escape de #');
ok(unescapeMd(reflex!) === 'Linha normal\n## Não sou header\n### Também não', 'unescapeMd devolve original');
ok(extractSection(secBody, 'Em prática') === 'Ação de teste', 'extractSection segunda seção');
ok(extractSection(secBody, 'Inexistente') === null, 'extractSection seção ausente → null');

ok(bar(60) === '▓▓▓▓▓▓░░░░', 'bar 60%');
ok(bar(100) === '▓▓▓▓▓▓▓▓▓▓' && bar(0) === '░░░░░░░░░░' && bar(150) === '▓▓▓▓▓▓▓▓▓▓', 'bar limites');

/* ============================== 2. GERADOR DE VAULT ============================== */
console.log('\n[2] vault.ts');

const now = new Date().toISOString();
const profile: Profile = {
  id: 'profile', name: 'Testador', journalName: 'Rumo ao Milhão', yearGoal: 1000000,
  targetDate: '2027-07-31', createdAt: now, updatedAt: now,
};
const entry: DiaryEntry = {
  id: 1, uid: 'e1', date: '2026-10-01', wakeTime: '05:30', exercise: 'Treino', exerciseDone: true,
  meals: 'Limpa', studyTopic: 'Juros', studySummary: 'Poder dos juros', productiveActions: '1. Estudar\n2. Vender',
  income: 8500, expense: 3200, thoughts: 'Dia #ótimo\n## teste escape', practice: 'Prospectei 3 clientes',
  mood: 'otimo', energy: 9, xpEarned: 90, createdAt: now, updatedAt: now,
};
const goal: Goal = {
  id: 2, uid: 'g1', category: 'financeira', title: 'Reserva de Emergência', targetValue: 30000,
  currentValue: 5100, deadline: '2026-12-31', status: 'ativa', createdAt: now, updatedAt: now,
};
const dream: Dream = { id: 3, uid: 'd1', title: 'Casa na praia', achieved: false, createdAt: now, updatedAt: now };
const study: Study = {
  id: 4, uid: 's1', area: 'financas', topic: 'Juros Compostos', status: 'concluido', progress: 100,
  notes: 'Aprendi que o tempo é o maior multiplicador', createdAt: now, updatedAt: now,
};
const budget: BudgetEntry = {
  id: 5, uid: 'b1', type: 'receita', category: 'Salário', description: 'Mensal', value: 8500,
  date: '2026-10-05', frequency: 'mensal', createdAt: now, updatedAt: now,
};
const xp: XPEvent = { id: 1, type: 'registro_dia', amount: 50, date: '2026-10-01', description: 'Dia registrado', createdAt: now };
const seedTemplate: EntryTemplate = { id: 1, uid: 't1', name: 'Padrão', exerciseDone: true, createdAt: now };

const snap: VaultSnapshot = {
  profile, entries: [entry], budget: [budget], goals: [goal], dreams: [dream], studies: [study],
  xpEvents: [xp], achievements: [], templates: [seedTemplate], deletedLog: [],
  deviceId: 'device-test', geradoEm: now,
};

const files = buildVaultFiles(snap);
const byPath = new Map(files.map((f) => [f.path, f.content]));

ok(files.some((f) => f.path === '00-Dashboard.md'), 'dashboard gerado');
ok(byPath.has(`${VAULT_DIRS.diario}/2026-10-01.md`), 'entrada do diário');
ok(byPath.has(`${VAULT_DIRS.metas}/reserva-de-emergencia.md`), 'meta com slug');
ok(byPath.has(`${VAULT_DIRS.biblioteca}/juros-compostos.md`), 'estudo iniciado');
ok(byPath.has(`${VAULT_DIRS.sonhos}/casa-na-praia.md`), 'sonho');
ok(byPath.has(`${VAULT_DIRS.orcamento}/2026-10.md`), 'orçamento mensal');
ok(byPath.has(DATA_FILE), 'arquivo de estado _dados');

const dash = byPath.get('00-Dashboard.md')!;
ok(dash.includes('[[02-Metas/reserva-de-emergencia|Reserva de Emergência]]'), 'wikilink de meta no dashboard');
ok(dash.includes('▓') && dash.includes('░'), 'barras de progresso no dashboard');
ok(dash.includes('Rumo ao Milhão'), 'nome do diário no dashboard');

const entryMd = byPath.get(`${VAULT_DIRS.diario}/2026-10-01.md`)!;
const entryParsed = splitFrontmatter(entryMd);
ok(entryParsed.fm.uid === 'e1' && entryParsed.fm.tipo === 'diario', 'frontmatter da entrada');
ok(entryMd.includes('## Reflexões') && entryMd.includes('## Em prática'), 'seções parseáveis na entrada');
ok(entryMd.includes('\\## teste escape'), 'heading do usuário escapado');
ok(entryParsed.fm['receita'] === 8500, 'valores numéricos no frontmatter');

// round-trip: seções extraídas do arquivo correspondem aos dados originais
const thoughtsBack = extractSection(entryParsed.body, 'Reflexões');
ok(thoughtsBack === 'Dia #ótimo\n## teste escape', 'round-trip Reflexões');
const practiceBack = extractSection(entryParsed.body, 'Em prática');
ok(practiceBack === 'Prospectei 3 clientes', 'round-trip Em prática');

// estado JSON
const state = parseStateFile(byPath.get(DATA_FILE)!);
ok(state?.formato === 2 && state.dados.entries.length === 1, 'estado parseStateFile');
ok(state?.dados.deletions !== undefined, 'estado contém deletions');
ok(parseStateFile('{"app":"outro"}') === null, 'estado inválido rejeitado');

/* ============================== 3. MERGE ============================== */
console.log('\n[3] merge.ts');

function mkLocal(over?: Partial<LocalTables>): LocalTables {
  return {
    profile, entries: [entry], budget: [budget], goals: [goal], dreams: [dream], studies: [study],
    templates: [seedTemplate], xpEvents: [xp], achievements: [], deletedLog: [],
    ...over,
  };
}

// A) Sem remoto → nada a fazer
const r0 = computeMerge(mkLocal(), {
  app: 'diario-da-riqueza', formato: 2, deviceId: 'device-test', geradoEm: now,
  dados: { profile: [], entries: [], goals: [], budget: [], studies: [], dreams: [], templates: [], xpEvents: [], achievements: [], deletions: [] },
});
ok(r0.stats.added === 0 && r0.stats.updated === 0, 'merge vazio = no-op');

// B) Mesmo deviceId → skip (evita auto-merge)
const rB = computeMerge(mkLocal(), {
  app: 'diario-da-riqueza', formato: 2, deviceId: 'device-test', geradoEm: now,
  dados: { profile: [profile], entries: [{ ...entry, id: 999, thoughts: 'OUTRO' }], goals: [], budget: [], studies: [], dreams: [], templates: [], xpEvents: [], achievements: [], deletions: [] },
});
// deviceId igual NÃO é tratado no computeMerge (é no sync.ts) — aqui mescla normal LWW
ok(rB.stats.updated === 0 && rB.stats.skipped >= 1, 'registro igual → skipped (LWW)');

// C) Remoto mais novo → update preservando id local
const rC = computeMerge(mkLocal(), {
  app: 'diario-da-riqueza', formato: 2, deviceId: 'celular', geradoEm: now,
  dados: {
    profile: [], entries: [{ ...entry, thoughts: 'Editado no celular', updatedAt: new Date(Date.now() + 60000).toISOString() }],
    goals: [], budget: [], studies: [], dreams: [], templates: [], xpEvents: [], achievements: [], deletions: [],
  },
});
ok(rC.stats.updated === 1, 'update LWW detectado');
ok(rC.updates.entries[0]?.id === 1, 'id LOCAL preservado no update');
ok(rC.updates.entries[0]?.thoughts === 'Editado no celular', 'conteúdo remoto aplicado');

// D) Registro novo no remoto → add sem id
const rD = computeMerge(mkLocal(), {
  app: 'diario-da-riqueza', formato: 2, deviceId: 'celular', geradoEm: now,
  dados: {
    profile: [], entries: [],
    goals: [{ ...goal, id: 77, uid: 'g-novo', title: 'Meta do celular' }],
    budget: [], studies: [], dreams: [], templates: [], xpEvents: [], achievements: [], deletions: [],
  },
});
ok(rD.stats.added === 1 && rD.adds.goals[0]?.title === 'Meta do celular', 'add do remoto');
ok(rD.adds.goals[0]?.id === undefined, 'id remoto descartado no add (autoincrement local)');

// E) Tombstone remoto apaga registro local; registro mais novo sobrevive
const oldDeletion: DeletedLogEntry = { key: 'dreams:d1', table: 'dreams', uid: 'd1', deletedAt: new Date(Date.now() + 30000).toISOString() };
const rE = computeMerge(mkLocal(), {
  app: 'diario-da-riqueza', formato: 2, deviceId: 'celular', geradoEm: now,
  dados: {
    profile: [], entries: [], goals: [], budget: [], studies: [], dreams: [], templates: [],
    xpEvents: [], achievements: [], deletions: [oldDeletion],
  },
});
ok(rE.stats.removed === 1 && rE.deletes[0]?.table === 'dreams', 'tombstone vence registro antigo');
ok(rE.deletions.some((t) => t.key === 'dreams:d1'), 'tombstone persistido na união');

const resurrect = { ...dream, updatedAt: new Date(Date.now() + 120000).toISOString() }; // recriado depois da deleção
const rE2 = computeMerge(mkLocal({ dreams: [resurrect] }), {
  app: 'diario-da-riqueza', formato: 2, deviceId: 'celular', geradoEm: now,
  dados: {
    profile: [], entries: [], goals: [], budget: [], studies: [], dreams: [], templates: [],
    xpEvents: [], achievements: [], deletions: [oldDeletion],
  },
});
ok(rE2.stats.removed === 0, 'registro editado APÓS tombstone sobrevive');

// F) Conflito de mesma data (uids diferentes) — mais novo vence
const remoteSameDay: DiaryEntry = {
  ...entry, id: 44, uid: 'e2', thoughts: 'Versão do celular', updatedAt: new Date(Date.now() + 60000).toISOString(),
};
const rF = computeMerge(mkLocal(), {
  app: 'diario-da-riqueza', formato: 2, deviceId: 'celular', geradoEm: now,
  dados: {
    profile: [], entries: [remoteSameDay], goals: [], budget: [], studies: [], dreams: [], templates: [],
    xpEvents: [], achievements: [], deletions: [],
  },
});
ok(rF.stats.conflicts === 1, 'conflito de data contabilizado');
ok(rF.updates.entries[0]?.id === 1 && rF.updates.entries[0]?.thoughts === 'Versão do celular', 'conflito: remoto mais novo vence com id local');

// G) XP dedupe por chave natural
const rG = computeMerge(mkLocal(), {
  app: 'diario-da-riqueza', formato: 2, deviceId: 'celular', geradoEm: now,
  dados: {
    profile: [], entries: [], goals: [], budget: [], studies: [], dreams: [], templates: [],
    xpEvents: [
      { ...xp, id: 9 }, // duplicado exato
      { ...xp, id: 10, type: 'estudo', amount: 30, description: 'Estudo concluído: X' }, // novo
    ],
    achievements: [], deletions: [],
  },
});
ok(rG.stats.xpAdded === 1 && rG.xpAdds[0]?.type === 'estudo', 'XP dedupe por chave natural');

// H) Perfil LWW
const rH = computeMerge(mkLocal({ profile }), {
  app: 'diario-da-riqueza', formato: 2, deviceId: 'celular', geradoEm: now,
  dados: {
    profile: [{ ...profile, yearGoal: 2000000, updatedAt: new Date(Date.now() + 60000).toISOString() }],
    entries: [], goals: [], budget: [], studies: [], dreams: [], templates: [], xpEvents: [], achievements: [], deletions: [],
  },
});
ok(rH.stats.profileUpdated && rH.profile?.yearGoal === 2000000, 'perfil: LWW aplica remoto mais novo');

// I) Remoto sem uid → skipped (defensivo)
const rI = computeMerge(mkLocal(), {
  app: 'diario-da-riqueza', formato: 2, deviceId: 'celular', geradoEm: now,
  dados: {
    profile: [], entries: [{ ...entry, uid: undefined }], goals: [], budget: [], studies: [], dreams: [], templates: [],
    xpEvents: [], achievements: [], deletions: [],
  },
});
ok(rI.stats.skipped >= 1 && rI.stats.added === 0, 'registro sem uid é ignorado');

/* ============================== 4. CRYPTO ============================== */
console.log('\n[4] crypto.ts');

const payload = JSON.stringify({ teste: 'dados', numero: 42, array: [1, 2, 3] });
const enc = await encryptState(payload, 'senha-super-segura');
ok(enc[0] === 0x44 && enc[1] === 0x52 && enc[2] === 0x51 && enc[3] === 0x31, 'magic DRQ1');
const dec = await decryptState(enc, 'senha-super-segura');
ok(dec === payload, 'round-trip encrypt/decrypt');

let wrongPassThrew = false;
try {
  await decryptState(enc, 'senha-errada-123');
} catch {
  wrongPassThrew = true;
}
ok(wrongPassThrew, 'senha errada falha (AES-GCM auth)');

let shortPassThrew = false;
try {
  await encryptState(payload, 'curta');
} catch {
  shortPassThrew = true;
}
ok(shortPassThrew, 'senha curta rejeitada');

/* ============================== 5. PATHS (REGRESSÃO "Name is not allowed") ============================== */
console.log('\n[5] paths.ts — navegação de caminhos no File System Access');

/**
 * Mock de FileSystemDirectoryHandle que REJEITA nomes com `/`, `\\`, '.', '..'
 * exatamente como o Chrome faz (NameNotAllowedError). Se qualquer helper tentar
 * gravar um caminho aninhado de uma vez só, o teste falha — regressão travada.
 */
interface MockFileRecord { name: string; content: string; mtime: number }

class MockFileHandle {
  kind = 'file' as const;
  name: string;
  private rec: MockFileRecord;
  constructor(rec: MockFileRecord) { this.rec = rec; this.name = rec.name; }
  async getFile() {
    return { text: async () => this.rec.content, lastModified: this.rec.mtime } as unknown as File;
  }
  async createWritable() {
    const rec = this.rec;
    return {
      async write(data: string) { rec.content = data; rec.mtime = Date.now(); },
      async close() { /* noop */ },
    };
  }
}

class MockDirHandle {
  kind = 'directory' as const;
  name: string;
  private files = new Map<string, MockFileRecord>();
  private dirs = new Map<string, MockDirHandle>();
  constructor(name: string) { this.name = name; }

  private assertLegal(name: string) {
    if (
      name.length === 0 || name === '.' || name === '..' ||
      name.includes('/') || name.includes('\\') || name.includes('\0')
    ) {
      throw new DOMException(
        "Failed to execute 'getFileHandle' on 'FileSystemDirectoryHandle': Name is not allowed.",
        'NotAllowedError',
      );
    }
  }

  async getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<MockDirHandle> {
    this.assertLegal(name);
    let d = this.dirs.get(name);
    if (!d) {
      if (!opts?.create) throw new DOMException('NotFoundError', 'NotFoundError');
      d = new MockDirHandle(name);
      this.dirs.set(name, d);
    }
    return d;
  }

  async getFileHandle(name: string, opts?: { create?: boolean }): Promise<MockFileHandle> {
    this.assertLegal(name);
    let rec = this.files.get(name);
    if (!rec) {
      if (!opts?.create) throw new DOMException('NotFoundError', 'NotFoundError');
      rec = { name, content: '', mtime: Date.now() };
      this.files.set(name, rec);
    }
    return new MockFileHandle(rec);
  }

  async removeEntry(name: string): Promise<void> {
    this.assertLegal(name);
    if (!this.files.delete(name)) throw new DOMException('NotFoundError', 'NotFoundError');
  }

  async *values(): AsyncIterable<MockDirHandle | MockFileHandle> {
    for (const d of this.dirs.values()) yield d;
    for (const f of this.files.values()) yield new MockFileHandle(f);
  }

  /** Lista todos os paths relativos (para asserções) */
  listPaths(prefix = ''): string[] {
    const out: string[] = [];
    for (const [name, d] of this.dirs) out.push(...d.listPaths(`${prefix}${name}/`));
    for (const name of this.files.keys()) out.push(`${prefix}${name}`);
    return out.sort();
  }
}

const vaultRoot = new MockDirHandle('vault');
const rootAsDir = vaultRoot as unknown as DirHandle;

// A) splitVaultPath
const sp = splitVaultPath('_dados/diario-da-riqueza.json');
ok(sp.segments.length === 1 && sp.segments[0] === '_dados' && sp.fileName === 'diario-da-riqueza.json', 'splitVaultPath: 1 subpasta + arquivo');
let badPathThrew = false;
try { splitVaultPath('so-arquivo.md'); } catch { badPathThrew = true; }
ok(badPathThrew, 'splitVaultPath: path sem subpasta é inválido');

// B) Escrita aninhada — o mock falha o teste se alguém passar '/' no nome
await putPathAt(rootAsDir, '_dados/diario-da-riqueza.json', '{"app":"diario-da-riqueza"}');
await putPathAt(rootAsDir, '01-Diario/2026-10-01.md', 'conteúdo do dia');
await putPathAt(rootAsDir, '00-Dashboard.md', '# Dashboard');
ok(true, 'putPathAt grava nested e root sem lançar (mock valida nomes)');

// C) Estrutura final correta no disco simulado
const paths = vaultRoot.listPaths();
ok(paths.includes('_dados/diario-da-riqueza.json') && paths.includes('01-Diario/2026-10-01.md') && paths.includes('00-Dashboard.md'), 'estrutura no disco: pastas navegadas, não nomes com /');

// D) Leitura via readPathAt
const json = await readPathAt(rootAsDir, '_dados/diario-da-riqueza.json');
ok(json === '{"app":"diario-da-riqueza"}', 'readPathAt lê nested');
ok((await readPathAt(rootAsDir, '00-Dashboard.md')) === '# Dashboard', 'readPathAt lê raiz');
ok((await readPathAt(rootAsDir, '_dados/nao-existe.json')) === null, 'readPathAt inexistente → null');

// E) Sobrescrita idempotente
await putPathAt(rootAsDir, '01-Diario/2026-10-01.md', 'conteúdo v2');
ok((await readPathAt(rootAsDir, '01-Diario/2026-10-01.md')) === 'conteúdo v2', 'putPathAt sobrescreve');

// F) Remoção (cleanup de órfãos)
await removePathAt(rootAsDir, '01-Diario/2026-10-01.md');
ok((await readPathAt(rootAsDir, '01-Diario/2026-10-01.md')) === null, 'removePathAt remove nested');
await removePathAt(rootAsDir, '01-Diario/2026-10-01.md'); // remover de novo não lança
ok(true, 'removePathAt é silencioso se já não existe');

// G) SIMULAÇÃO COMPLETA do writeVault: todos os arquivos do vault real + índice
const snapSim: VaultSnapshot = { ...mkLocal(), deviceId: 'teste-paths', geradoEm: now };
const vaultFiles = buildVaultFiles(snapSim);
const simRoot = new MockDirHandle('vault');
const simRootDir = simRoot as unknown as DirHandle;
let simThrew = false;
try {
  for (const f of vaultFiles) await putPathAt(simRootDir, f.path, f.content);
  await putPathAt(simRootDir, '_dados/indice-arquivos.json', JSON.stringify({ arquivos: vaultFiles.map((f) => f.path) }));
} catch (e) {
  simThrew = true;
  console.error('    erro:', e instanceof Error ? e.message : e);
}
ok(!simThrew && simRoot.listPaths().length === vaultFiles.length + 1, `vault completo gravado sem erro (${vaultFiles.length} arquivos + índice)`);
ok((await readPathAt(simRootDir, DATA_FILE)) !== null, 'estado de sync legível após gravação (merge multi-dispositivo desbloqueado)');
ok((await readPathAt(simRootDir, '_dados/indice-arquivos.json')) !== null, 'índice de órfãos legível após gravação');

/* ============================== RESUMO ============================== */
console.log(`\n${'='.repeat(50)}`);
console.log(`RESULTADO: ${passed} passaram, ${failed} falharam`);
if (failed > 0) process.exit(1);
