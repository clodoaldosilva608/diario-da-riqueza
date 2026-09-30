'use client';

/**
 * Configurações → Integração Obsidian (3 fases):
 * 1. Exportar vault .zip (universal)
 * 2. Conectar a pasta do vault — espelho bidirecional (desktop Chromium)
 * 3. Sync entre dispositivos via vault + backup criptografado .drq
 */

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Gem, Package, FolderOpen, FolderCheck, RefreshCw, Unplug,
  Lock, ShieldCheck, Info, RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/stores/useAppStore';
import { dumpAll } from '@/db';
import { restoreFromJSON } from '@/db/actions';
import { buildFileName, downloadFile } from '@/filesystem';
import {
  exportVaultZip, connectVault, getStoredVault, forgetVault, syncVaultNow,
  isVaultSupported, lastVaultSync,
} from '@/obsidian/sync';
import { encryptState, decryptState } from '@/obsidian/crypto';

export function ObsidianIntegrationCard() {
  const store = useAppStore();
  const [connectBusy, setConnectBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);

  // Backup criptografado
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPass, setExportPass] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importPass, setImportPass] = useState('');
  const importFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cryptoBusy, setCryptoBusy] = useState(false);

  // Reconexão silenciosa (sem diálogo) ao abrir as configurações
  useEffect(() => {
    getStoredVault().then((handle) => {
      if (handle) store.setVault(true, handle.name);
      else {
        const at = lastVaultSync();
        if (at && !store.vaultConnected) return; // mantém estado persistido coerente
      }
    });
  }, []);

  async function handleConnect() {
    setConnectBusy(true);
    const res = await connectVault();
    setConnectBusy(false);
    if (res.ok) {
      store.setVault(true, res.folderName);
      toast.success(`Vault "${res.folderName}" conectado!`);
      // Primeira sincronização imediata — o usuário vê os arquivos surgirem
      await handleSync(true);
    } else if (res.error !== 'cancelled') {
      toast.info(res.error);
    }
  }

  async function handleSync(silent = false) {
    setSyncBusy(true);
    try {
      const res = await syncVaultNow();
      store.setVaultSynced(res.at);
      const m = res.merge;
      const parts = [
        `${res.files} arquivos no vault`,
        m && (m.added || m.updated || m.removed)
          ? `• +${m.added} novos, ${m.updated} atualizados${m.removed ? `, ${m.removed} removidos` : ''}`
          : null,
        res.mdImported ? `• ${res.mdImported} edição(ões) importada(s) do Obsidian` : null,
        m?.conflicts ? `• ${m.conflicts} conflito(s) resolvido(s) pelo mais recente` : null,
      ].filter(Boolean);
      if (silent) toast.success(`Vault sincronizado: ${parts.join(' ')}`);
      else toast.success('Vault sincronizado!', { description: parts.join(' ') });
    } catch (e) {
      if (!silent) toast.error('Falha ao sincronizar: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSyncBusy(false);
    }
  }

  async function handleExportZip() {
    setZipBusy(true);
    try {
      const res = await exportVaultZip();
      toast.success(
        `Vault exportado (${res.files} arquivos) — ${res.destination === 'folder' ? 'pasta /Exportacoes' : 'downloads'}.`,
        { description: 'Extraia a pasta Diario_da_Riqueza dentro do seu vault do Obsidian.' },
      );
    } catch (e) {
      toast.error('Falha na exportação: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setZipBusy(false);
    }
  }

  async function handleEncryptExport() {
    if (exportPass.length < 8) {
      toast.warning('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    setCryptoBusy(true);
    try {
      const dump = await dumpAll();
      const bytes = await encryptState(JSON.stringify(dump), exportPass);
      downloadFile(buildFileName('DR_Backup_Criptografado', 'drq'), bytes, 'application/octet-stream');
      setExportOpen(false);
      setExportPass('');
      toast.success('Backup criptografado gerado (.drq). Guarde a senha com carinho — sem ela não há como recuperar.');
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setCryptoBusy(false);
    }
  }

  async function handleEncryptImport() {
    const file = importFileRef.current;
    if (!file) return;
    setCryptoBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const json = await decryptState(bytes, importPass);
      await restoreFromJSON(json);
      setImportOpen(false);
      setImportPass('');
      importFileRef.current = null;
      toast.success('Backup restaurado com sucesso!');
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setCryptoBusy(false);
    }
  }

  const supported = isVaultSupported();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gem className="h-4 w-4 text-gold" /> Integração Obsidian
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex flex-wrap items-center gap-2">
          {store.vaultConnected ? (
            <Badge className="gap-1 bg-emerald-wealth/15 text-emerald-wealth">
              <FolderCheck className="h-3.5 w-3.5" /> Vault: {store.vaultName}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Vault não conectado</Badge>
          )}
          {store.vaultLastSync && (
            <span className="text-xs text-muted-foreground">
              Última sincronização: {new Date(store.vaultLastSync).toLocaleString('pt-BR')}
            </span>
          )}
        </div>

        {/* Fase 1 — ZIP universal */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleExportZip} disabled={zipBusy} variant="outline" className="border-gold/40 text-gold">
              <Package className="mr-1.5 h-4 w-4" /> {zipBusy ? 'Gerando…' : 'Exportar vault (.zip)'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Funciona em qualquer navegador — extraia dentro do seu vault e abra o <b>00-Dashboard</b>.
            </span>
          </div>
        </div>

        <Separator />

        {/* Fase 2 — integração direta */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleConnect}
              disabled={connectBusy || !supported}
              className="bg-gold text-black hover:bg-gold-light"
            >
              <FolderOpen className="mr-1.5 h-4 w-4" />
              {store.vaultConnected ? 'Trocar vault' : 'Conectar vault'}
            </Button>
            {store.vaultConnected && (
              <>
                <Button onClick={() => handleSync(false)} disabled={syncBusy} variant="secondary">
                  <RefreshCw className={`mr-1.5 h-4 w-4 ${syncBusy ? 'animate-spin' : ''}`} />
                  {syncBusy ? 'Sincronizando…' : 'Sincronizar agora'}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await forgetVault();
                    store.setVault(false, null);
                    store.setVaultAutoSync(false);
                    toast.info('Vault desconectado. Os arquivos já criados continuam no Obsidian.');
                  }}
                >
                  <Unplug className="mr-1.5 h-4 w-4" /> Desconectar
                </Button>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Switch
              id="st-vault-auto"
              checked={store.vaultAutoSync}
              disabled={!store.vaultConnected}
              onCheckedChange={(v) => {
                store.setVaultAutoSync(v);
                if (v) toast.info('Sincronização automática ao abrir o app ativada.');
              }}
            />
            <Label htmlFor="st-vault-auto" className="text-sm text-muted-foreground">
              Sincronizar automaticamente ao abrir o app
            </Label>
          </div>
          {!supported && (
            <p className="text-xs text-muted-foreground">
              A integração direta com a pasta precisa de Chrome/Edge desktop. No celular, use o
              exportar .zip — e, se o seu vault sincroniza na nuvem, o sync entre dispositivos
              acontece pelos arquivos exportados.
            </p>
          )}
        </div>

        <Separator />

        {/* Fase 3 — backup criptografado portátil */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => { setExportPass(''); setExportOpen(true); }}>
              <Lock className="mr-1.5 h-4 w-4" /> Backup criptografado (.drq)
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Restaurar .drq
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".drq,application/octet-stream"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                importFileRef.current = f;
                setImportPass('');
                setImportOpen(true);
                e.target.value = '';
              }}
            />
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-wealth" />
            AES-256-GCM com senha sua (PBKDF2, 210k iterações) — o backup viaja criptografado
            por qualquer nuvem sem expor nada.
          </p>
        </div>

        <Separator />

        {/* Como funciona */}
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <div className="space-y-1">
            <p>
              <b className="text-foreground">Fluxo coerente:</b> tudo continua local no app.
              Ao conectar o vault, o app cria a pasta <code>Diario_da_Riqueza/</code> dentro dele e
              só escreve lá. O estado completo vai em <code>_dados/diario-da-riqueza.json</code> —
              se o seu vault sincroniza (iCloud, Syncthing, Obsidian Sync, Git…), os dados do app
              viajam junto entre celular e computador.
            </p>
            <p>
              No Obsidian, as seções <b>Reflexões</b> e <b>Em prática</b> das entradas do diário são
              editáveis — na próxima sincronização elas voltam para o app. Conflitos são resolvidos
              pela edição mais recente, e deleções usam tombstones (nada reaparece do nada).
            </p>
          </div>
        </div>
      </CardContent>

      {/* Dialog: senha do export */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup criptografado</DialogTitle>
            <DialogDescription>
              Escolha uma senha forte (mínimo 8 caracteres). Ela NÃO é recuperável — sem ela, o
              backup é impossível de abrir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="drq-pass">Senha</Label>
            <Input
              id="drq-pass"
              type="password"
              value={exportPass}
              onChange={(e) => setExportPass(e.target.value)}
              placeholder="mínimo 8 caracteres"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>Cancelar</Button>
            <Button
              className="bg-gold text-black hover:bg-gold-light"
              disabled={cryptoBusy}
              onClick={handleEncryptExport}
            >
              <Lock className="mr-1.5 h-4 w-4" /> {cryptoBusy ? 'Criptografando…' : 'Gerar backup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: senha do import */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar backup criptografado</DialogTitle>
            <DialogDescription>
              {importFileRef.current ? (
                <>Arquivo: <b>{importFileRef.current.name}</b>. Digite a senha usada na exportação.</>
              ) : 'Digite a senha do backup.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="drq-pass-in">Senha</Label>
            <Input
              id="drq-pass-in"
              type="password"
              value={importPass}
              onChange={(e) => setImportPass(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button
              className="bg-gold text-black hover:bg-gold-light"
              disabled={cryptoBusy || importPass.length === 0}
              onClick={handleEncryptImport}
            >
              {cryptoBusy ? 'Restaurando…' : 'Restaurar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
