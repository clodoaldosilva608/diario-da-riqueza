/// <reference types="bun-types" />
import { describe, expect, test } from 'bun:test';

import { parseOfx, parseOfxDate, parseOfxAmount } from './ofx';
import { parseCsv, parseMoney, parseBrDate, splitCsvLine, detectDelimiter } from './csv';
import { parseStatement, suggestCategory, txFingerprint, budgetFingerprints } from './index';

/* ============================== OFX ============================== */

describe('parseOfxDate', () => {
  test('datas completas e com timezone', () => {
    expect(parseOfxDate('20250912')).toBe('2025-09-12');
    expect(parseOfxDate('20250912103000')).toBe('2025-09-12');
    expect(parseOfxDate('20250912103000[-3:BRT]')).toBe('2025-09-12');
  });
  test('inválidas → null', () => {
    expect(parseOfxDate('abc')).toBeNull();
    expect(parseOfxDate('20251340')).toBeNull();
  });
});

describe('parseOfxAmount', () => {
  test('formatos positivos/negativos', () => {
    expect(parseOfxAmount('-1234.56')).toBe(-1234.56);
    expect(parseOfxAmount('2500,00')).toBe(2500);
    expect(parseOfxAmount('+99.9')).toBe(99.9);
    expect(parseOfxAmount('')).toBeNull();
  });
});

describe('parseOfx', () => {
  const OFX_SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20250905
<TRNAMT>-85.90
<FITID>TX001
<MEMO>MERCADO CENTRAL LTDA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20250905120000
<TRNAMT>3500.00
<FITID>TX002
<NAME>SALARIO EMPRESA X
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

  test('extrai transações do formato SGML (OFX 1.x)', () => {
    const txs = parseOfx(OFX_SGML);
    expect(txs.length).toBe(2);
    expect(txs[0]).toMatchObject({
      date: '2025-09-05',
      amount: 85.9,
      type: 'despesa',
      description: 'MERCADO CENTRAL LTDA',
      fitid: 'TX001',
    });
    expect(txs[1]).toMatchObject({
      date: '2025-09-05',
      amount: 3500,
      type: 'receita',
      description: 'SALARIO EMPRESA X',
    });
  });

  test('formato XML (OFX 2.x) também é suportado', () => {
    const OFX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <STMTTRN>
    <TRNTYPE>DEBIT</TRNTYPE>
    <DTPOSTED>20250815</DTPOSTED>
    <TRNAMT>-42.00</TRNAMT>
    <FITID>XML1</FITID>
    <MEMO>UBER TRIP</MEMO>
  </STMTTRN>
</OFX>`;
    const txs = parseOfx(OFX_XML);
    expect(txs.length).toBe(1);
    expect(txs[0].description).toBe('UBER TRIP');
    expect(txs[0].type).toBe('despesa');
  });

  test('blocos sem TRNAMT são ignorados sem quebrar o parse', () => {
    const BROKEN = `<OFX><STMTTRN><DTPOSTED>20250815</DTPOSTED><MEMO>sem valor</MEMO></STMTTRN><STMTTRN><DTPOSTED>20250816</DTPOSTED><TRNAMT>-10</TRNAMT><MEMO>ok</MEMO></STMTTRN></OFX>`;
    const txs = parseOfx(BROKEN);
    expect(txs.length).toBe(1);
    expect(txs[0].description).toBe('ok');
  });
});

/* ============================== CSV ============================== */

describe('parseMoney', () => {
  test('formatos brasileiros e internacionais', () => {
    expect(parseMoney('R$ 1.234,56')).toBe(1234.56);
    expect(parseMoney('-1.234,56')).toBe(-1234.56);
    expect(parseMoney('1234.56')).toBe(1234.56);
    expect(parseMoney('1,234.56')).toBe(1234.56);
    expect(parseMoney('(45,00)')).toBe(-45);
    expect(parseMoney('abc')).toBeNull();
  });
});

describe('parseBrDate', () => {
  test('formatos de data', () => {
    expect(parseBrDate('05/09/2025')).toBe('2025-09-05');
    expect(parseBrDate('05-09-25')).toBe('2025-09-05');
    expect(parseBrDate('2025-09-05')).toBe('2025-09-05');
    expect(parseBrDate('2025-09-05T10:00:00')).toBe('2025-09-05');
    expect(parseBrDate('32/13/2025')).toBeNull();
  });
});

describe('splitCsvLine + detectDelimiter', () => {
  test('respeita aspas com vírgula e delimitador detectado', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(splitCsvLine('"Texto, com vírgula";2;3', ';')).toEqual(['Texto, com vírgula', '2', '3']);
    expect(splitCsvLine('"dizia ""oi""";2', ';')).toEqual(['dizia "oi"', '2']);
  });
});

describe('parseCsv', () => {
  test('CSV com cabeçalho BR (ponto-e-vírgula)', () => {
    const csv = `Data;Histórico;Valor;Tipo
05/09/2025;MERCADO CENTRAL;-85,90;Débito
06/09/2025;PIX RECEBIDO JOAO;150,00;Crédito`;
    const r = parseCsv(csv);
    expect(r.transactions.length).toBe(2);
    expect(r.transactions[0]).toMatchObject({
      date: '2025-09-05',
      amount: 85.9,
      type: 'despesa',
      description: 'MERCADO CENTRAL',
    });
    expect(r.transactions[1].type).toBe('receita');
  });

  test('CSV sem cabeçalho com datas BR e valores negativos', () => {
    const csv = `05/09/2025;PADARIA DO ZE;-23,50
06/09/2025;VENDA CELULAR;800,00`;
    const r = parseCsv(csv);
    expect(r.transactions.length).toBe(2);
    expect(r.hadHeader).toBe(false);
    expect(r.transactions[0]).toMatchObject({ date: '2025-09-05', amount: 23.5, type: 'despesa' });
    expect(r.transactions[1].type).toBe('receita');
  });

  test('linhas inválidas são contadas como skipped', () => {
    const csv = `Data;Descrição;Valor
05/09/2025;OK;-10,00
sem data;nem valor;
06/09/2025;OK2;5,00`;
    const r = parseCsv(csv);
    expect(r.transactions.length).toBe(2);
    expect(r.skipped).toBe(1);
  });
});

/* ============================== ORQUESTRADOR ============================== */

describe('parseStatement', () => {
  test('detecta OFX pelo conteúdo', () => {
    const r = parseStatement(
      'extrato.txt',
      '<OFX><STMTTRN><DTPOSTED>20250801</DTPOSTED><TRNAMT>-30</TRNAMT><MEMO>POSTO SHELL</MEMO></STMTTRN></OFX>',
      [],
    );
    expect(r.format).toBe('ofx');
    expect(r.transactions[0].category).toBe('Transporte');
  });

  test('detecta CSV e sugere categorias por palavra-chave', () => {
    const r = parseStatement(
      'extrato.csv',
      'Data;Histórico;Valor\n10/09/2025;SUPERMERCADO ABC;-250,00\n11/09/2025;FARMACIA POPULAR;-45,00',
      [],
    );
    expect(r.format).toBe('csv');
    expect(r.transactions[0].category).toBe('Alimentação');
    expect(r.transactions[1].category).toBe('Saúde');
  });

  test('marca duplicatas contra o orçamento existente', () => {
    const budget = [
      {
        type: 'despesa' as const,
        category: 'Alimentação',
        description: 'SUPERMERCADO ABC',
        value: 250,
        date: '2025-09-10',
        frequency: 'unica' as const,
        createdAt: new Date().toISOString(),
      },
    ];
    const r = parseStatement(
      'x.csv',
      'Data;Histórico;Valor\n10/09/2025;SUPERMERCADO ABC;-250,00\n11/09/2025;OUTRA COISA;-30,00',
      budget,
    );
    expect(r.transactions[0].duplicate).toBe(true);
    expect(r.transactions[1].duplicate).toBe(false);
  });
});

describe('suggestCategory', () => {
  test('mapeia descrições comuns', () => {
    expect(suggestCategory('SALARIO MENSAL', 'receita')).toBe('Salário');
    expect(suggestCategory('UBER *TRIP 123', 'despesa')).toBe('Transporte');
    expect(suggestCategory('NETFLIX.COM', 'despesa')).toBe('Lazer');
    expect(suggestCategory('ALUGUEL ABRIL', 'despesa')).toBe('Moradia');
    expect(suggestCategory('COMPRA ALEATORIA XYZ', 'despesa')).toBe('Outros');
  });
});

describe('txFingerprint + budgetFingerprints', () => {
  test('fingerprints estáveis e insensíveis a formatação', () => {
    const a = txFingerprint('2025-09-10', 250, 'SUPERMERCADO ABC');
    const b = txFingerprint('2025-09-10', 250.0, 'supermercado abc');
    expect(a).toBe(b);
    const set = budgetFingerprints([
      {
        type: 'despesa',
        category: 'X',
        description: 'Supermercado ABC!',
        value: 250,
        date: '2025-09-10',
        frequency: 'unica',
        createdAt: '',
      },
    ]);
    expect(set.has(a)).toBe(true);
  });
});
