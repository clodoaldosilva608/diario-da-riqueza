/**
 * Diário da Riqueza — Primitivas de Markdown para o vault do Obsidian.
 *
 * Funções PURAS (sem acesso ao Dexie/browser) para que possam ser testadas
 * em Node/Bun e reutilizadas pelo gerador de vault e pelo importador.
 *
 * Schema de frontmatter: YAML simplificado (nosso próprio subset — strings
 * sempre entre aspas simples, arrays inline). O parser só precisa entender
 * o que NÓS escrevemos; nunca reescrevemos arquivos que não são nossos.
 */

/* ============================== TIPOS ============================== */

export type FMValue = string | number | boolean | string[];

/** Arquivo do vault — path relativo à pasta `Diario_da_Riqueza/` */
export interface VaultFile {
  path: string;
  content: string;
}

/* ============================== SLUG / NOMES ============================== */

const SEP = /[\s_]+/g; // espaços/underscores viram hífen
const UNSAFE = /[^a-z0-9-]/g; // slug final é ASCII puro

/**
 * Slug ASCII para nomes de arquivo (evita problemas de encoding em ZIP
 * antigo/Windows). Acentos pt-BR transliterados manualmente.
 */
export function slugify(title: string): string {
  const map: Record<string, string> = {
    á: 'a', à: 'a', ã: 'a', â: 'a', ä: 'a',
    é: 'e', ê: 'e', è: 'e', ë: 'e',
    í: 'i', î: 'i', ì: 'i', ï: 'i',
    ó: 'o', ô: 'o', õ: 'o', ò: 'o', ö: 'o',
    ú: 'u', û: 'u', ù: 'u', ü: 'u',
    ç: 'c', ñ: 'n',
  };
  const slug = title
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(SEP, '-') // espaços/underscores → hífen (ANTES de remover o resto)
    .replace(UNSAFE, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'sem-nome';
}

/** Remove caracteres inválidos de nome de arquivo (defesa extra) */
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|#^[\]]/g, '').replace(/\s+/g, ' ').trim();
}

/* ============================== FRONTMATTER ============================== */

function yamlScalar(v: FMValue): string {
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    return `[${v.map((s) => `'${String(s).replace(/'/g, "''")}'`).join(', ')}]`;
  }
  // strings sempre entre aspas simples (determinístico e round-trip seguro)
  return `'${v.replace(/'/g, "''")}'`;
}

/** Serializa frontmatter YAML com ordem estável (iteração do array) */
export function frontmatter(fields: Array<[string, FMValue]>): string {
  const lines = fields
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${yamlScalar(v)}`);
  return `---\n${lines.join('\n')}\n---`;
}

/**
 * Parser do nosso subset de YAML frontmatter.
 * Suporta: chave: 'texto' | número | booleano | [a, b].
 * Ignora o corpo (após o `---` de fechamento).
 */
export function parseFrontmatter(raw: string): Record<string, FMValue> {
  const out: Record<string, FMValue> = {};
  if (!raw.startsWith('---')) return out;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return out;
  const block = raw.slice(3, end).replace(/^\n/, '');
  for (const line of block.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s?(.*)$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    const val = rawVal.trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim();
      out[key] =
        inner.length === 0
          ? []
          : inner.split(',').map((s) => {
              const t = s.trim().replace(/^'+|'+$/g, '');
              return t.replace(/''/g, "'");
            });
    } else if (/^-?\d+(\.\d+)?$/.test(val)) {
      out[key] = parseFloat(val);
    } else if (/^(true|false)$/.test(val)) {
      out[key] = val === 'true';
    } else if (/^'.*'$/.test(val) || /^".*"$/.test(val)) {
      out[key] = val.slice(1, -1).replace(/''/g, "'");
    } else {
      out[key] = val;
    }
  }
  return out;
}

/** Separa frontmatter do corpo markdown */
export function splitFrontmatter(raw: string): { fm: Record<string, FMValue>; body: string } {
  if (!raw.startsWith('---')) return { fm: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { fm: {}, body: raw };
  const bodyStart = raw.indexOf('\n', end + 1);
  return {
    fm: parseFrontmatter(raw),
    body: bodyStart === -1 ? '' : raw.slice(bodyStart + 1).replace(/^\n+/, ''),
  };
}

/* ============================== CORPO / SEÇÕES ============================== */

/** Barras de progresso unicode — rendem lindo no Obsidian */
export function bar(pct: number, size = 10): string {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  const filled = Math.round((p / 100) * size);
  return '▓'.repeat(filled) + '░'.repeat(size - filled);
}

/** Escapa headings do usuário dentro de seções (estabilidade do parser) */
export function escapeMd(text: string): string {
  return text.replace(/^(#{1,6} )/gm, '\\$1');
}

/** Desfaz o escape ao importar */
export function unescapeMd(text: string): string {
  return text.replace(/^\\(#{1,6} )/gm, '$1');
}

/**
 * Extrai o conteúdo de uma seção `## Título` do corpo.
 * Conteúdo = linhas entre o header e o próximo `## ` (ou fim).
 */
export function extractSection(body: string, title: string): string | null {
  const lines = body.split('\n');
  const header = new RegExp(`^## ${title}\\s*$`, 'i');
  let capturing = false;
  const buf: string[] = [];
  for (const line of lines) {
    if (header.test(line.trim())) {
      capturing = true;
      continue;
    }
    if (capturing) {
      if (/^## /.test(line.trim())) break;
      buf.push(line);
    }
  }
  if (!capturing) return null;
  return unescapeMd(buf.join('\n').replace(/^\n+/, '').replace(/\n+$/, ''));
}

/** Escapa pipes/quebras em texto de tabela */
export function tableCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
