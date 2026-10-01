# Guia de Segurança — Diário da Riqueza

> Checklist de AppSec e runbooks prontos para o projeto. Escrito para a
> arquitetura **atual** (PWA offline-first, sem backend próprio) e para a
> arquitetura **futura** (SaaS com backend + Supabase + VPS).
> Última revisão: 2026-10-01.

## 0. Contexto — o que se aplica hoje

O Diário da Riqueza é um **PWA local-first**: todos os dados ficam no
IndexedDB do próprio dispositivo (Dexie), não existe login, servidor de
aplicação próprio nem banco remoto. O deploy é estático/Next.js na Vercel.

Consequências de segurança que já valem hoje:

| Risco típico de SaaS | Situação neste projeto |
| --- | --- |
| Vazamento de chave de API no frontend | **N/A hoje** — o app não chama nenhuma API paga; não há `NEXT_PUBLIC_*` com segredo. As únicas "chaves" (Pix, WhatsApp) são dados públicos de contato por natureza. |
| SQL Injection | **N/A hoje** — não há SQL; os dados vão para o IndexedDB via Dexie (API de índices, não strings SQL). |
| Quebra de isolamento entre usuários (RLS) | **N/A hoje** — os dados nunca saem do dispositivo. Quando houver Supabase, aplique a seção 2 antes do primeiro deploy. |
| Clickjacking / MIME-sniffing / referrer leak | **Mitigado agora** — headers de segurança (seção 8). |
| Reverse tabnabbing nos links externos | **Mitigado agora** — todo `target="_blank"` usa `rel="noopener noreferrer"`. |
| Coleta indevida de dados | Por design: nada é enviado a servidores, não há analytics. |

Quando você adicionar backend (item 1), Supabase (item 2) ou VPS (item 3),
execute as seções correspondentes **antes** de colocar em produção.

---

## 1. Chave de API fora do frontend (camada protetora no backend)

**Regra:** nenhuma chave secreta (OpenAI, Anthropic, Stripe, e-mail, etc.) no
código do frontend nem em variáveis `NEXT_PUBLIC_*`. O frontend chama apenas
endpoints do **seu** backend; o backend valida sessão, aplica rate limit e só
então fala com a API externa.

### Estrutura de pastas recomendada

```
.env                 # segredos locais — NUNCA commitado (já está no .gitignore)
.env.example         # nomes das variáveis, sem valores — commitado
src/app/api/         # route handlers Next.js (proxy das APIs externas)
  ai/diario/route.ts #   ex.: POST /api/ai/diario
```

### `.env.example` (commitado) vs `.env` (secreto)

```bash
# .env.example — apenas nomes, sem valores
OPENAI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_URL=
NEXT_PUBLIC_APP_URL=https://diariodariqueza.vercel.app
```

```bash
# .env — valores reais (local). Na Vercel, cadastre em Project → Settings →
# Environment Variables e marque como "Sensitive" (não aparece em logs).
OPENAI_API_KEY=sk-...
```

### Backend (Next.js Route Handler) — proxy com autenticação + rate limit

```ts
// src/app/api/ai/diario/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Rate limit simples em memória (por instância). Para produção multi-instância
// use Upstash Redis / @upstash/ratelimit.
const hits = new Map<string, { n: number; reset: number }>();

function rateLimit(ip: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now > h.reset) {
    hits.set(ip, { n: 1, reset: now + windowMs });
    return true;
  }
  h.n += 1;
  return h.n <= limit;
}

export async function POST(req: NextRequest) {
  // 1) Autenticação: exija a sessão/JWT do SEU app (exemplo com Supabase Auth)
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // 2) Rate limit por usuário/IP
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!rateLimit(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  // 3) Validação de input (ver item 4) — nunca confie no corpo
  const body = await req.json().catch(() => null);
  const parsed = diaryAiSchema.safeParse(body); // Zod
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  // 4) Chama a API externa COM A CHAVE SECRETA (só existe aqui no servidor)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // segredo no servidor
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ /* ...mensagem validada em parsed.data... */ }),
  });

  // 5) Retorna apenas o resultado necessário (nunca headers/tokens externos)
  const data = await res.json();
  return NextResponse.json({ text: data.choices?.[0]?.message?.content ?? '' });
}
```

### Frontend — só fala com o seu backend

```ts
// src/lib/ai.ts (client)
export async function resumirDiario(payload: unknown) {
  const res = await fetch('/api/ai/diario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), // token de sessão injetado por middleware/cookie httpOnly
  });
  if (!res.ok) throw new Error('Falha ao gerar resumo');
  return (await res.json()) as { text: string };
}
```

**Por quê:** a chave nunca chega ao navegador (não aparece no bundle, nem em
devtools, nem em requisições). Mesmo um usuário autenticado não consegue
"usar a chave" — só consumir o endpoint com rate limit e validação.

### Checklist de secrets

- [ ] `rg "NEXT_PUBLIC_" src/` — revisar cada ocorrência: nenhuma pode conter segredo.
- [ ] `rg -i "api[_-]?key|secret|token" src/` — só referências a variáveis de servidor.
- [ ] `.env` no `.gitignore`; histórico do repo limpo (`git log -p | rg "sk-"`).
- [ ] Tokens de CI/deploy (Vercel/GitHub) revogados e recriados se já foram expostos em chats/telas compartilhadas.
- [ ] Rotação periódica (a cada 90 dias) e por incidente.

---

## 2. RLS no Supabase (Row Level Security)

**Regra:** RLS habilitado em TODAS as tabelas; por padrão ninguém vê nada de
outra pessoa; `service_role` somente no backend (nunca no frontend).

### SQL completo — execute no SQL Editor do Supabase

```sql
-- ============ PADRÃO GERAL ============
-- Cada tabela de usuário tem user_id uuid default auth.uid()
-- e policies que garantem acesso SOMENTE às próprias linhas.

alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.documents     enable row level security;
alter table public.subscriptions enable row level security;

-- Força o user_id a ser o dono autenticado (defesa em profundidade)
alter table public.projects  alter column user_id set default auth.uid();
alter table public.documents alter column user_id set default auth.uid();

-- ============ PROFILES ============
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

-- ============ PROJECTS ============
create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

-- ============ DOCUMENTS ============
create policy "documents_select_own" on public.documents
  for select using (auth.uid() = user_id);
create policy "documents_insert_own" on public.documents
  for insert with check (auth.uid() = user_id);
create policy "documents_update_own" on public.documents
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "documents_delete_own" on public.documents
  for delete using (auth.uid() = user_id);

-- ============ SUBSCRIPTIONS ============
-- Assinatura: leitura pelo dono; escrita SÓ pelo backend (service_role
-- bypassa RLS). Não crie policy de insert/update/delete para o usuário.
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Storage (se usar buckets): policies análogas por owner em storage.objects
```

### Como testar (SQL Editor)

```sql
-- Simule o usuário A: deve retornar só as linhas de A
select set_config('request.jwt.claims',
  json_build_object('sub','<uuid-do-usuario-a>','role','authenticated')::text, true);

select * from public.projects;            -- só projetos de A

-- Tente inserir em nome de outro usuário → deve FALHAR
insert into public.projects (user_id, name)
values ('<uuid-do-usuario-b>', 'hack');   -- viola a policy (with check)
```

E no app: logue com dois usuários de teste e confirme que o usuário B não vê
nem consegue alterar dados de A (via client, tentando `update` direto).

**Por quê:** sem RLS, qualquer pessoa com a `anon key` (pública por
necessidade) lê/escreve tudo. Com RLS, o isolamento é garantido no banco,
não no código do app — mesmo que o frontend tenha um bug, o dado não vaza.

---

## 3. Firewall da VPS (fechar tudo por padrão)

**Regra:** drop em tudo, liberar só 22/80/443 (+ 8080 se usar). O `deny
incoming` é o default seguro — portas novas só abrem com justificativa.

### UFW (Ubuntu/Debian)

```bash
sudo apt update && sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp  comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 8080/tcp comment 'App alt'   # só se realmente usar
sudo ufw enable
sudo ufw status verbose
```

SSH restrito por IP (se seu IP de saída for fixo) — troque `SEU.IP.AQUI`:

```bash
sudo ufw allow from SEU.IP.AQUI to any port 22 proto tcp
sudo ufw delete allow 22/tcp   # remove a regra aberta para o mundo
```

### firewalld (Fedora/RHEL)

```bash
sudo firewall-cmd --set-default-zone=drop
sudo firewall-cmd --permanent --zone=public --add-service=http
sudo firewall-cmd --permanent --zone=public --add-service=https
sudo firewall-cmd --permanent --zone=public --add-port=8080/tcp
sudo firewall-cmd --reload
```

### iptables (fallback direto)

```bash
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22  -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80  -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT   # opcional
# persistir: sudo apt install -y iptables-persistent && sudo netfilter-persistent save
```

### Hardening da VPS (copiar/colar)

```bash
# 1) fail2ban — bane brute-force de SSH
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban

# 2) SSH: só chave, sem root por senha (edite /etc/ssh/sshd_config)
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl reload ssh     # confirme que a chave funciona ANTES de fechar a sessão atual

# 3) Atualizações automáticas de segurança
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# 4) Checagem final
sudo ufw status verbose && sudo fail2ban-client status sshd
```

**Por quê:** a superfície de ataque de uma VPS com portas abertas cresce a
cada serviço esquecido (painéis, bancos, debug). Fechar por padrão + fail2ban
elimina a maior parte dos ataques automatizados.

> Nota deste projeto: o Diário da Riqueza hoje roda na **Vercel** — firewall
> de VPS só se aplica quando você subir serviços próprios (API, Supabase
> self-hosted, etc.).

---

## 4. Validação contra SQL Injection (3 camadas)

**Regra:** validar no frontend (UX), validar no backend (segurança) e usar
ORM/queries parametrizadas (última linha de defesa). Nunca concatenar input
em SQL.

### Camada 1 — Frontend (Zod)

```ts
// src/lib/schemas.ts
import { z } from 'zod';

export const lancamentoSchema = z.object({
  descricao: z.string().trim().min(1).max(140),       // tamanho máximo
  valor: z.coerce.number().positive().max(1_000_000), // tipo + limites
  tipo: z.enum(['receita', 'despesa']),               // allow-list
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),      // formato estrito
});
```

### Camada 2 — Backend (validar de novo, SEMPRE)

```ts
// Ex.: route handler — valide TUDO que chega, mesmo vindo do seu próprio app
const parsed = lancamentoSchema.safeParse(await req.json());
if (!parsed.success) {
  return NextResponse.json({ error: 'invalid_input', issues: parsed.error.flatten() },
    { status: 400 });
}
```

### Camada 3 — ORM / queries parametrizadas

```ts
// BOM — Drizzle/Prisma/client Supabase com queries tipadas
await db.insert(lancamentos).values(parsed.data);
await supabase.from('lancamentos').insert(parsed.data);

// SQL raw COM placeholders ($1) — parâmetros nunca entram no texto do SQL
await pool.query(
  'insert into lancamentos (descricao, valor) values ($1, $2)',
  [parsed.data.descricao, parsed.data.valor],
);
```

```ts
// RUIM — concatenação de input no SQL (exemplo do que NUNCA fazer)
const q = `insert into lancamentos (descricao) values ('${req.body.descricao}')`;
await pool.query(q);
// Payload: '); drop table lancamentos; --  → SQL injection clássica
```

**Por quê:** qualquer pessoa pode copiar a requisição do navegador e mandar
o que quiser direto ao backend (curl/Postman). A validação do frontend é
conveniência; a do backend é a barreira real; os placeholders fecham o vetor
independente da validação.

No estado atual do Diário da Riqueza (sem SQL), a aplicação equivalente é
manter os formulários com schema Zod antes de gravar no IndexedDB — padrão
que o app já segue no diário/lançamentos.

---

## 5. Scan de vulnerabilidades (DAST)

### Fluxo recomendado (iterar com IA)

1. **Quando:** de noite / fora do horário de pico (scans ativos podem gerar
   carga e instabilidade).
2. **Rode o scan** contra o ambiente de produção ou um clone dele.
3. **Analise o relatório:** nota geral + lista de vulnerabilidades.
4. Para cada falha, **extraia descrição + "como corrigir"** e cole aqui na IA
   para gerar o patch.
5. **Re-execute o scan** e confirme que a falha sumiu antes de seguir.

### OWASP ZAP (baseline — passivo, seguro para rodar em produção)

```bash
docker run --rm -v $(pwd)/zap:/zap/wrk:rw ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://diariodariqueza.vercel.app \
  -r relatorio_zap.html -I
```

### Nuclei (templates de CVE e misconfiguration)

```bash
nuclei -u https://diariodariqueza.vercel.app -severity low,medium,high,critical \
  -o nuclei_resultados.txt
```

### ZAP full scan (ativo — só em ambiente de teste/staging)

```bash
docker run --rm -v $(pwd)/zap:/zap/wrk:rw ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py -t https://staging.seudominio.com -r full_scan.html -I
```

> Ferramentas equivalentes: Burp Suite (manual/semi-automático), CyberVitis ou
> similar gerenciado. O importante é o **ciclo**: scan → patch → re-scan.

### Checklist de itens comuns a verificar

- [ ] Headers de segurança presentes (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy).
- [ ] Cookies com `Secure`, `HttpOnly`, `SameSite` (quando houver sessão).
- [ ] CORS restrito às origens necessárias (hoje: nenhuma API pública).
- [ ] Autenticação nas rotas que usam segredos/dados do usuário.
- [ ] Nenhum secret no bundle JS (`rg "sk-|AIza|ghp_" .next/static/`).
- [ ] SQL injection residual (endpoints que aceitam texto e consultam banco).
- [ ] XSS: campos livres renderizados sem sanitização (`dangerouslySetInnerHTML`).
- [ ] Dependências desatualizadas com CVE (`bun audit` / `npm audit`).

---

## 6. Checklist final antes de produção

- [ ] Headers de segurança ativos (verificar: `curl -sI https://seu-app | rg -i "security|csp"`).
- [ ] HTTPS forçado + HSTS.
- [ ] Nenhum `console.log` com dados sensíveis no bundle de produção.
- [ ] Secrets apenas como env vars de servidor; `.env` fora do git.
- [ ] RLS ativo e testado em todas as tabelas (quando houver Supabase).
- [ ] Rate limit nos endpoints que consomem APIs pagas.
- [ ] Backups automáticos (Supabase PITR ou `pg_dump` agendado; nesta fase local-first: incentivar o backup/export nativo do app).
- [ ] `bun audit` sem CVEs críticas/altas.
- [ ] Erros logados sem expor stack trace ao usuário final.
- [ ] Página de erro genérica (sem detalhes internos).

---

## 7. Hardening adicional recomendado

| Item | Recomendação |
| --- | --- |
| CSP com nonce | Trocar `'unsafe-inline'` por nonce por requisição via middleware (próximo passo de endurecimento do Next.js). |
| Rate limiting distribuído | Upstash Redis (`@upstash/ratelimit`) quando houver backend multi-instância. |
| Logging estruturado | Logar eventos de segurança (login falho, 429, 400 recorrentes) sem dados pessoais. |
| 2FA | Ativar 2FA no GitHub e na Vercel (contas que controlam o deploy). |
| Dependabot | Atualizações automáticas de dependências no GitHub. |
| Backups | Supabase: PITR + dump semanal fora da conta. App local-first: export JSON nativo já disponível ao usuário. |
| Rotação de tokens | Trocar tokens de deploy/API a cada 90 dias e imediatamente após qualquer exposição. |

---

## 8. Implementado NESTE repositório (estado atual)

- **Headers de segurança** em todas as rotas (`next.config.ts`): CSP, HSTS,
  X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP.
  Verificação: `curl -sI https://diariodariqueza.vercel.app | rg -i security`.
- **Zero segredos no frontend**: nenhuma chave de API; Pix/WhatsApp são dados
  públicos de contato; nenhum dado do usuário sai do dispositivo.
- **Links externos** sempre com `rel="noopener noreferrer"` (corta
  `window.opener` — anti reverse-tabnabbing).
- **CSP sem origens externas**: o app não carrega script/fonte/imagem de
  terceiros (fontes self-hosted via next/font; QR Pix é asset local).
- **Testes automatizados** (bun) cobrindo normalização de Pix, BR Code (CRC16),
  URLs e cadência dos pop-ups — mudanças nessas áreas quebram o CI local.
