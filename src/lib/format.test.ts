/// <reference types="bun-types" />
import { describe, expect, test } from 'bun:test';

import { numberToBR, parseBRLNumber } from './format';

/* ============================ parseBRLNumber ============================ */

describe('parseBRLNumber', () => {
  test('vírgula decimal (padrão BR — o caso do bug de E2E)', () => {
    expect(parseBRLNumber('77,50')).toBe(77.5);
    expect(parseBRLNumber('0,01')).toBe(0.01);
    expect(parseBRLNumber('150,00')).toBe(150);
  });

  test('ponto decimal (teclado en-US)', () => {
    expect(parseBRLNumber('77.50')).toBe(77.5);
    expect(parseBRLNumber('100000')).toBe(100000);
  });

  test('milhar BR e en-US com os dois separadores (último manda)', () => {
    expect(parseBRLNumber('1.234,56')).toBe(1234.56);
    expect(parseBRLNumber('1.234.567,89')).toBe(1234567.89);
    expect(parseBRLNumber('1,234.56')).toBe(1234.56);
  });

  test('formatos com R$, espaços e sinais', () => {
    expect(parseBRLNumber('R$ 1.234,56')).toBe(1234.56);
    expect(parseBRLNumber('-77,50')).toBe(-77.5);
    expect(parseBRLNumber('(1.234,56)')).toBe(-1234.56); // negativo contábil
  });

  test('inválidos → NaN (caller decide o fallback)', () => {
    expect(Number.isNaN(parseBRLNumber(''))).toBe(true);
    expect(Number.isNaN(parseBRLNumber('abc'))).toBe(true);
    expect(Number.isNaN(parseBRLNumber(null))).toBe(true);
    expect(Number.isNaN(parseBRLNumber(undefined))).toBe(true);
  });

  test('números passam direto, strings com ruído são limpas', () => {
    expect(parseBRLNumber(42)).toBe(42);
    expect(parseBRLNumber('  77 , 50  ')).toBe(77.5);
    expect(parseBRLNumber('abc12,3def')).toBe(12.3);
  });
});

/* ============================= numberToBR ============================= */

describe('numberToBR', () => {
  test('número cru → texto editável pt-BR (regressão do E2E: perfil mostrava "100000.5")', () => {
    expect(numberToBR(100000.5)).toBe('100.000,50');
    expect(numberToBR(432.1)).toBe('432,10');
    expect(numberToBR(77.5)).toBe('77,50');
  });

  test('sempre com centavos — evita ambiguidade do ponto-isolado no round-trip', () => {
    expect(numberToBR(20000)).toBe('20.000,00');
    expect(numberToBR(150)).toBe('150,00');
    expect(numberToBR(0)).toBe('0,00');
  });

  test('negativos, nulos e inválidos', () => {
    expect(numberToBR(-77.5)).toBe('-77,50');
    expect(numberToBR(null)).toBe('');
    expect(numberToBR(undefined)).toBe('');
    expect(numberToBR(NaN)).toBe('');
    expect(numberToBR(Infinity)).toBe('');
  });

  test('round-trip com parseBRLNumber (load → save preserva o valor)', () => {
    for (const v of [100000.5, 432.1, 20000, 0, -77.5, 1234567.89]) {
      expect(parseBRLNumber(numberToBR(v))).toBe(v);
    }
  });
});
