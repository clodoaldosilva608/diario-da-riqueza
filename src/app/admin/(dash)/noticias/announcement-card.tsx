'use client';

/**
 * AnnouncementCard — card de um aviso na lista do /admin/noticias.
 *
 * Ações: Publicar/Desativar (toggle via server action em <form> nativo),
 * Editar (Dialog com AnnouncementForm — fecha só depois de salvar) e
 * Excluir (AlertDialog de confirmação; a exclusão roda dentro de
 * useTransition para o dialog fechar somente após a action concluir —
 * evita o abort de action quando o form é desmontado cedo demais).
 */

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Bell, Eye, EyeOff, FileUp, ExternalLink, Loader2, Pencil, Trash2,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { formatBytes, mediaUrl, shortDate, type Announcement } from '@/lib/announcements';
import { deleteAnnouncementAction, toggleAnnouncementAction } from '../../actions';
import { AnnouncementForm } from './announcement-form';

export function AnnouncementCard({ ann }: { ann: Announcement }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [pushSending, setPushSending] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  /** Envia ESTE aviso como push para todos os inscritos (E2E do lembrete) */
  async function sendPush() {
    setPushSending(true);
    try {
      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: ann.title, body: ann.message, url: ann.linkUrl?.startsWith('/') ? ann.linkUrl : '/' }),
      });
      const json = (await res.json()) as {
        ok: boolean; sent?: number; total?: number; expired?: number;
        persistence?: string; error?: string;
      };
      if (!json.ok) {
        toast.error(json.error ?? 'Falha ao enviar push.');
        return;
      }
      toast.success(
        `Push enviado para ${json.sent} de ${json.total} dispositivo(s).`,
        {
          description:
            json.persistence === 'memoria'
              ? 'Atenção: inscrições em memória (configure KV ou Blob na Vercel para persistência real).'
              : json.persistence === 'arquivo'
                ? 'Inscrições persistidas em arquivo (self-host).'
                : json.persistence === 'blob'
                  ? 'Inscrições persistidas no Vercel Blob.'
                  : 'Inscrições persistidas no KV.',
        },
      );
    } catch (e) {
      toast.error('Erro no envio: ' + String(e));
    } finally {
      setPushSending(false);
    }
  }

  function confirmDelete() {
    startDelete(async () => {
      const fd = new FormData();
      fd.set('id', ann.id);
      await deleteAnnouncementAction(fd);
      setDeleteOpen(false);
    });
  }

  return (
    <article
      className={`rounded-2xl border bg-card p-5 transition-colors ${
        ann.active ? 'border-gold/40' : 'border-border opacity-90'
      }`}
      aria-label={`Aviso: ${ann.title}`}
    >
      {/* ============ TOPO: status + datas ============ */}
      <div className="flex flex-wrap items-center gap-2">
        {ann.active ? (
          <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10">
            <Eye className="h-3 w-3" aria-hidden="true" /> Publicado
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            <EyeOff className="h-3 w-3" aria-hidden="true" /> Rascunho
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          criado {shortDate(ann.createdAt)} · atualizado {shortDate(ann.updatedAt)}
        </span>
      </div>

      {/* ============ CONTEÚDO ============ */}
      <h3 className="mt-3 font-display text-lg font-bold leading-snug">{ann.title}</h3>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {ann.message}
      </p>

      {/* ============ MÍDIA ANEXADA ============ */}
      {(ann.image || ann.file || ann.linkUrl) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ann.image ? (
            <a
              href={mediaUrl(ann.image.key, ann.image.name)}
              target="_blank"
              rel="noopener noreferrer"
              title={`Abrir imagem: ${ann.image.name}`}
              className="block overflow-hidden rounded-xl border border-border"
            >
              <img
                src={mediaUrl(ann.image.key, ann.image.name)}
                alt={`Imagem do aviso: ${ann.image.name}`}
                className="h-14 w-14 object-cover"
              />
            </a>
          ) : null}
          {ann.file ? (
            <a
              href={mediaUrl(ann.file.key, ann.file.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
              {ann.file.name} ({formatBytes(ann.file.size)})
            </a>
          ) : null}
          {ann.linkUrl ? (
            <a
              href={ann.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              {ann.linkLabel || 'Ver mais'}
            </a>
          ) : null}
        </div>
      )}

      {/* ============ AÇÕES ============ */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <form action={toggleAnnouncementAction}>
          <input type="hidden" name="id" value={ann.id} />
          <Button
            type="submit"
            size="sm"
            variant={ann.active ? 'outline' : 'default'}
            className={
              ann.active
                ? 'rounded-lg'
                : 'rounded-lg bg-gold text-black hover:bg-gold-light'
            }
          >
            {ann.active ? (
              <>
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> Desativar
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Ativar
              </>
            )}
          </Button>
        </form>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-lg"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Editar
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-lg border-gold/40 text-gold hover:bg-gold/10"
          disabled={pushSending}
          onClick={sendPush}
          aria-label={`Enviar este aviso como notificação push para todos os inscritos`}
          title="Envia este aviso como push (quem ativou as notificações recebe)"
        >
          {pushSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Enviar push
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-500"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Excluir
        </Button>
      </div>

      {/* ============ EDITAR (DIALOG) ============ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Editar aviso</DialogTitle>
            <DialogDescription>
              Atualize o texto, a mídia ou a publicação. Ao salvar, a dashboard
              dos usuários passa a exibir a versão nova.
            </DialogDescription>
          </DialogHeader>
          <AnnouncementForm
            mode="edit"
            announcement={ann}
            idPrefix={`ann-edit-${ann.id.slice(0, 8)}`}
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ============ EXCLUIR (CONFIRMAÇÃO) ============ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir aviso?</AlertDialogTitle>
            <AlertDialogDescription>
              “{ann.title}” será removido definitivamente, junto da imagem e do
              arquivo anexados (se houver). Usuários param de vê-lo imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <form ref={deleteFormRef} action={deleteAnnouncementAction} className="contents">
              <input type="hidden" name="id" value={ann.id} />
              <AlertDialogAction
                disabled={deleting}
                onClick={(e) => {
                  e.preventDefault();
                  confirmDelete();
                }}
                className="bg-red-600 text-white hover:bg-red-600/90"
              >
                {deleting ? 'Excluindo…' : 'Excluir definitivamente'}
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
