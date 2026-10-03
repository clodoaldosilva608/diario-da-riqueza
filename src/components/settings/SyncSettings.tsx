'use client';

/**
 * SyncSettings — sincronização E2E entre dispositivos.
 *
 * Modelo (inspirado no Actual Budget, com senha do usuário):
 * - Cofre identificado por código DR-XXXX-XXXX-XXXX;
 * - Servidor guarda APENAS o blob cifrado (AES-GCM 256, PBKDF2 250k);
 * - A senha nunca sai do dispositivo — quem tem o código SEM a senha
 *   não lê nada;
 * - Fluxo: criar cofre aqui → anotar código + senha → no outro dispositivo
 *   digitar os dois → "Mesclar" (une os dois lados) ou "Substituir"
 *   (sobrescreve este dispositivo com a nuvem).
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  CloudUpload, CloudDownload, Copy, KeyRound, Loader2, Link2Off, RefreshCcw,
  TriangleAlert,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { dumpAll, restoreDump } from '@/db';
import {
  decryptFromVault, encryptForVault, generateVaultId, isValidVaultId,
} from '@/lib/sync/crypto';
import { mergeDumps } from '@/lib/sync/merge';
import { applyMergedDump } from '@/lib/sync/apply';

const VAULT_STORAGE = 'dr_sync_vault';

interface VaultRef {
  vaultId: string;
  /** Senha lembrada NESTE dispositivo (o servidor nunca a vê) */
  passphrase: string;
  lastSyncedAt?: string;
}

function loadVaultRef(): VaultRef | null {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE);
    return raw ? (JSON.parse(raw) as VaultRef) : null;
  } catch {
    return null;
  }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

type Mode = null | 'create' | 'join';
type Busy = '' | 'push' | 'merge' | 'replace';

export function SyncSettings() {
  const [vault, setVault] = useState<VaultRef | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState<Busy>('');
  const [newCode, setNewCode] = useState('');
  const [newPass, setNewPass] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  useEffect(() => {
    const v = loadVaultRef();
    setVault(v);
    if (v) void checkCloud(v.vaultId);
  }, []);

  async function checkCloud(vaultId: string) {
    try {
      const res = await fetch(`/api/sync?vaultId=${encodeURIComponent(vaultId)}`, { cache: 'no-store' });
      const json = (await res.json()) as { found: boolean; updatedAt?: string };
      setCloudUpdatedAt(json.found ? json.updatedAt ?? null : null);
    } catch {
      setCloudUpdatedAt(null);
    }
  }

  function saveRef(ref: VaultRef) {
    localStorage.setItem(VAULT_STORAGE, JSON.stringify(ref));
    setVault(ref);
  }

  async function pushToVault(vaultId: string, passphrase: string): Promise<void> {
    const dump = await dumpAll();
    const envelope = await encryptForVault(dump, passphrase, vaultId);
    const res = await fetch('/api/sync', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaultId, ...envelope }),
    });
    const json = (await res.json()) as {
      ok: boolean; error?: string; updatedAt?: string; persistence?: string;
    };
    if (!json.ok) throw new Error(json.error ?? 'falha no envio');
    saveRef({ vaultId, passphrase, lastSyncedAt: json.updatedAt ?? new Date().toISOString() });
    void checkCloud(vaultId);
    if (json.persistence === 'memoria') {
      toast.warning(
        'Servidor sem persistência permanente (KV não configurado) — configure KV_REST_API_URL/TOKEN na Vercel para a nuvem sobreviver a reinícios.',
        { duration: 9000 },
      );
    } else {
      toast.success('Dados criptografados enviados para a nuvem. 🔐');
    }
  }

  async function handleCreate() {
    if (newPass.length < 8) {
      toast.error('A senha do cofre precisa ter pelo menos 8 caracteres.');
      return;
    }
    setBusy('push');
    try {
      await pushToVault(newCode, newPass);
      setMode(null);
      setNewPass('');
      toast.success('Cofre criado! Anote o código e a senha para usar no outro dispositivo.');
    } catch (e) {
      toast.error('Falha ao criar o cofre: ' + String(e));
    } finally {
      setBusy('');
    }
  }

  async function handlePush() {
    if (!vault) return;
    setBusy('push');
    try {
      await pushToVault(vault.vaultId, vault.passphrase);
    } catch (e) {
      toast.error('Falha no envio: ' + String(e));
    } finally {
      setBusy('');
    }
  }

  async function handleJoin(modeJoin: 'merge' | 'replace') {
    const code = joinCode.trim().toUpperCase();
    if (!isValidVaultId(code)) {
      toast.error('Código inválido — formato esperado: DR-XXXX-XXXX-XXXX.');
      return;
    }
    if (joinPass.length < 8) {
      toast.error('Digite a senha do cofre (mínimo 8 caracteres).');
      return;
    }
    setBusy(modeJoin === 'merge' ? 'merge' : 'replace');
    try {
      const res = await fetch(`/api/sync?vaultId=${encodeURIComponent(code)}`, { cache: 'no-store' });
      const json = (await res.json()) as { found: boolean; iv?: string; blob?: string; updatedAt?: string };
      if (!json.found || !json.iv || !json.blob) {
        toast.error('Cofre não encontrado — confira o código.');
        return;
      }
      let dump;
      try {
        dump = await decryptFromVault({ iv: json.iv, blob: json.blob }, joinPass, code);
      } catch {
        toast.error('Senha incorreta — não foi possível decifrar o cofre.');
        return;
      }
      if (modeJoin === 'replace') {
        await restoreDump(dump);
        toast.success('Dados substituídos pelo conteúdo da nuvem.');
      } else {
        const local = await dumpAll();
        const { merged, stats } = mergeDumps(local, dump);
        const applied = await applyMergedDump(merged);
        toast.success(
          `Mesclado: +${stats.added} novos, ${stats.updated} atualizados, ${stats.keptLocal} mantidos.` +
            (applied.droppedDeposits ? ` ${applied.droppedDeposits} depósito(s) órfão(s) ignorado(s).` : ''),
          { duration: 7000 },
        );
      }
      saveRef({ vaultId: code, passphrase: joinPass, lastSyncedAt: json.updatedAt ?? new Date().toISOString() });
      setCloudUpdatedAt(json.updatedAt ?? null);
      setMode(null);
      setJoinPass('');
    } catch (e) {
      toast.error('Falha na sincronização: ' + String(e));
    } finally {
      setBusy('');
      setConfirmReplace(false);
    }
  }

  function disconnect() {
    localStorage.removeItem(VAULT_STORAGE);
    setVault(null);
    setCloudUpdatedAt(null);
    setMode(null);
    toast.info('Sincronização desconectada — seus dados locais continuam intactos.');
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCcw className="h-4 w-4 text-gold" /> Sincronizar entre dispositivos (E2E)
          {vault && (
            <Badge variant="outline" className="ml-auto border-emerald-wealth/40 text-[10px] text-emerald-wealth">
              CONECTADO
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Leve seus dados do celular para o PC e vice-versa. O servidor só guarda o
          conteúdo <strong className="text-foreground">criptografado</strong> com a sua senha —
          nem nós conseguimos ler. Guarde o código do cofre e a senha em local seguro.
        </p>

        {/* ===== Estado inicial: escolher ação ===== */}
        {!vault && mode === null && (
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-gold text-black hover:bg-gold-light"
              onClick={() => {
                setNewCode(generateVaultId());
                setMode('create');
              }}
            >
              <CloudUpload className="mr-1.5 h-4 w-4" /> Criar cofre de sincronização
            </Button>
            <Button variant="outline" onClick={() => setMode('join')}>
              <CloudDownload className="mr-1.5 h-4 w-4" /> Já tenho um código
            </Button>
          </div>
        )}

        {/* ===== Criar cofre ===== */}
        {!vault && mode === 'create' && (
          <div className="space-y-4 rounded-xl border border-gold/30 p-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Código do cofre</Label>
              <p className="text-xs text-muted-foreground">
                Envie este código + senha para o outro dispositivo por mensagem
                privada — nunca em post público.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={newCode}
                  aria-label="Código do cofre"
                  className="font-mono text-base font-semibold tracking-widest"
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Gerar outro código"
                  onClick={() => setNewCode(generateVaultId())}
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copiar código"
                  onClick={() => navigator.clipboard.writeText(newCode).then(() => toast.success('Código copiado.'))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sync-pass">Senha do cofre (mín. 8 caracteres)</Label>
              <Input
                id="sync-pass"
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Crie uma senha forte — sem ela NINGUÉM lê os dados"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setMode(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-gold text-black hover:bg-gold-light"
                onClick={handleCreate}
                disabled={busy === 'push'}
              >
                {busy === 'push' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-1.5 h-4 w-4" />}
                Criar e enviar agora
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              <TriangleAlert className="mr-1 inline h-3 w-3" />
              A senha não pode ser recuperada — ela não sai do seu dispositivo.
            </p>
          </div>
        )}

        {/* ===== Entrar com cofre existente ===== */}
        {!vault && mode === 'join' && (
          <div className="space-y-3 rounded-xl border border-border p-4">
            <Label className="text-sm font-semibold">Já tenho um cofre</Label>
            <Input
              placeholder="DR-XXXX-XXXX-XXXX"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              aria-label="Código do cofre"
              className="font-mono uppercase tracking-wider"
            />
            <Input
              type="password"
              placeholder="Senha do cofre"
              value={joinPass}
              onChange={(e) => setJoinPass(e.target.value)}
              aria-label="Senha do cofre"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handleJoin('merge')} disabled={busy === 'merge'}>
                {busy === 'merge' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CloudDownload className="mr-1.5 h-4 w-4" />}
                Mesclar com este dispositivo
              </Button>
              <Button variant="ghost" className="text-loss" onClick={() => setConfirmReplace(true)} disabled={busy === 'replace'}>
                Substituir este dispositivo
              </Button>
              <Button variant="ghost" onClick={() => setMode(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* ===== Conectado ===== */}
        {vault && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3 text-sm">
              <KeyRound className="h-4 w-4 text-gold" />
              <span className="font-mono font-semibold tracking-wider">{vault.vaultId}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Copiar código do cofre"
                onClick={() => navigator.clipboard.writeText(vault.vaultId).then(() => toast.success('Código copiado.'))}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {vault.lastSyncedAt ? `Último envio: ${fmtDateTime(vault.lastSyncedAt)}` : 'Ainda não sincronizado'}
                {cloudUpdatedAt && ` • nuvem: ${fmtDateTime(cloudUpdatedAt)}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-gold text-black hover:bg-gold-light" onClick={handlePush} disabled={busy === 'push'}>
                {busy === 'push' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-1.5 h-4 w-4" />}
                Enviar agora
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setJoinCode(vault.vaultId);
                  setJoinPass(vault.passphrase);
                  void handleJoin('merge');
                }}
                disabled={busy === 'merge'}
                aria-label="Baixar da nuvem e mesclar com os dados locais"
              >
                {busy === 'merge' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CloudDownload className="mr-1.5 h-4 w-4" />}
                Baixar e mesclar
              </Button>
              <Button variant="outline" className="text-loss hover:bg-loss/10" onClick={() => setConfirmReplace(true)}>
                Substituir tudo pela nuvem
              </Button>
              <Button variant="ghost" onClick={disconnect}>
                <Link2Off className="mr-1.5 h-4 w-4" /> Desconectar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              "Mesclar" une os dois lados sem perder nada (o mais recente vence em
              conflitos). "Substituir" descarta TUDO daqui e copia a nuvem.
            </p>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir TODOS os dados locais?</AlertDialogTitle>
            <AlertDialogDescription>
              Este dispositivo receberá exatamente o conteúdo da nuvem — registros
              feitos aqui e nunca enviados serão PERDIDOS. Para juntar os dois lados
              sem perdas, use "Mesclar".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => handleJoin('replace')}
            >
              Substituir tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
