/**
 * Parser tolerante de extratos OFX (Open Financial Exchange).
 *
 * Suporta os dois formatos reais encontrados nos bancos brasileiros:
 * - OFX 1.x (SGML): cabeçalhos `OFXHEADER:100` + tags sem fechamento
 * - OFX 2.x (XML): `<?xml?>` + tags aninhadas normais
 *
 * A estratégia é a mesma para os dois: localizar blocos `<STMTTRN>…</STMTTRN>`
 * (case-insensitive) e extrair os campos relevantes de cada transação.
 * Campos opcionais: MEMO → NAME → fallback "Transação".
 */

export interface OfxTransaction {
  /** 'yyyy-MM-dd' */
  date: string;
  /** Valor absoluto (sem sinal) */
  amount: number;
  /** 'receita' quando o OFX traz valor positivo, 'despesa' quando negativo */
  type: 'receita' | 'despesa';
  description: string;
  /** Identificador único da transação no banco (dedupe confiável) */
  fitid?: string;
}

/** Converte DTPOSTED OFX ('20250912' | '20250912103000' | '20250912103000[-3:BRT]') → 'yyyy-MM-dd' */
export function parseOfxDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const month = parseInt(mo, 10);
  const day = parseInt(d, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${mo}-${d}`;
}

/** Converte TRNAMT OFX para número (aceita vírgula decimal de bancos mal-comportados) */
export function parseOfxAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',') && !cleaned.includes('.')
    ? cleaned.replace(',', '.')
    : cleaned.replace(/,/g, '');
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Extrai o valor da primeira tag encontrada dentro de um bloco */
function tagValue(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>\\s*([^<\\r\\n]+)`, 'i');
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

/** Descrição humanizada: MEMO > NAME > fallback */
function txDescription(block: string): string {
  return (
    tagValue(block, 'MEMO') ??
    tagValue(block, 'NAME') ??
    tagValue(block, 'PAYEE') ??
    'Transação importada'
  );
}

/** Faz o parse do texto completo de um arquivo OFX */
export function parseOfx(text: string): OfxTransaction[] {
  const out: OfxTransaction[] = [];
  const blockRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(text)) !== null) {
    const block = match[1];
    const rawDate = tagValue(block, 'DTPOSTED');
    const rawAmount = tagValue(block, 'TRNAMT');
    if (!rawDate || rawAmount === null) continue;
    const date = parseOfxDate(rawDate);
    const amount = parseOfxAmount(rawAmount);
    if (!date || amount === null || amount === 0) continue;
    const fitid = tagValue(block, 'FITID') ?? undefined;
    out.push({
      date,
      amount: Math.abs(amount),
      type: amount > 0 ? 'receita' : 'despesa',
      description: txDescription(block).replace(/\s+/g, ' ').slice(0, 160),
      fitid: fitid && fitid.length <= 64 ? fitid : undefined,
    });
  }
  return out;
}

/** Heurística: o texto parece um OFX? (qualquer arquivo .ofx também cai aqui) */
export function looksLikeOfx(fileName: string, text: string): boolean {
  if (/\.ofx$/i.test(fileName)) return true;
  return /<ofx|<stmttrn|ofxheader/i.test(text.slice(0, 2000));
}
