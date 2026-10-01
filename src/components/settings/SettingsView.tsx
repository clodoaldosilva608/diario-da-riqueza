'use client';

/**
 * Configurações — perfil, pasta no dispositivo, backups/restauração,
 * exportações (PDF/Word/Excel/MD/JSON), impressão, lembretes, tema e zona de perigo.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Settings, User, HardDrive, CloudDownload, FolderPlus, Save, BellRing,
  Palette, Printer, FileDown, RotateCcw, TriangleAlert, Trash2, FolderCheck,
  LifeBuoy, PlayCircle, Database, Presentation, HeartHandshake,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SectionHeader } from '@/components/shared/ui-kit';
import { ObsidianIntegrationCard } from '@/components/settings/ObsidianIntegrationCard';
import { PixSupportDialog } from '@/components/support/PixSupportDialog';
import { WhatsAppIcon } from '@/components/support/icons';
import { WHATSAPP_URL } from '@/lib/contact';
import { useProfile, useBackups } from '@/hooks/useData';
import { wipeAllData } from '@/db';
import {
  updateProfile, createBackup, restoreFromJSON, deleteBackup,
  restoreFromPickedFile,
} from '@/db/actions';
import { useBackups as listFolderBackups } from '@/filesystem/backup-list';
import {
  isFSAvailable, connectRootFolder, forgetRootFolder, reconnectStoredRoot,
  readBackupFile, SUBFOLDERS,
} from '@/filesystem';
import { exportData, type ExportScope } from '@/export';
import { useAppStore } from '@/stores/useAppStore';
import { requestNotificationPermission } from '@/hooks/useReminder';
import { countExampleData, clearExampleData } from '@/db/seed';
import type { ExportFormat } from '@/types';

type ScopeKind = 'completo' | 'ano' | 'mes';

export function SettingsView() {
  const profile = useProfile();
  const backups = useBackups();
  const store = useAppStore();

  // Perfil
  const [name, setName] = useState('');
  const [journalName, setJournalName] = useState('');
  const [yearGoal, setYearGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Pasta
  const [folderBusy, setFolderBusy] = useState(false);

  // Exportação
  const [scopeKind, setScopeKind] = useState<ScopeKind>('completo');
  const [exportMonth, setExportMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  // Apoio ao projeto
  const [pixOpen, setPixOpen] = useState(false);

  // Perigo
  const [wipeOpen, setWipeOpen] = useState(false);

  // Dados de exemplo
  const liveExamples = useLiveQuery(() => countExampleData(), [], 0);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [clearingExamples, setClearingExamples] = useState(false);

  // Backups da pasta real
  const folderBackups = listFolderBackups(store.folderConnected);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setJournalName(profile.journalName);
      setYearGoal(String(profile.yearGoal));
      setTargetDate(profile.targetDate);
    }
  }, [profile]);

  useEffect(() => {
    // Tenta reconectar handle persistido silenciosamente
    reconnectStoredRoot().then((root) => {
      if (root) store.setFolder(true, root.name);
    });
  }, []);

  async function handleSaveProfile() {
    await updateProfile({
      name: name.trim(),
      journalName: journalName.trim(),
      yearGoal: parseFloat(yearGoal) || 0,
      targetDate,
    });
    toast.success('Perfil atualizado.');
  }

  async function handleConnect() {
    setFolderBusy(true);
    const result = await connectRootFolder();
    setFolderBusy(false);
    if (result.ok) {
      store.setFolder(true, result.folderName);
      toast.success(`Pasta "${result.folderName}" conectada!`);
    } else if (result.error !== 'cancelled') {
      toast.info(result.error);
    }
  }

  async function handleBackupNow() {
    const res = await createBackup();
    if (res.savedTo === 'folder') toast.success('Backup criado na pasta /Backups.');
    else if (res.savedTo === 'download') toast.success('Backup gerado como download (pasta não conectada).');
    else toast.success('Backup salvo localmente no app.');
  }

  async function handleExport(format: ExportFormat) {
    setExporting(format);
    try {
      const scope: ExportScope =
        scopeKind === 'completo'
          ? { kind: 'completo' }
          : scopeKind === 'ano'
            ? { kind: 'ano', year: store.selectedYear }
            : { kind: 'mes', year: store.selectedYear, month: parseInt(exportMonth, 10) - 1 };
      const res = await exportData(format, scope, format === 'pdf' && scopeKind === 'completo');
      toast.success(
        `${format.toUpperCase()} salvo em ${res.destination === 'folder' ? '/Exportacoes na sua pasta' : 'downloads (pasta não conectada)'}.`,
        { description: res.filename },
      );
    } catch (e) {
      toast.error('Falha na exportação: ' + String(e));
    } finally {
      setExporting(null);
    }
  }

  const EXPORT_BUTTONS: Array<{ format: ExportFormat; label: string; desc: string }> = [
    { format: 'pdf', label: 'PDF', desc: 'Capa premium + registros' },
    { format: 'docx', label: 'Word', desc: 'Documento editável .docx' },
    { format: 'xlsx', label: 'Excel', desc: 'Planilha com 6 abas' },
    { format: 'md', label: 'Markdown', desc: 'Texto puro .md' },
    { format: 'json', label: 'JSON', desc: 'Backup portátil completo' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader icon={Settings} title="Configurações" subtitle="Tudo sob seu controle — local, sempre" />

      {/* ===================== PERFIL ===================== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-gold" /> Perfil e meta
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="st-name">Nome</Label>
            <Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-journal">Nome do diário</Label>
            <Input id="st-journal" value={journalName} onChange={(e) => setJournalName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-goal">Meta financeira (R$)</Label>
            <Input id="st-goal" type="number" min="0" value={yearGoal} onChange={(e) => setYearGoal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-date">Data-alvo</Label>
            <Input id="st-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={handleSaveProfile} className="bg-gold text-black hover:bg-gold-light">
              <Save className="mr-1.5 h-4 w-4" /> Salvar perfil
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===================== PASTA NO DISPOSITIVO ===================== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4 text-gold" /> Pasta no dispositivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {store.folderConnected ? (
              <>
                <Badge className="gap-1 bg-emerald-wealth/15 text-emerald-wealth">
                  <FolderCheck className="h-3.5 w-3.5" /> Conectada: {store.folderName}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Subpastas: {SUBFOLDERS.join(' / ')}
                </span>
              </>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Pasta não conectada — downloads automáticos
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleConnect} disabled={folderBusy || !isFSAvailable()} className="bg-gold text-black hover:bg-gold-light">
              <FolderPlus className="mr-1.5 h-4 w-4" />
              {store.folderConnected ? 'Trocar pasta' : 'Conectar / criar pasta'}
            </Button>
            {store.folderConnected && (
              <Button
                variant="outline"
                onClick={async () => {
                  await forgetRootFolder();
                  store.setFolder(false);
                  toast.info('Pasta desconectada. Backups continuam internos.');
                }}
              >
                Desconectar
              </Button>
            )}
          </div>
          {!isFSAvailable() && (
            <p className="text-xs text-muted-foreground">
              Este navegador não suporta File System Access API (use Chrome/Edge desktop ou Android
              para pastas reais). O app salvará dados no IndexedDB e fará downloads automáticos.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ===================== INTEGRAÇÃO OBSIDIAN ===================== */}
      <ObsidianIntegrationCard />

      {/* ===================== BACKUPS ===================== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudDownload className="h-4 w-4 text-gold" /> Backups e restauração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleBackupNow} variant="secondary">
              <CloudDownload className="mr-1.5 h-4 w-4" /> Fazer backup agora
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const ok = await restoreFromPickedFile();
                  if (ok) toast.success('Backup restaurado com sucesso!');
                  else toast.info('Nenhum arquivo escolhido.');
                } catch (e) {
                  toast.error('Falha ao restaurar: ' + String(e));
                }
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Restaurar de arquivo
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Label htmlFor="st-autobk" className="text-sm text-muted-foreground">
                Backup automático diário
              </Label>
              <Switch
                id="st-autobk"
                checked={store.autoBackup}
                onCheckedChange={store.setAutoBackup}
              />
            </div>
          </div>

          {/* Backups locais */}
          {backups.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Backups internos (últimos 10)
              </p>
              <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {backups.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="flex-1 truncate">{b.label}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={async () => {
                        try {
                          await restoreFromJSON(b.data);
                          toast.success('Backup restaurado!');
                        } catch (e) {
                          toast.error('Backup inválido: ' + String(e));
                        }
                      }}
                    >
                      Restaurar
                    </Button>
                    <button
                      aria-label={`Excluir backup ${b.label}`}
                      className="text-muted-foreground hover:text-loss"
                      onClick={() => b.id && deleteBackup(b.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backups na pasta real */}
          {store.folderConnected && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Arquivos em {store.folderName}/Backups
              </p>
              {folderBackups.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum arquivo .json na pasta ainda.</p>
              ) : (
                <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                  {folderBackups.map((f) => (
                    <div key={f.name} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="flex-1 truncate text-xs">{f.name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={async () => {
                          try {
                            const json = await readBackupFile(f.handle);
                            await restoreFromJSON(json);
                            toast.success('Backup restaurado!');
                          } catch (e) {
                            toast.error('Falha: ' + String(e));
                          }
                        }}
                      >
                        Restaurar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===================== EXPORTAÇÕES ===================== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileDown className="h-4 w-4 text-gold" /> Exportações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Escopo</Label>
              <Select value={scopeKind} onValueChange={(v) => setScopeKind(v as ScopeKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completo">Diário completo</SelectItem>
                  <SelectItem value="ano">Ano {store.selectedYear}</SelectItem>
                  <SelectItem value="mes">Mês específico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scopeKind === 'mes' && (
              <div className="space-y-1.5">
                <Label>Mês</Label>
                <Select value={exportMonth} onValueChange={setExportMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m) => (
                      <SelectItem key={m} value={m}>
                        {new Date(2000, parseInt(m, 10) - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {EXPORT_BUTTONS.map((b) => (
              <Button
                key={b.format}
                variant="outline"
                className="h-auto flex-col gap-1 border-gold/30 py-3"
                disabled={exporting !== null}
                onClick={() => handleExport(b.format)}
              >
                <span className="text-sm font-bold text-gold">
                  {exporting === b.format ? '…' : b.label}
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground">{b.desc}</span>
              </Button>
            ))}
          </div>
          <Separator />
          <div className="flex flex-wrap items-center gap-2">
            <Printer className="h-4 w-4 text-gold" />
            <span className="text-sm font-semibold">Impressão</span>
            <span className="text-xs text-muted-foreground">— como está no app ou diário físico formatado</span>
            <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  store.setPrintPhysical(false);
                  setTimeout(() => window.print(), 60);
                }}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimir como está
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gold/40 text-gold"
                onClick={() => {
                  store.setPrintPhysical(true);
                  toast.info('Layout físico ativo: use Ctrl+P / Cmd+P. Clique aqui para voltar depois.');
                  setTimeout(() => window.print(), 60);
                }}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" /> Diário físico (capa)
              </Button>
              {store.printPhysical && (
                <Button variant="ghost" size="sm" onClick={() => store.setPrintPhysical(false)}>
                  Desativar físico
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===================== LEMBRETES ===================== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4 text-gold" /> Lembrete diário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Switch
              id="st-remind"
              checked={store.reminderEnabled}
              onCheckedChange={async (v) => {
                if (v) {
                  const granted = await requestNotificationPermission();
                  if (!granted) {
                    toast.warning('Permissão de notificação negada — o lembrete não será exibido.');
                  }
                }
                store.setReminder(v);
              }}
            />
            <Input
              type="time"
              className="w-32"
              value={store.reminderTime}
              onChange={(e) => store.setReminder(true, e.target.value)}
              aria-label="Horário do lembrete"
            />
            <span className="text-xs text-muted-foreground">
              Notificação local enquanto o app estiver aberto (PWA instalado = sempre aberto).
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ===================== TEMA ===================== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-gold" /> Aparência
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="st-theme" className="text-sm text-muted-foreground">Modo escuro premium</Label>
            <Switch
              id="st-theme"
              checked={store.theme === 'dark'}
              onCheckedChange={(v) => store.setTheme(v ? 'dark' : 'light')}
            />
          </div>
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <div className="flex items-center gap-2">
            <Label htmlFor="st-focus" className="text-sm text-muted-foreground">Modo foco</Label>
            <Switch id="st-focus" checked={store.focusMode} onCheckedChange={() => store.toggleFocus()} />
          </div>
        </CardContent>
      </Card>

      {/* ===================== AJUDA & DADOS DE EXEMPLO ===================== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <LifeBuoy className="h-4 w-4 text-gold" /> Ajuda e dados de exemplo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="border-gold/40 text-gold"
              onClick={() => {
                store.setTourDone(false);
                store.setTourOpen(true);
                store.setView('dashboard');
              }}
            >
              <PlayCircle className="mr-1.5 h-4 w-4" /> Refazer tour guiado
            </Button>
            <Button variant="ghost" onClick={() => store.setView('ajuda')}>
              Central de Ajuda (FAQ)
            </Button>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {liveExamples} registro(s) de exemplo
                </p>
                <p className="text-xs text-muted-foreground">
                  Dias de diário, metas, sonhos, orçamento e estudos — editáveis como qualquer registro.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={liveExamples === 0 || clearingExamples}
              onClick={() => setExamplesOpen(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {clearingExamples ? 'Apagando…' : 'Limpar exemplos'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===================== PROJETO & APOIO ===================== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartHandshake className="h-4 w-4 text-gold" /> Projeto &amp; apoio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Conheça a apresentação do projeto, tire dúvidas com o criador ou
            apoie a evolução da ferramenta — tudo opcional.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="border-gold/40 text-gold"
              onClick={() => {
                store.setLandingOpen(true);
                window.scrollTo({ top: 0 });
              }}
            >
              <Presentation className="mr-1.5 h-4 w-4" /> Ver apresentação do projeto
            </Button>
            <Button
              variant="outline"
              className="border-[#25D366]/40 text-[#25D366]"
              asChild
            >
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Falar com o criador pelo WhatsApp — abre em nova aba ou no aplicativo"
                title="Abre uma conversa no WhatsApp com o criador do projeto"
              >
                <WhatsAppIcon className="mr-1.5 h-4 w-4" /> WhatsApp
              </a>
            </Button>
            <Button variant="ghost" onClick={() => setPixOpen(true)}>
              <HeartHandshake className="mr-1.5 h-4 w-4" /> Apoiar via Pix
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===================== ZONA DE PERIGO ===================== */}
      <Card className="border-destructive/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <TriangleAlert className="h-4 w-4" /> Zona de perigo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Apaga TODOS os dados locais (entradas, metas, orçamento, estudos, XP e backups internos).
            Faça um backup antes!
          </p>
          <Button variant="destructive" onClick={() => setWipeOpen(true)}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Apagar todos os dados
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={examplesOpen} onOpenChange={setExamplesOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todos os dados de exemplo?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão removidos {liveExamples} registro(s) marcados como exemplo (diário, metas, sonhos,
              orçamento, estudos e o XP semeado). Seus registros reais NÃO são tocados. A remoção será
              propagada ao vault Obsidian na próxima sincronização e os exemplos não voltam sozinhos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                setClearingExamples(true);
                try {
                  const n = await clearExampleData();
                  toast.success(`${n} registro(s) de exemplo apagado(s).`);
                } catch (e) {
                  toast.error('Falha ao apagar exemplos: ' + String(e));
                } finally {
                  setClearingExamples(false);
                }
              }}
            >
              Apagar exemplos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={wipeOpen} onOpenChange={setWipeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os dados serão apagados deste dispositivo permanentemente. Exporte um backup
              JSON antes de prosseguir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                await wipeAllData();
                store.setOnboarded(false);
                store.setPrintPhysical(false);
                toast.success('Dados apagados. Recomece quando quiser.');
              }}
            >
              Apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de apoio via Pix */}
      <PixSupportDialog open={pixOpen} onOpenChange={setPixOpen} />
    </div>
  );
}
