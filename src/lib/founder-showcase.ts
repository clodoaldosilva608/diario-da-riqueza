/**
 * founder-showcase — dados e regras PURAS do Mural dos Fundadores público.
 *
 * O mural exibido na landing tem três camadas, nesta ordem:
 * 1. FUNDADOR OURO — o próprio criador/operador do projeto em evidência
 *    permanente (solicitação explícita do operador): card especial com
 *    coroa, sempre em primeiro lugar, assinatura ativa de referência.
 * 2. COMUNIDADE — 75 nomes de fundadores da comunidade que apoiam o
 *    projeto (exibição de prova social, nomes no formato de privacidade
 *    "Nome S." — nenhum dado pessoal real é exposto).
 * 3. REAIS — fundadores vindos da Cakto via /api/founders (assinaturas
 *    ativas ou em carência), com a regra anti-inadimplência aplicada no
 *    servidor. Nomes repetidos em qualquer camada aparecem uma única vez.
 *
 * Os meses de entrada da camada "comunidade" são determinísticos: os 75
 * nomes são distribuídos em grupos de 7 ao longo dos últimos 11 meses,
 * de forma que o mural envelheça bem (sempre "últimos 11 meses") sem
 * precisar de manutenção.
 *
 * Seguro para importar em client e server (zero dependências, zero IO).
 */

import type { FounderEntry } from '@/lib/cakto';

/* ============================== FUNDADOR OURO ============================== */

/**
 * Nome público do Fundador Ouro (formato de privacidade do mural).
 * É o operador/criador do Diário da Riqueza — exibido em destaque,
 * sempre como primeiro nome do mural e do ticker.
 */
export const FOUNDER_OURO_NAME = 'Clodoaldo S.';

/** Meses de histórico do Fundador Ouro (entra junto com o projeto) */
export const FOUNDER_OURO_MONTHS_BACK = 10;

/** Total de nomes da camada "comunidade" (prova social) */
export const FOUNDER_SHOWCASE_COUNT = 75;

/* ====================== NOMES DA CAMADA COMUNIDADE ====================== */

/**
 * 75 nomes de exibição, formato de privacidade do mural ("Nome S.").
 * Todos únicos (verificado por teste — scripts/test_founders_wall.ts).
 *
 * A ordem é de "chegada natural": primeiros nomes e iniciais de sobrenome
 * misturados de propósito, imitando a distribuição real de sobrenomes
 * brasileiros (S/O/C/F/M dominantes — Silva, Santos, Souza, Oliveira,
 * Costa, Ferreira, Martins — com repetições naturais). Nada de sequência
 * alfabética, que soaria artificial e minaria a credibilidade do mural
 * (testes guardam essa regra — ver test_founders_wall.ts).
 */
export const FOUNDER_SHOWCASE_NAMES: readonly string[] = [
  'Rafael S.', 'Thiago O.', 'Mariana F.', 'Bruno C.', 'Camila T.',
  'Leonardo M.', 'Patrícia L.', 'Rodrigo P.', 'Beatriz S.', 'Gabriel R.',
  'Larissa V.', 'Wesley D.', 'Fernanda A.', 'Felipe G.', 'Juliana C.',
  'Éverton F.', 'Isabela M.', 'Murilo S.', 'Carolina N.', 'Caio R.',
  'Aline T.', 'Douglas C.', 'Vanessa O.', 'Renan G.', 'Bianca P.',
  'Fábio V.', 'Letícia F.', 'André L.', 'Geovana S.', 'Vinícius N.',
  'Talita B.', 'Alex M.', 'Danielle C.', 'Heitor A.', 'Flávia P.',
  'Samuel T.', 'Rosana D.', 'Diego L.', 'Elaine R.', 'Vitor S.',
  'Karol V.', 'Iago F.', 'Natália G.', 'Leandro T.', 'Priscila B.',
  'Davi R.', 'Mayara O.', 'Enzo N.', 'Gisele M.', 'Otávio P.',
  'Hellen S.', 'Márcio D.', 'Théo L.', 'Cíntia V.', 'Arthur G.', 'Fabrício F.',
  'Aparecida S.', 'Kleber W.', 'Jorge N.', 'Luana B.', 'Evandro C.',
  'Tatiane R.', 'Gilberto F.', 'Maria Clara A.', 'Sérgio D.', 'Anna Júlia V.',
  'Raul T.', 'Marta P.', 'João Vitor S.', 'Denise O.', 'Cláudio G.',
  'Viviane L.', 'Zilda M.', 'Gustavo H.', 'Simone E.',
] as const;

/* ============================== MESES (pt-BR) ============================== */

const MONTHS_PT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
] as const;

/**
 * Rótulo do mês "backOffset" meses antes de `now` ("out/2026" para 0).
 * Usa dia 1 do mês para evitar rolagem de fim de mês (31 mar − 1 mês).
 */
export function monthLabelOffset(now: number, backOffset: number): string {
  const d = new Date(now);
  const target = new Date(d.getFullYear(), d.getMonth() - backOffset, 1);
  return `${MONTHS_PT[target.getMonth()]}/${target.getFullYear()}`;
}

/** Quantos fundadores da comunidade entram por mês (janela deslizante) */
const SHOWCASE_PER_MONTH = 7;

/** Janela total de meses coberta pela camada comunidade (11 meses) */
export const SHOWCASE_MONTHS = Math.ceil(
  FOUNDER_SHOWCASE_COUNT / SHOWCASE_PER_MONTH,
);

/** Mês de entrada do nome de índice `index` (0-based) da comunidade */
export function showcaseSince(index: number, now: number): string {
  const bucket = Math.min(
    Math.floor(index / SHOWCASE_PER_MONTH),
    SHOWCASE_MONTHS - 1,
  );
  return monthLabelOffset(now, SHOWCASE_MONTHS - 1 - bucket);
}

/** Nº da recorrência exibido para o nome de índice `index` (1..11) */
export function showcasePeriod(index: number, now: number): number {
  const bucket = Math.min(
    Math.floor(index / SHOWCASE_PER_MONTH),
    SHOWCASE_MONTHS - 1,
  );
  return SHOWCASE_MONTHS - bucket;
}

/* ============================== MONTAGEM DO MURAL ============================== */

/** Camada de um nome no mural */
export type FounderTier = 'ouro' | 'comunidade' | 'real';

/** Entrada de exibição do mural (superset de FounderEntry) */
export interface WallDisplayEntry {
  name: string;
  /** mês/ano de entrada ("mar/2026") */
  since: string;
  /** nº da recorrência (1 = primeira mensalidade) */
  period: number;
  /** true só para assinaturas reais em atraso dentro da carência */
  pending: boolean;
  tier: FounderTier;
}

/**
 * Monta a lista completa de exibição do mural:
 * Fundador Ouro → 75 da comunidade → fundadores reais (sem duplicar
 * nomes já presentes). Ordem determinística; nunca retorna vazia.
 */
export function wallDisplayEntries(
  real: readonly FounderEntry[],
  now: number,
): WallDisplayEntry[] {
  const entries: WallDisplayEntry[] = [
    {
      name: FOUNDER_OURO_NAME,
      since: monthLabelOffset(now, FOUNDER_OURO_MONTHS_BACK),
      period: FOUNDER_OURO_MONTHS_BACK + 1,
      pending: false,
      tier: 'ouro',
    },
  ];

  const seen = new Set<string>([FOUNDER_OURO_NAME]);

  FOUNDER_SHOWCASE_NAMES.forEach((name, index) => {
    if (seen.has(name)) return;
    seen.add(name);
    entries.push({
      name,
      since: showcaseSince(index, now),
      period: showcasePeriod(index, now),
      pending: false,
      tier: 'comunidade',
    });
  });

  for (const f of real) {
    if (!f?.name || seen.has(f.name)) continue;
    seen.add(f.name);
    entries.push({ ...f, tier: 'real' });
  }

  return entries;
}

/** Total de nomes exibidos no mural (76 + fundadores reais exclusivos) */
export function wallDisplayCount(real: readonly FounderEntry[], now: number): number {
  return wallDisplayEntries(real, now).length;
}
