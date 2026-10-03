'use client';

/**
 * MoneyInput — campo de valor monetário pt-BR.
 *
 * Por que NÃO usar <input type="number">?
 * O algoritmo de sanitização do navegador zera o valor quando o texto não
 * é um número válido no formato en-US: brasileiro digitando "77,50" chega
 * ao React como "" (bug real encontrado em E2E — o campo simplesmente
 * esvazia). Aqui usamos type="text" + inputMode="decimal" (teclado
 * numérico no celular), aceitamos vírgula/ponto/R$ e o parsing correto
 * fica com parseBRLNumber() no submit.
 */

import * as React from 'react';

import { Input } from '@/components/ui/input';

/** Remove tudo que não seja dígito, separador decimal ou sinal. */
const DISALLOWED = /[^\d.,\-]/g;

export interface MoneyInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'type' | 'onChange'> {
  value: string;
  /** Texto cru (já sanitizado) — parse com parseBRLNumber() no submit. */
  onValueChange: (raw: string) => void;
}

export function MoneyInput({ value, onValueChange, ...props }: MoneyInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => onValueChange(e.target.value.replace(DISALLOWED, ''))}
    />
  );
}
