/**
 * /admin/configuracoes — status das integrações e referência operacional
 * do painel (somente leitura, sem valores sensíveis).
 *
 * Mostra:
 * - Estado das credenciais/configurações no AMBIENTE ATUAL (booleans —
 *   nunca o valor das env vars);
 * - Catálogo público dos produtos do projeto (offer IDs e links de
 *   checkout são públicos — são links de pagamento);
 * - Webhook esperado (URL sem token) e eventos aceitos;
 * - Apontamentos para documentação e para o painel da Cakto.
 */

import {
  CAKTO_CHECKOUT_HOST, CAKTO_FOUNDER_PRICE, CAKTO_OFFER_FOUNDER,
  CAKTO_TIERS, CAKTO_WEBHOOK_EVENTS, caktoCheckoutUrl,
} from '@/lib/cakto';
import { caktoConfigured } from '@/lib/cakto-server';
import { adminConfigured } from '@/lib/admin-auth';
import { PageHeader, StatusBadge } from '../ui';

export const dynamic = 'force-dynamic';

function ConfigRow({
  ok, label, hint,
}: {
  ok: boolean;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      <StatusBadge status={ok ? 'active' : 'inactive'} />
    </div>
  );
}

export default async function AdminSettingsPage() {
  const cakto = caktoConfigured();
  const admin = adminConfigured();
  const webhookToken = Boolean(process.env.CAKTO_WEBHOOK_TOKEN);

  const products = [
    ...CAKTO_TIERS.map((t) => ({
      name: t.label.replace('Apoiar com ', 'Apoio '),
      type: 'único',
      price: t.amount,
      offer: t.offerId,
    })),
    {
      name: 'Apoiador Fundador',
      type: 'assinatura mensal',
      price: CAKTO_FOUNDER_PRICE,
      offer: CAKTO_OFFER_FOUNDER,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Status das integrações deste ambiente e referência operacional. Valores de credenciais nunca são exibidos — apenas se estão configurados."
      />

      {/* ============ STATUS DAS INTEGRAÇÕES ============ */}
      <section aria-labelledby="integracoes" className="space-y-3">
        <h2 id="integracoes" className="font-display text-lg font-bold">
          Integrações do ambiente
        </h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <ConfigRow
            ok={cakto}
            label="API Cakto"
            hint="CAKTO_CLIENT_ID + CAKTO_CLIENT_SECRET — alimenta dashboard, vendas, assinaturas e mural."
          />
          <ConfigRow
            ok={admin}
            label="Autenticação do painel"
            hint="ADMIN_EMAIL + ADMIN_PASSWORD + ADMIN_SESSION_SECRET — login e sessão de 8h."
          />
          <ConfigRow
            ok={webhookToken}
            label="Webhook da Cakto"
            hint="CAKTO_WEBHOOK_TOKEN — valida os eventos enviados pela plataforma."
          />
        </div>
        {(!cakto || !admin || !webhookToken) ? (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs leading-relaxed text-muted-foreground">
            Item desligado: adicione as env vars faltantes no servidor
            (Vercel → Settings → Environment Variables) e faça um redeploy.
            Procedimento completo em <code>docs/CAKTO.md</code>.
          </p>
        ) : null}
      </section>

      {/* ============ PRODUTOS E CHECKOUTS ============ */}
      <section aria-labelledby="produtos-checkouts">
        <h2 id="produtos-checkouts" className="font-display text-lg font-bold">
          Produtos e links de checkout
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Catálogo do projeto na Cakto ({CAKTO_CHECKOUT_HOST}) — links públicos de
          pagamento usados pela landing.
        </p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {['Produto', 'Tipo', 'Preço', 'Offer ID', 'Checkout'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => {
                const url = caktoCheckoutUrl(p.offer);
                return (
                  <tr key={p.offer} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.type}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">
                      {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{p.offer}</td>
                    <td className="px-4 py-3 text-xs">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold underline-offset-2 hover:underline"
                      >
                        {url.replace('https://', '')} ↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============ WEBHOOK ============ */}
      <section aria-labelledby="webhook-ref">
        <h2 id="webhook-ref" className="font-display text-lg font-bold">
          Webhook
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Endpoint que recebe os eventos da Cakto:
          {' '}<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            https://diariodariqueza.vercel.app/api/cakto/webhook?token=…</code>{' '}
          (token completo só na Cakto — nunca exibido aqui). Eventos aceitos:
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CAKTO_WEBHOOK_EVENTS.map((ev) => (
            <span
              key={ev}
              className="rounded-full border border-border bg-muted/30 px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
            >
              {ev}
            </span>
          ))}
        </div>
      </section>

      {/* ============ REFERÊNCIAS ============ */}
      <section aria-labelledby="referencias" className="space-y-2 text-sm text-muted-foreground">
        <h2 id="referencias" className="font-display text-lg font-bold text-foreground">
          Referências
        </h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <code className="text-xs">docs/CAKTO.md</code> — arquitetura, regras do
            mural, env vars e rotação de segredos.
          </li>
          <li>
            <a
              href="https://app.cakto.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline-offset-2 hover:underline"
            >
              Painel da Cakto ↗
            </a>{' '}
            — alterações estruturais de produtos (preço, nome, offer).
          </li>
          <li>
            <a
              href="/api/founders"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline-offset-2 hover:underline"
            >
              /api/founders ↗
            </a>{' '}
            — API pública do mural (cache de 5 min).
          </li>
        </ul>
      </section>
    </div>
  );
}
