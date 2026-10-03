/**
 * Orquestrador de importação de extratos (OFX/CSV) para o Orçamento.
 *
 * Pipeline: arquivo → parse → sugestão de categoria por palavras-chave →
 * dedupe por fingerprint contra o orçamento existente → preview editável
 * (o usuário confirma linha a linha) → importBudgetEntries (db/actions).
 */

import { parseOfx, looksLikeOfx, type OfxTransaction } from './ofx';
import { parseCsv, type CsvTransaction } from './csv';
import type { BudgetEntry } from '@/types';

export type { OfxTransaction, CsvTransaction };

export interface ParsedTx {
  /** 'yyyy-MM-dd' */
  date: string;
  /** Valor absoluto em R$ */
  value: number;
  type: 'receita' | 'despesa';
  description: string;
  /** true = provável duplicata do orçamento atual (pré-desmarcada no preview) */
  duplicate: boolean;
  /** Categoria sugerida por palavras-chave (editável no preview) */
  category: string;
}

export interface StatementParse {
  format: 'ofx' | 'csv';
  transactions: ParsedTx[];
  skipped: number;
  delimiter?: string;
  hadHeader?: boolean;
}

/* ============================== CATEGORIAS SUGERIDAS ============================== */

/** Palavras-chave → categoria do Orçamento (primeira correspondência vence) */
const KEYWORD_CATEGORIES: Array<[RegExp, string]> = [
  [/sal[aá]rio|pagamento de sal[aá]rio|folha|provento|rendimento salarial/i, 'Salário'],
  [/freelance|aut[oô]nomo|job|projeto cliente/i, 'Freelance'],
  [/pix recebido|venda|marketplace|shopee|mercado livre|olx/i, 'Vendas'],
  [/mercado|supermercado|hortifruti|padaria|a[çc]ougue|ifood|rappi|restaurante|lanchonete|delivery|alimenta/i, 'Alimentação'],
  [/uber|99\s|99pop|combust[ií]vel|posto|shell|petrobras|gasolina|[óo]nibus|m[eé]tro|uber|estacionamento|ped[aá]gio/i, 'Transporte'],
  [/farm[aá]cia|drogaria|hospital|cl[ií]nica|m[eé]dico|dentista|plano de sa[uú]de|laborat[oó]rio/i, 'Saúde'],
  [/escola|faculdade|curso|universidade|livro|livraria|udemy|alura|mensalidade/i, 'Educação'],
  [/netflix|spotify|cinema|steam|playstation|show|teatro|bar |balada|streaming/i, 'Lazer'],
  [/aluguel|condom[ií]nio|luz|energia el[eé]trica|[aá]gua|sabesp|internet|vivo|claro|tim\b|oi\b|iptu|iptú|g[aá]s/i, 'Moradia'],
  [/cart[oã]o de cr[eé]dito|fatura|empr[eé]stimo|financiamento|juros|pagamento de fatura/i, 'Dívidas'],
  [/tesouro|cdb|a[çc][õo]es|fundo|investimento|aporte|b3|xpi|nuinvest|resgate/i, 'Investimentos'],
];

/** Sugere categoria pela descrição (fallback 'Outros' / 'Salário' p/ receitas) */
export function suggestCategory(description: string, type: 'receita' | 'despesa'): string {
  for (const [re, cat] of KEYWORD_CATEGORIES) {
    if (re.test(description)) return cat;
  }
  if (type === 'receita') return 'Outros';
  return 'Outros';
}

/* ============================== DEDUPE ============================== */

/**
 * Fingerprint estável de uma transação: data + centavos + descrição
 * normalizada (40 primeiros caracteres alfanuméricos, lowercase).
 * Mesma fórmula para o extrato e para o orçamento → dedupe confiável.
 */
export function txFingerprint(date: string, amount: number, description: string): string {
  const norm = description
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 40);
  return `${date}|${Math.round(Math.abs(amount) * 100)}|${norm}`;
}

/** Conjunto de fingerprints já existentes no orçamento */
export function budgetFingerprints(budget: BudgetEntry[]): Set<string> {
  const set = new Set<string>();
  for (const b of budget) {
    set.add(txFingerprint(b.date, b.value, b.description));
  }
  return set;
}

/* ============================== ENTRADA PRINCIPAL ============================== */

/** Converte transações cruas do parser em linhas de preview com dedupe */
function toParsedTxs(
  raw: Array<{ date: string; amount: number; type: 'receita' | 'despesa'; description: string }>,
  existingFingerprints: Set<string>,
): ParsedTx[] {
  const seen = new Set<string>();
  return raw.map((t) => {
    const fp = txFingerprint(t.date, t.amount, t.description);
    const duplicate = existingFingerprints.has(fp) || seen.has(fp);
    seen.add(fp);
    return {
      date: t.date,
      value: t.amount,
      type: t.type,
      description: t.description,
      duplicate,
      category: suggestCategory(t.description, t.type),
    };
  });
}

/**
 * Detecta o formato (OFX primeiro, depois CSV) e faz o parse completo,
 * marcando duplicatas contra o orçamento atual.
 */
export function parseStatement(fileName: string, text: string, budget: BudgetEntry[]): StatementParse {
  if (looksLikeOfx(fileName, text)) {
    const txs = parseOfx(text);
    return { format: 'ofx', transactions: toParsedTxs(txs, budgetFingerprints(budget)), skipped: 0 };
  }
  const csv = parseCsv(text);
  return {
    format: 'csv',
    transactions: toParsedTxs(csv.transactions, budgetFingerprints(budget)),
    skipped: csv.skipped,
    delimiter: csv.delimiter === '\t' ? 'tabulação' : csv.delimiter,
    hadHeader: csv.hadHeader,
  };
}
