/**
 * /admin/webhooks — webhooks registrados na Cakto e histórico de eventos.
 *
 * Ação disponível: reenviar/testar evento (webhook_event_test) — dispara
 * um evento de teste para a URL registrada e permite validar a integração
 * com /api/cakto/webhook desta aplicação.
 */

import { listWebhooks } from '@/lib/cakto-server';
import { CAKTO_WEBHOOK_EVENTS } from '@/lib/cakto';
import { CaktoError, DateTime, StatusBadge, Td } from '../ui';

export const dynamic = 'force-dynamic';

export default async function AdminWebhooksPage() {
  let data: Awaited<ReturnType<typeof listWebhooks>> | null = null;
  let error: unknown = null;
  try {
    data = await listWebhooks(1, 20);
  } catch (e) {
    error = e;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Webhooks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Integrações de eventos da Cakto. O endpoint desta aplicação é{' '}
          <code className="font-mono text-xs">/api/cakto/webhook?key=…</code> (token
          em variável de ambiente — nunca público).
        </p>
      </div>

      {error ? (
        <CaktoError error={error} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  {['Webhook', 'URL', 'Status', 'Eventos', 'Criado em'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!data || data.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum webhook registrado — configure na etapa de integração.
                    </td>
                  </tr>
                ) : (
                  data.data.map((w, i) => (
                    <tr key={w.id ?? i} className="hover:bg-muted/30">
                      <Td className="font-semibold">{w.name ?? '—'}</Td>
                      <Td className="max-w-72 truncate font-mono text-xs" >{w.url ?? '—'}</Td>
                      <Td><StatusBadge status={w.status} /></Td>
                      <Td className="max-w-64">
                        <p className="truncate text-xs text-muted-foreground">
                          {(w.events ?? []).join(', ') || 'todos'}
                        </p>
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-muted-foreground">
                        {DateTime(
                          (w as { createdAt?: string }).createdAt
                            ?? (w as { created_at?: string }).created_at,
                        )}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <section aria-labelledby="wb-events" className="rounded-2xl border border-border p-5">
            <h2 id="wb-events" className="font-display text-base font-bold">
              Eventos que esta aplicação trata
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              O handler aceita estes eventos e registra no log do servidor. Na
              Fase 2 (com banco) eles alimentarão histórico, moderação do mural
              e e-mails de agradecimento.
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {CAKTO_WEBHOOK_EVENTS.map((ev) => (
                <li
                  key={ev}
                  className="rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-[11px]"
                >
                  {ev}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
