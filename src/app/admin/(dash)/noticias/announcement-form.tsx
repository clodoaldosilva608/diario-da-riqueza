'use client';

/**
 * AnnouncementForm — formulário do Portal de Notícias (client).
 *
 * Usado em DOIS contextos: card "Novo aviso" da página (mode="create") e
 * dentro do Dialog de edição de cada aviso (mode="edit", com valores
 * iniciais). Envia multipart via server action (create/update) com
 * useActionState — feedback inline, botão com pending e reset automático.
 *
 * Mídia: imagem (com preview local) e anexo arbitrário da whitelist.
 * No edit, novo upload substitui o atual; checkbox "remover" limpa.
 */

import { useRef, useState, useTransition } from 'react';
import {
  AlertCircle, CheckCircle2, FileUp, ImagePlus, Loader2, Send, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  ANNOUNCEMENT_LIMITS, ANN_FORM_IDLE, formatBytes, type Announcement,
  type AnnFormState,
} from '@/lib/announcements';
import {
  createAnnouncementAction, updateAnnouncementAction,
} from '../../actions';

interface Props {
  mode: 'create' | 'edit';
  announcement?: Announcement;
  /** Edit: chamado após salvar com sucesso (fecha o dialog). */
  onSuccess?: () => void;
  /** Prefixo para ids de input únicos (create vs. vários dialogs). */
  idPrefix?: string;
}

const IMAGE_ACCEPT = ANNOUNCEMENT_LIMITS.imageExts.map((e) => `.${e}`).join(',');

export function AnnouncementForm({ mode, announcement, onSuccess, idPrefix = 'ann' }: Props) {
  const editing = mode === 'edit';

  // Server action chamada dentro de transição assíncrona (React 19):
  // permite resetar o form e fechar o dialog EXATAMENTE quando a action
  // termina — sem efeito de sincronização de estado (react-hooks lints).
  const [state, setState] = useState<AnnFormState>(ANN_FORM_IDLE);
  const [pending, startSubmit] = useTransition();

  const formRef = useRef<HTMLFormElement>(null);

  const [publish, setPublish] = useState(editing ? (announcement?.active ?? false) : true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [fileChosen, setFileChosen] = useState<{ name: string; size: number } | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [removeFile, setRemoveFile] = useState(false);

  function handleAction(formData: FormData) {
    startSubmit(async () => {
      const action = editing ? updateAnnouncementAction : createAnnouncementAction;
      const res = await action(ANN_FORM_IDLE, formData);
      setState(res);
      if (res.status === 'ok') {
        if (!editing) {
          formRef.current?.reset();
          setImagePreview(null);
          setImageName(null);
          setFileChosen(null);
          setPublish(true);
        }
        setClientError(null);
        setRemoveImage(false);
        setRemoveFile(false);
        onSuccess?.();
      }
    });
  }

  function onPickImage(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    setClientError(null);
    if (!f) {
      setImagePreview(null);
      setImageName(null);
      return;
    }
    if (f.size > ANNOUNCEMENT_LIMITS.imageMaxBytes) {
      setClientError(`Imagem muito grande (máx. ${Math.floor(ANNOUNCEMENT_LIMITS.imageMaxBytes / 1024 / 1024)} MB).`);
      ev.target.value = '';
      return;
    }
    setImagePreview(URL.createObjectURL(f));
    setImageName(f.name);
    setRemoveImage(false); // upload novo já cancela o "remover"
  }

  function onPickFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    setClientError(null);
    if (!f) {
      setFileChosen(null);
      return;
    }
    if (f.size > ANNOUNCEMENT_LIMITS.fileMaxBytes) {
      setClientError(`Arquivo muito grande (máx. ${Math.floor(ANNOUNCEMENT_LIMITS.fileMaxBytes / 1024 / 1024)} MB).`);
      ev.target.value = '';
      return;
    }
    setFileChosen({ name: f.name, size: f.size });
    setRemoveFile(false);
  }

  const feedback = clientError
    ? { kind: 'error' as const, msg: clientError }
    : state.status === 'error'
      ? { kind: 'error' as const, msg: state.message }
      : state.status === 'ok'
        ? { kind: 'ok' as const, msg: state.message }
        : null;

  return (
    <form ref={formRef} action={handleAction} className="space-y-5">
      {editing ? <input type="hidden" name="id" value={announcement?.id} /> : null}
      {editing && removeImage ? <input type="hidden" name="removeImage" value="1" /> : null}
      {editing && removeFile ? <input type="hidden" name="removeFile" value="1" /> : null}

      {/* ============ CONTEÚDO ============ */}
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`}>Título do aviso *</Label>
        <Input
          id={`${idPrefix}-title`}
          name="title"
          required
          maxLength={ANNOUNCEMENT_LIMITS.title}
          defaultValue={announcement?.title}
          placeholder="Ex.: Nova funcionalidade no ar!"
          className="h-11 rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-message`}>Aviso (o que você quer comunicar) *</Label>
        <Textarea
          id={`${idPrefix}-message`}
          name="message"
          required
          rows={4}
          maxLength={ANNOUNCEMENT_LIMITS.message}
          defaultValue={announcement?.message}
          placeholder="Escreva a mensagem que os usuários verão no banner da dashboard…"
          className="rounded-xl"
        />
        <p className="text-xs text-muted-foreground">
          Você pode usar várias linhas — quebras são mantidas no banner.
        </p>
      </div>

      {/* ============ LINK ============ */}
      <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-link`}>Link (opcional)</Label>
          <Input
            id={`${idPrefix}-link`}
            name="linkUrl"
            type="url"
            defaultValue={announcement?.linkUrl}
            placeholder="https://…"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-link-label`}>Rótulo do botão</Label>
          <Input
            id={`${idPrefix}-link-label`}
            name="linkLabel"
            maxLength={ANNOUNCEMENT_LIMITS.linkLabel}
            defaultValue={announcement?.linkLabel}
            placeholder="Ver mais"
            className="h-11 rounded-xl"
          />
        </div>
      </div>

      {/* ============ MÍDIA ============ */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Imagem */}
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-image`}>
            <span className="inline-flex items-center gap-1.5">
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" /> Imagem (opcional)
            </span>
          </Label>
          <Input
            id={`${idPrefix}-image`}
            name="image"
            type="file"
            accept={IMAGE_ACCEPT}
            onChange={onPickImage}
            className="h-11 cursor-pointer rounded-xl file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:text-xs file:font-semibold file:text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP ou GIF · máx. {Math.floor(ANNOUNCEMENT_LIMITS.imageMaxBytes / 1024 / 1024)} MB
          </p>

          {/* Mídia atual (edit) */}
          {editing && announcement?.image && !removeImage && !imagePreview ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2">
              <img
                src={`/api/announcements/media?k=${encodeURIComponent(announcement.image.key)}`}
                alt={`Imagem atual: ${announcement.image.name}`}
                className="h-12 w-12 rounded-lg object-cover"
              />
              <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                atual: {announcement.image.name}
              </p>
              <button
                type="button"
                onClick={() => setRemoveImage(true)}
                aria-label="Remover imagem atual"
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-red-500/40 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          {/* Preview local do novo upload */}
          {imagePreview ? (
            <div className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/5 p-2">
              <img
                src={imagePreview}
                alt="Prévia da imagem selecionada"
                className="h-12 w-12 rounded-lg object-cover"
              />
              <p className="min-w-0 flex-1 truncate text-xs text-foreground">{imageName}</p>
              <button
                type="button"
                onClick={() => {
                  setImagePreview(null);
                  setImageName(null);
                  const input = document.getElementById(`${idPrefix}-image`) as HTMLInputElement | null;
                  if (input) input.value = '';
                }}
                aria-label="Cancelar imagem selecionada"
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Arquivo */}
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-file`}>
            <span className="inline-flex items-center gap-1.5">
              <FileUp className="h-3.5 w-3.5" aria-hidden="true" /> Arquivo (opcional)
            </span>
          </Label>
          <Input
            id={`${idPrefix}-file`}
            name="file"
            type="file"
            onChange={onPickFile}
            className="h-11 cursor-pointer rounded-xl file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:text-xs file:font-semibold file:text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            PDF, planilha, texto, áudio, vídeo… · máx. {Math.floor(ANNOUNCEMENT_LIMITS.fileMaxBytes / 1024 / 1024)} MB
          </p>

          {editing && announcement?.file && !removeFile && !fileChosen ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2">
              <FileUp className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                atual: {announcement.file.name} ({formatBytes(announcement.file.size)})
              </p>
              <button
                type="button"
                onClick={() => setRemoveFile(true)}
                aria-label="Remover arquivo atual"
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-red-500/40 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          {fileChosen ? (
            <div className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/5 p-2">
              <FileUp className="ml-1 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="min-w-0 flex-1 truncate text-xs text-foreground">
                {fileChosen.name} ({formatBytes(fileChosen.size)})
              </p>
              <button
                type="button"
                onClick={() => {
                  setFileChosen(null);
                  const input = document.getElementById(`${idPrefix}-file`) as HTMLInputElement | null;
                  if (input) input.value = '';
                }}
                aria-label="Cancelar arquivo selecionado"
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ============ PUBLICAÇÃO ============ */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4">
        <div>
          <Label htmlFor={`${idPrefix}-active`} className="cursor-pointer">
            Publicar agora
          </Label>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Ativo: o banner aparece na dashboard de todos os usuários.
            Desligado: fica salvo como rascunho para publicar depois.
          </p>
        </div>
        <Switch
          id={`${idPrefix}-active`}
          name="active"
          checked={publish}
          onCheckedChange={setPublish}
          aria-label="Publicar agora"
        />
      </div>

      {/* ============ FEEDBACK ============ */}
      {feedback ? (
        <p
          role="status"
          className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
            feedback.kind === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-500'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
          }`}
        >
          {feedback.kind === 'error' ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {feedback.msg}
        </p>
      ) : null}

      {/* ============ SUBMIT ============ */}
      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl bg-gold text-black hover:bg-gold-light sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Enviando…
          </>
        ) : editing ? (
          'Salvar alterações'
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" /> Publicar aviso
          </>
        )}
      </Button>
    </form>
  );
}
