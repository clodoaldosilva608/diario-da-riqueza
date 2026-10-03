'use client';

/**
 * PushSettings — ativação de notificações push reais (fechar o app).
 *
 * Estados cobertos com honestidade:
 * - Navegador sem suporte (iOS < 16.4 / Firefox restrito) → explicação
 * - Servidor sem VAPID (env ausente) → instrução para o operador
 * - Permissão negada → orientação para liberar no navegador
 * - Ativo → teste imediato + horário do lembrete diário (20h BRT)
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BellRing, Loader2, SendHorizonal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  disablePush, enablePush, getPushStatus, sendTestPush, type PushStatus,
} from '@/lib/push-client';

export function PushSettings() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setStatus(await getPushStatus());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleToggle(on: boolean) {
    setBusy(true);
    try {
      const r = on ? await enablePush() : await disablePush();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    try {
      const r = await sendTestPush();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    } finally {
      setBusy(false);
    }
  }

  const active = status?.subscribed && status.permission === 'granted';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4 text-gold" /> Notificações push (com o app fechado)
          {status && (
            <Badge
              variant="outline"
              className={`ml-auto text-[10px] ${active ? 'border-emerald-wealth/40 text-emerald-wealth' : 'opacity-60'}`}
            >
              {active ? 'ATIVO' : 'INATIVO'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!status ? (
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
        ) : !status.supported ? (
          <p className="text-sm text-muted-foreground">{status.note}</p>
        ) : !status.configured ? (
          <p className="text-sm text-muted-foreground">
            {status.note ?? 'Push indisponível no servidor.'}{' '}
            <span className="text-xs opacity-70">
              (Operador: configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nas env vars da Vercel —
              o lembrete diário parte do cron às 20h de Brasília.)
            </span>
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Switch
                id="st-push"
                checked={active}
                disabled={busy}
                onCheckedChange={handleToggle}
                aria-label="Ativar notificações push"
              />
              <span className="text-xs text-muted-foreground">
                Lembrete diário às 20h (Brasília) — mesmo com o app fechado.
              </span>
            </div>
            {active && (
              <Button variant="outline" size="sm" onClick={handleTest} disabled={busy}>
                {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <SendHorizonal className="mr-1.5 h-3.5 w-3.5" />}
                Enviar notificação de teste
              </Button>
            )}
            {status.permission === 'denied' && (
              <p className="text-xs text-loss">
                Permissão negada no navegador. Libere notificações para este site nas
                configurações do navegador para ativar.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
