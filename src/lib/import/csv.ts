/**
 * Parser tolerante de extratos CSV bancários brasileiros.
 *
 * Cobre as variações reais do mercado:
 * - Delimitadores: vírgula, ponto-e-vírgula ou tabulação (detectado por contagem)
 * - Datas: dd/mm/aaaa, dd/mm/aa, aaaa-mm-dd (com ou sem hora)
 * - Valores: "R$ 1.234,56", "-1.234,56", "1234.56", "1,234.56"
 * - Com/sem cabeçalho (colunas mapeadas por nome quando detectado)
 * - Coluna de tipo opcional (Crédito/Débito, Entrada/Saída, C/D, D/C…)
 */

export interface CsvTransaction {
  /** 'yyyy-MM-dd' */
  date: string;
  /** Valor absoluto (sem sinal) */
  amount: number;
  type: 'receita' | 'despesa';
  description: string;
}

/* ============================== CSV BÁSICO ============================== */

/** Detecta o delimitador dominante nas primeiras linhas */
export function detectDelimiter(text: string): ',' | ';' | '\t' {
  const sample = text.split(/\r?\n/).slice(0, 10).join('\n');
  const counts: Array<[string, number]> = [
    [';', (sample.match(/;/g) ?? []).length],
    ['\t', (sample.match(/\t/g) ?? []).length],
    [',', (sample.match(/,/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] === 0 ? ',' : (counts[0][0] as ',' | ';' | '\t');
}

/** Linha CSV → campos (respeita aspas duplas e "" escapado) */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

/* ============================== VALOR ============================== */

/** "R$ 1.234,56" | "-1.234,56" | "1234.56" | "1,234.56" → number (sinal preservado) */
export function parseMoney(raw: string): number | null {
  let s = raw.trim().replace(/[R$\s]/gi, '');
  if (!s) return null;
  const neg = /^\(.*\)$/.test(s) || s.startsWith('-');
  s = s.replace(/[()\-+]/g, '');
  if (s.includes(',') && s.includes('.')) {
    // o último separador que aparece é o decimal
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}

/* ============================== DATA ============================== */

/** dd/mm/aaaa | dd/mm/aa | aaaa-mm-dd (±hora) → 'yyyy-MM-dd' */
export function parseBrDate(raw: string): string | null {
  const s = raw.trim().split(/[\sT]/)[0]; // remove hora
  let m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    if (m[3].length === 2) year += year < 70 ? 2000 : 1900;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    const month = parseInt(mo, 10);
    const day = parseInt(d, 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

/* ============================== TIPO ============================== */

const RECV_RE = /^(c|credito|cr[eé]dito|entrada|receita|recebimento|deposito|dep[oó]sito|inflow|credit)/i;
const EXP_RE = /^(d|debito|d[eé]bito|saida|despesa|pagamento|saque|withdrawal|debit)/i;

/** Coluna de tipo opcional → 'receita' | 'despesa' | null */
export function parseTypeColumn(raw: string): 'receita' | 'despesa' | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (RECV_RE.test(s)) return 'receita';
  if (EXP_RE.test(s)) return 'despesa';
  return null;
}

/* ============================== CABEÇALHO ============================== */

const DATE_RE = /data|date|dia/i;
const DESC_RE = /desc|hist[oé]rico|historico|memo|lan[cç]amento|detalhe|estabelecimento|title|t[ií]tulo/i;
const AMOUNT_RE = /valor|value|amount|quantia|importance|montante/i;
const TYPE_RE = /tipo|type|d[cc]/i;

export interface CsvParseResult {
  transactions: CsvTransaction[];
  /** Linhas ignoradas (sem data e/ou valor parseáveis) */
  skipped: number;
  delimiter: string;
  hadHeader: boolean;
}

/** Faz o parse do texto completo de um extrato CSV */
export function parseCsv(text: string): CsvParseResult {
  const delimiter = detectDelimiter(text);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { transactions: [], skipped: 0, delimiter, hadHeader: false };
  }

  // Mapeamento de colunas por cabeçalho (quando a 1ª linha parece cabeçalho)
  let colDate = -1;
  let colDesc = -1;
  let colAmount = -1;
  let colType = -1;
  const firstRow = splitCsvLine(lines[0], delimiter);
  const headerLooksLikeHeader = firstRow.some((c) =>
    DATE_RE.test(c) || DESC_RE.test(c) || AMOUNT_RE.test(c),
  );
  if (headerLooksLikeHeader) {
    firstRow.forEach((cell, i) => {
      if (colDate < 0 && DATE_RE.test(cell)) colDate = i;
      else if (colDesc < 0 && DESC_RE.test(cell)) colDesc = i;
      else if (colAmount < 0 && AMOUNT_RE.test(cell)) colAmount = i;
      else if (colType < 0 && TYPE_RE.test(cell)) colType = i;
    });
  }

  const rows = headerLooksLikeHeader ? lines.slice(1) : lines;
  const transactions: CsvTransaction[] = [];
  let skipped = 0;

  for (const line of rows) {
    const cells = splitCsvLine(line, delimiter);
    if (cells.length < 2) {
      skipped++;
      continue;
    }

    // Data: coluna mapeada ou 1ª célula parseável
    let date: string | null = null;
    if (colDate >= 0 && cells[colDate] !== undefined) {
      date = parseBrDate(cells[colDate]);
    }
    if (!date) {
      for (const cell of cells) {
        const parsed = parseBrDate(cell);
        if (parsed) {
          date = parsed;
          break;
        }
      }
    }
    if (!date) {
      skipped++;
      continue;
    }

    // Valor: coluna mapeada ou 1ª célula monetária parseável
    let amount: number | null = null;
    let typeHint: 'receita' | 'despesa' | null = null;
    if (colAmount >= 0 && cells[colAmount] !== undefined) {
      amount = parseMoney(cells[colAmount]);
      if (colType >= 0 && cells[colType] !== undefined) {
        typeHint = parseTypeColumn(cells[colType]);
      }
    }
    if (amount === null) {
      for (let i = 0; i < cells.length; i++) {
        if (i === colDate) continue;
        const v = parseMoney(cells[i]);
        // precisa parecer monetário: tem separador decimal/cifrão/sinal
        const raw = cells[i];
        const looksMoney = /[.,]/.test(raw) && /\d/.test(raw) && parseBrDate(raw) === null;
        if (v !== null && looksMoney) {
          amount = v;
          if (colType >= 0 && cells[colType] !== undefined) {
            typeHint = parseTypeColumn(cells[colType]);
          }
          break;
        }
      }
    }
    if (amount === null || amount === 0) {
      skipped++;
      continue;
    }

    // Descrição: coluna mapeada ou a célula de texto mais longa que não seja data/valor
    let description = '';
    if (colDesc >= 0 && cells[colDesc] !== undefined) {
      description = cells[colDesc];
    } else {
      let best = '';
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (parseBrDate(cell) || parseMoney(cell) !== null) continue;
        if (cell.length > best.length) best = cell;
      }
      description = best;
    }
    description = description.replace(/\s+/g, ' ').slice(0, 160) || 'Transação importada';

    const type =
      typeHint ?? (amount > 0 ? 'receita' : 'despesa');
    transactions.push({ date, amount: Math.abs(amount), type, description });
  }

  return { transactions, skipped, delimiter, hadHeader: headerLooksLikeHeader };
}
