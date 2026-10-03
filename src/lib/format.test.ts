/// <reference types="bun-types" />
import { describe, expect, test } from 'bun:test';

import { parseBRLNumber } from './format';

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
