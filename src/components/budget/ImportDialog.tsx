'use client';

/**
 * ImportDialog — importação de extratos OFX/CSV para o Orçamento.
 *
 * Fluxo (inspirado no Firefly III, adaptado ao método do Diário):
 * 1. Usuário escolhe o arquivo (aceita .ofx/.qfx e .csv/.txt)
 * 2. Parse local (tudo no dispositivo — nada é enviado a servidores)
 * 3. Preview editável linha a linha: data, descrição, categoria, tipo,
 *    valor + flag de duplicata pré-desmarcada
 * 4. Confirmação grava em lote via importBudgetEntries (ação auditável)
 */

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileUp, Loader2, TriangleAlert } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { parseStatement, suggestCategory, type ParsedTx } from '@/lib/import';
import { importBudgetEntries } from '@/db/actions';
import { formatBRL, numberToBR, parseBRLNumber } from '@/lib/format';
import type { BudgetEntry } from '@/types';
import { cn } from '@/lib/utils';

const RECEITA_CATEGORIAS = ['Salário', 'Freelance', 'Vendas', 'Investimentos', 'Aluguel recebido', 'Outros'];
const DESPESA_CATEGORIAS = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Investimentos', 'Dívidas', 'Outros'];

interface EditableRow extends ParsedTx {
  include: boolean;
}

export function ImportDialog({
  open,
  onOpenChange,
  budget,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  budget: BudgetEntry[];
  onImported?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [format, setFormat] = useState<'ofx' | 'csv' | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [importing, setImporting] = useState(false);

  const included = useMemo(() => rows.filter((r) => r.include), [rows]);
  const duplicatesMarked = useMemo(() => rows.filter((r) => r.duplicate).length, [rows]);
  const totalReceitas = useMemo(
    () => included.filter((r) => r.type === 'receita').reduce((s, r) => s + r.value, 0),
    [included],
  );
  const totalDespesas = useMemo(
    () => included.filter((r) => r.type === 'despesa').reduce((s, r) => s + r.value, 0),
    [included],
  );

  function reset() {
    setFileName('');
    setFormat(null);
    setRows([]);
    setSkipped(0);
    setParsing(false);
    setImporting(false);
  }

  async function handleFile(file: File) {
    setParsing(true);
    try {
      const text = await file.text();
      const parsed = parseStatement(file.name, text, budget);
      if (parsed.transactions.length === 0) {
        toast.error(
          'Nenhuma transação reconhecida. Confira se o arquivo é um extrato OFX/CSV válido.',
        );
        reset();
        return;
      }
      setFileName(file.name);
      setFormat(parsed.format);
      setSkipped(parsed.skipped);
      setRows(
        parsed.transactions.map((t) => ({
          ...t,
          include: !t.duplicate, // duplicatas vêm desmarcadas
        })),
      );
      toast.success(
        `${parsed.transactions.length} transação(ões) encontradas no ${parsed.format.toUpperCase()}.`,
      );
    } catch (e) {
      toast.error('Não foi possível ler o arquivo: ' + String(e));
      reset();
    } finally {
      setParsing(false);
    }
  }

  function patchRow(i: number, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleImport() {
    if (included.length === 0) return;
    setImporting(true);
    try {
      await importBudgetEntries(
        included.map((r) => ({
          type: r.type,
          category: r.category,
          description: r.description,
          value: r.value,
          date: r.date,
        })),
        { fileName, format: format ?? 'csv', skipped: skipped + (rows.length - included.length) },
      );
      toast.success(
        `${included.length} lançamento(s) importado(s) para o Orçamento!`,
        { description: `${format?.toUpperCase()} • ${fileName}` },
      );
      onImported?.();
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error('Falha ao importar: ' + String(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <FileUp className="h-5 w-5 text-gold" /> Importar extrato (OFX / CSV)
          </DialogTitle>
          <DialogDescription>
            Tudo é processado no seu dispositivo — o arquivo nunca sai dele. Linhas
            duplicadas são detectadas automaticamente e vêm desmarcadas.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-gold/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
          >
            {parsing ? (
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
            ) : (
              <FileUp className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">
              Arraste o arquivo aqui ou escolha abaixo.
              <br />
              <span className="text-xs">
                Aceita .ofx / .qfx (Internet Banking) e .csv / .txt (app do banco).
              </span>
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".ofx,.qfx,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
            <Button
              className="bg-gold text-black hover:bg-gold-light"
              disabled={parsing}
              onClick={() => fileRef.current?.click()}
            >
              {parsing ? 'Lendo arquivo…' : 'Escolher arquivo'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Resumo */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="border-gold/40 text-gold">
                {format?.toUpperCase()} • {fileName.slice(0, 40)}
              </Badge>
              <Badge variant="outline">{rows.length} linha(s)</Badge>
              {skipped > 0 && (
                <Badge variant="outline" className="opacity-70">
                  {skipped} ignorada(s)
                </Badge>
              )}
              {duplicatesMarked > 0 && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                  <TriangleAlert className="mr-1 h-3 w-3" /> {duplicatesMarked} duplicada(s)
                </Badge>
              )}
              <span className="ml-auto tabular-nums">
                <span className="text-emerald-wealth">+{formatBRL(totalReceitas)}</span>{' '}
                <span className="text-loss">−{formatBRL(totalDespesas)}</span>
              </span>
            </div>

            {/* Preview editável */}
            <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg border p-2 transition-colors',
                    r.include ? 'border-border bg-card' : 'border-border/40 opacity-60',
                    r.duplicate && r.include && 'border-amber-500/40',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={r.include}
                      onCheckedChange={(v) => patchRow(i, { include: v === true })}
                      aria-label={`Incluir transação ${r.description}`}
                    />
                    <Input
                      className="h-7 w-28 shrink-0 px-2 text-xs"
                      type="date"
                      value={r.date}
                      onChange={(e) => patchRow(i, { date: e.target.value })}
                      aria-label="Data da transação"
                    />
                    <Input
                      className="h-7 min-w-0 flex-1 px-2 text-xs"
                      value={r.description}
                      onChange={(e) => patchRow(i, { description: e.target.value })}
                      aria-label="Descrição da transação"
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-6">
                    <Select
                      value={r.type}
                      onValueChange={(v) =>
                        patchRow(i, {
                          type: v as 'receita' | 'despesa',
                          category: keepOrSuggest(r.category, v as 'receita' | 'despesa', suggestCategory(r.description, v as 'receita' | 'despesa')),
                        })
                      }
                    >
                      <SelectTrigger className="h-7 w-[110px] text-xs" aria-label="Tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={r.category} onValueChange={(v) => patchRow(i, { category: v })}>
                      <SelectTrigger className="h-7 w-[130px] text-xs" aria-label="Categoria">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(r.type === 'receita' ? RECEITA_CATEGORIAS : DESPESA_CATEGORIAS).map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <MoneyInput
                      className="h-7 w-28 px-2 text-right text-xs tabular-nums"
                      placeholder="0,00"
                      value={r.value ? numberToBR(r.value) : ''}
                      onValueChange={(raw) => patchRow(i, { value: parseBRLNumber(raw) || 0 })}
                      aria-label="Valor"
                    />
                    {r.duplicate && (
                      <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-500">
                        já existe?
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {included.length} selecionada(s) — revise antes de importar. Lançamentos
              entram como "única" na data do extrato.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {rows.length > 0 && (
            <>
              <Button variant="ghost" onClick={reset} disabled={importing}>
                Escolher outro arquivo
              </Button>
              <Button
                className="bg-gold text-black hover:bg-gold-light"
                disabled={included.length === 0 || importing}
                onClick={handleImport}
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Importando…
                  </>
                ) : (
                  `Importar ${included.length} lançamento(s)`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Ao trocar o tipo, mantém a categoria se ela existir no novo tipo; senão sugere */
function keepOrSuggest(current: string, _type: 'receita' | 'despesa', suggested: string): string {
  const all = [...RECEITA_CATEGORIAS, ...DESPESA_CATEGORIAS];
  return all.includes(current) ? current : suggested;
}
