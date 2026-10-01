# Integração Cakto — Apoio, Fundadores e Painel Admin

> Documento operacional da integração de pagamentos do Diário da Riqueza
> com a plataforma **Cakto** (https://cakto.com.br). Atualizado em out/2026.

## Visão geral

```
Usuário (landing / dashboard / pop-ups)
   │  clica em valor fixo / fundador
   ▼
Checkout hospedado Cakto  →  https://pay.cakto.com.br/{offer_id}
   │  (Pix, cartão, Pix automático…)
   ▼
API Cakto (fonte da verdade)
   ▲
   │  server-side (credenciais em env vars)
   ├── GET /api/founders  ← Mural dos Fundadores na landing
   ├── POST /api/cakto/webhook  ← eventos (auditoria / Fase 2)
   └── /admin  ← painel do operador (senha + cookie assinado)
```

- **Apoios únicos (valores fixos)**: R$ 5 · R$ 15 · R$ 50 — checkout hospedado.
- **Apoiador Fundador**: assinatura mensal R$ 9,90 — nome no Mural dos
  Fundadores enquanto a assinatura estiver ativa.
- **Valor livre**: continua via Pix direto do criador (QR + copia e cola) —
  o checkout hospedado da Cakto não suporta "pague quanto quiser" e o Pix
  direto evita a taxa fixa de R$ 2,49 para valores pequenos.

## Produtos criados na Cakto (produção)

| Produto | Tipo | Preço | Offer (checkout) | Product ID |
|---|---|---|---|---|
| Apoie o Diário da Riqueza — Apoio mínimo | único | R$ 5,00 | `xear8ps` | `89a28c15-75b2-4d24-8f07-1413a9989aef` |
| Apoie o Diário da Riqueza — Apoio R$ 15 | único | R$ 15,00 | `3doo9ob` | `8a75ab17-789d-411a-831a-e032b82b2449` |
| Apoie o Diário da Riqueza — Apoio R$ 50 | único | R$ 50,00 | `3a8wteb` | `5a33cbba-b04c-47f1-a6d6-72594622a772` |
| Apoiador Fundador — Diário da Riqueza | assinatura | R$ 9,90/mês | `7utmjxk` | `fcbe8c19-83c6-43a0-bff8-46e19bfacadd` |

Constantes espelhadas em `src/lib/cakto.ts` (client-safe) e
`src/lib/cakto-server.ts` (server-only).

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Variável | Para que serve | Onde é usada |
|---|---|---|
| `CAKTO_CLIENT_ID` | OAuth2 client credentials da API pública | server-side (`cakto-server.ts`) |
| `CAKTO_CLIENT_SECRET` | idem — **NUNCA** prefixar com `NEXT_PUBLIC_` | server-side |
| `CAKTO_WEBHOOK_TOKEN` | token na URL do webhook (?key=…) | `/api/cakto/webhook` |
| `ADMIN_PASSWORD` | senha única do painel `/admin` | `admin-auth.ts` |
| `ADMIN_SESSION_SECRET` | segredo HMAC do cookie de sessão (8h) | `admin-auth.ts` |

Sem as variáveis a app continua funcionando: o mural fica vazio com CTA e
o login do admin exibe "painel não configurado" (fail-closed).

**⚠️ Rotação de segredos**: as credenciais foram coladas em conversa durante
o setup. Recomenda-se gerar nova chave em *Painel Cakto → Integrações →
Cakto API*, atualizar as env vars e revogar a antiga.

## Mural dos Fundadores — regra anti-inadimplência

Aplicada **server-side** em `/api/founders` (nunca no cliente):

1. `active` → nome no mural (formatado: "Nome S.").
2. `late` (atrasada) → a Cakto tenta recorrência até 3×; o nome permanece
   com selo "pendente" durante a **carência de 7 dias**
   (`FOUNDER_GRACE_MS`) e depois sai sozinho.
3. `paused` / `canceled` / `expired` / `inactive` → fora imediatamente.

Cache: memória 5 min (stale 30 min) + CDN `s-maxage=300, swr=1800`.
Privacidade: a API pública só devolve nome formatado, mês de entrada e nº
da recorrência — nunca e-mail, documento ou valores.

## Webhook

- Endpoint: `POST https://diariodariqueza.vercel.app/api/cakto/webhook?key={CAKTO_WEBHOOK_TOKEN}`
- Registrado via API da Cakto (`webhook_create`) com os eventos
  `purchase_approved`, `subscription_created/renewed/late/late_recovered/
  paused/resumed/canceled/renewal_refused`, `refund`, `chargeback`.
- Fase 1: valida token (tempo constante), registra no log e responde 200.
  O mural não depende do webhook (lê o estado vivo da API).
- Fase 2 (TODO): banco de dados → histórico, moderação de nome público,
  e-mail de agradecimento, ranking de meses de apoio.

## Painel /admin

- URL: `/admin` (oculta: sem links públicos, `Disallow` no robots.txt,
  `noindex`).
- Login: senha única → cookie `dr_admin` httpOnly assinado (HMAC-SHA256),
  expira em 8h. Comparação em tempo constante; fail-closed sem env vars.
- Páginas: **Dashboard** (saldo, assinaturas por status, fundadores,
  clientes, receita da janela), **Vendas** (busca + paginação),
  **Assinaturas** (filtros + cancelar com confirmação), **Fundadores**
  (efeito da regra em cada assinatura), **Clientes**, **Produtos**
  (leitura), **Webhooks** (status + catálogo de eventos).
- Ações de escrita: cancelar assinatura (irreversível, com `confirm()`).
  Produtos seguem em leitura — mudanças estruturais no painel da Cakto.

## Testes

`bun scripts/test_cakto.ts` (46 testes): tiers/URLs, guard de host,
formatação de nome e iniciais, regra `founderEligible` (inclui carência de
7 dias), `formatSince`, shape de webhook. Suíte completa: 288 testes.

## Limitações conhecidas

- `orders_analytics` da Cakto está retornando HTTP 500 (lado deles); o
  dashboard agrega métricas das listagens, sem depender dele.
- A API bruta pagina com `page` + `limit` (não `page_size`).
- Assinatura `late` usa `updatedAt` como início do atraso (proxy); quando
  houver banco (Fase 2), o webhook `subscription_late` dará o instante exato.
