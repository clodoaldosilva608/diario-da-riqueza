'use client';

/**
 * PiggyBank — cofrinho de poupança de um sonho (inspirado nos piggy banks
 * do Firefly III, adaptado ao método do Diário da Riqueza).
 *
 * - Meta de poupança definível por sonho (targetValue)
 * - Depósitos com histórico auditável (tabela dreamDeposits)
 * - Opcional: cada depósito também vira despesa "Investimentos" no Orçamento
 *   (dinheiro que saiu da conta corrente para o sonho)
 * - Conexão Orçamento ↔ Sonhos: a disciplina de guardar ganha lugar fixo
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { PiggyBank, Plus, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useDreamDeposits } from '@/hooks/useData';
import { addDreamDeposit, deleteDreamDeposit, setDreamTarget } from '@/db/actions';
import { formatBRL, numberToBR, parseBRLNumber } from '@/lib/format';
import { todayISO } from '@/db';
import type { Dream } from '@/types';
import { cn } from '@/lib/utils';
import { MoneyInput } from '@/components/ui/money-input';

export function PiggyBankSection({ dream }: { dream: Dream }) {
  const allDeposits = useDreamDeposits();
  const deposits = allDeposits.filter((d) => d.dreamId === dream.id);
  const saved = deposits.reduce((s, d) => s + d.amount, 0);

  const [open, setOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [alsoBudget, setAlsoBudget] = useState(false);
  const [saving, setSaving] = useState(false);
  const [targetInput, setTargetInput] = useState('');

  const hasTarget = typeof dream.targetValue === 'number' && dream.targetValue > 0;
  const pct = hasTarget ? Math.min(100, Math.round((saved / (dream.targetValue ?? 1)) * 100)) : 0;
  const remaining = hasTarget ? Math.max(0, (dream.targetValue ?? 0) - saved) : 0;

  async function handleDeposit() {
    const v = parseBRLNumber(amount);
    if (!dream.id || !(v > 0)) {
      toast.error('Informe um valor maior que zero.');
      return;
    }
    setSaving(true);
    try {
      const res = await addDreamDeposit({
        dreamId: dream.id,
        amount: v,
        date,
        note,
        alsoBudget,
      });
      toast.success(
        `${formatBRL(v)} guardados para "${dream.title}"!`,
        { description: alsoBudget ? 'Também registrado no Orçamento (Investimentos).' : undefined },
      );
      res.newAchievements.forEach((a) =>
        toast.success(`🏆 ${a.title}`, { description: a.description }),
      );
      setOpen(false);
      setAmount('');
      setNote('');
      setAlsoBudget(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTarget() {
    if (!dream.id) return;
    const v = parseBRLNumber(targetInput);
    await setDreamTarget(dream.id, v > 0 ? v : undefined);
    toast.success(v > 0 ? `Meta do cofrinho: ${formatBRL(v)}` : 'Meta do cofrinho removida.');
    setEditingTarget(false);
  }

  return (
    <div className="mt-2 border-t border-border/60 pt-2">
      {/* Linha de progresso + ações */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="flex items-center gap-1.5 text-xs font-semibold text-gold transition-colors hover:text-gold-light"
          onClick={() => {
            setTargetInput(dream.targetValue ? numberToBR(dream.targetValue) : '');
            setEditingTarget(true);
          }}
          aria-label={`Definir meta de poupança do sonho ${dream.title}`}
        >
          <PiggyBank className="h-3.5 w-3.5" /> Cofrinho
        </button>
        {hasTarget ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {formatBRL(saved)} de {formatBRL(dream.targetValue!)}
            {remaining > 0 && <> • faltam {formatBRL(remaining)}</>}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {saved > 0 ? `${formatBRL(saved)} guardados` : 'defina uma meta e comece a guardar'}
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto h-7 border-gold/40 px-2 text-xs text-gold hover:bg-gold/10"
          onClick={() => setOpen(true)}
          aria-label={`Guardar dinheiro no cofrinho do sonho ${dream.title}`}
        >
          <Plus className="mr-0.5 h-3 w-3" /> Guardar
        </Button>
      </div>

      {hasTarget && (
        <>
          <Progress value={pct} className="mt-1.5 h-1.5" />
          <p className="mt-0.5 text-right text-[10px] font-semibold text-gold tabular-nums">
            {pct}% do sonho financiado
          </p>
        </>
      )}

      {/* Últimos depósitos */}
      {deposits.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {deposits.slice(0, 3).map((d) => (
            <div key={d.id} className="group flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="tabular-nums">{d.date.split('-').reverse().join('/')}</span>
              <span className="font-semibold text-emerald-wealth tabular-nums">+{formatBRL(d.amount)}</span>
              {d.note && <span className="truncate">{d.note}</span>}
              {d.registeredInBudget && (
                <Badge variant="outline" className="px-1 py-0 text-[9px] opacity-70">
                  no orçamento
                </Badge>
              )}
              <button
                className="ml-auto opacity-0 transition-opacity hover:text-loss group-hover:opacity-100"
                onClick={() => {
                  if (d.id) deleteDreamDeposit(d.id);
                  toast.info('Depósito removido do cofrinho.');
                }}
                aria-label={`Remover depósito de ${formatBRL(d.amount)}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {deposits.length > 3 && (
            <p className="text-[10px] text-muted-foreground">
              + {deposits.length - 3} depósito(s) mais antigo(s)
            </p>
          )}
        </div>
      )}

      {/* Dialog de depósito */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <PiggyBank className="h-5 w-5 text-gold" /> Guardar para: {dream.title}
            </DialogTitle>
            <DialogDescription>
              {hasTarget
                ? `Faltam ${formatBRL(remaining)} para completar o cofrinho.`
                : 'Dica: defina uma meta no cofrinho para acompanhar o progresso.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="deposit-value">Valor guardado (R$)</Label>
              <MoneyInput
                id="deposit-value"
                placeholder="Ex.: 150,00"
                value={amount}
                onValueChange={setAmount}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deposit-date">Data</Label>
              <Input
                id="deposit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deposit-note">Observação (opcional)</Label>
              <Input
                id="deposit-note"
                placeholder="Ex.: 13º, bônus, sobra do mês…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="min-w-0 pr-3">
                <p className="text-xs font-semibold">Registrar também no Orçamento</p>
                <p className="text-[11px] text-muted-foreground">
                  Cria despesa "Investimentos" na mesma data — use se o dinheiro saiu da conta corrente.
                </p>
              </div>
              <Switch
                checked={alsoBudget}
                onCheckedChange={setAlsoBudget}
                aria-label="Registrar depósito também no orçamento"
              />
            </div>
            <Button
              className="w-full bg-gold text-black hover:bg-gold-light"
              onClick={handleDeposit}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <PiggyBank className="mr-1.5 h-4 w-4" />
              )}
              Guardar {amount && parseBRLNumber(amount) > 0 ? formatBRL(parseBRLNumber(amount)) : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog da meta do cofrinho */}
      <Dialog open={editingTarget} onOpenChange={setEditingTarget}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display">Meta do cofrinho</DialogTitle>
            <DialogDescription>
              Quanto você quer ter guardado para realizar "{dream.title}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <MoneyInput
              placeholder="Ex.: 5000"
              value={targetInput}
              onValueChange={setTargetInput}
              aria-label="Valor-alvo do cofrinho"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className={cn('flex-1')}
                onClick={() => {
                  setTargetInput('');
                  handleSaveTarget();
                }}
              >
                Remover meta
              </Button>
              <Button
                className="flex-1 bg-gold text-black hover:bg-gold-light"
                onClick={handleSaveTarget}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
