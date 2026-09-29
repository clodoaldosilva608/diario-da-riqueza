# 📓 Diário da Riqueza

**Treine sua mente para a riqueza todos os dias.** Aplicação **local-first** inspirada no método de Haroldo Ochoa: meta financeira clara, orçamento, estudos de finanças e negócios, registro diário com prática obrigatória e gamificação séria (XP, níveis e conquistas).

> 🔒 **100% offline e privado** — todos os dados vivem no seu dispositivo (IndexedDB). Nenhum servidor, nenhuma conta, nenhuma telemetria.

---

## ✨ Funcionalidades

### Onboarding e conta local
- 5 passos: boas-vindas → identidade → meta financeira + data-alvo → pasta no dispositivo → tema
- Sem cadastro: a "conta" é o seu navegador + sua pasta

### Arquitetura local-first
- **IndexedDB (Dexie.js)** como banco principal — funciona 100% offline
- **File System Access API**: cria a pasta `Diario_da_Riqueza` no seu disco com subpastas `Backups/`, `Exportacoes/`, `Anexos/` e `Impressoes/`; o handle é persistido no IndexedDB e reconectado automaticamente
- Fallback universal: navegadores sem suporte (Firefox/Safari) usam downloads automáticos com mensagem clara
- **Backup automático diário** (mantém os últimos 10 no app + cópia na pasta)
- Restaurar de arquivo ou da lista de backups internos/da pasta

### Diário diário (core)
- Data/horário que acordou, exercício físico, alimentação, estudo do dia (tema + resumo), ações produtivas, receita/despesa, pensamentos e **"O que coloquei em prática hoje" (obrigatório)**
- Humor e energia (1–10)
- Anexos com preview (recibos, prints) — salvos no app e copiados para `/Anexos`
- Templates de entrada reutilizáveis
- Calendário mensal visual + heatmap anual de consistência
- Busca global (Ctrl/Cmd + K) em entradas, metas, estudos e sonhos

### Sonhos e Objetivos
- Lista livre de sonhos com toggle "realizado"
- Metas categorizadas (Saúde, Financeira, Relacionamento, Espiritual, Carreira, Estilo de Vida, Outros) com progresso visual, valor-alvo e prazo — incentivo às 10 metas do método

### Orçamento
- Lançamentos **únicos ou mensais** (recorrentes)
- Gráficos: fluxo de caixa anual, despesas por categoria, evolução acumulada
- **Projeção até a meta**: saldo médio mensal, projeção na data-alvo e "quanto guardar por mês"
- Taxa de poupança mensal

### Biblioteca de Estudos
- 20 temas pré-semeados: **Finanças** (CDB, CDI, Tesouro Direto, Ações, FIIs, juros compostos, reserva de emergência…) e **Negócios** (vendas, marketing digital, produto, precificação, copywriting, tráfego…)
- Progresso por tema (0–100%), status e campo **"O que aprendi"**
- Adicione temas próprios

### Gamificação (sem ser infantil)
- **XP**: registrar o dia (+50), colocar em prática (+40), concluir estudo (+30), concluir meta (+25), bônus de streak (+10/+25/+50)
- **Níveis**: Iniciante → Disciplinado → Construtor → Investidor → Visionário → Milionário
- **12 conquistas**: Chama de 7 Dias, Imparável 30, Lenda 100, Erudito, Caixa Positivo 3 Meses, Madrugador Elite…
- Mensagens motivacionais diárias no estilo Haroldo ("Cria possibilidades, não expectativas")
- Celebração animada de XP ao completar o dia

### Exportação e impressão
- **PDF** (capa premium preta+dourada, jsPDF), **Word** (.docx), **Excel** (.xlsx com 6 abas), **Markdown** e **JSON** (backup total)
- Escopos: dia, mês, ano ou diário completo
- **Imprimir como está no app** (CSS `@media print`) ou **Diário físico** (capa + páginas formatadas)
- Tudo vai preferencialmente para a pasta conectada (`/Exportacoes`)

### Extras
- Múltiplos diários por ano (seletor no topo)
- Modo Foco (esconde navegação e distrações)
- Lembrete diário local (Web Notifications, horário configurável)
- PWA instalável (manifest + service worker + ícones próprios)
- Tema escuro premium (padrão) e claro papel
- Estatísticas avançadas (dias produtivos, temas mais estudados, XP por tipo, humor, saldo mensal, curva de XP)

---

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Estilo | Tailwind CSS 4 + shadcn/ui + Framer Motion |
| Estado | Zustand (persistido em localStorage) |
| Banco local | Dexie.js (IndexedDB) + dexie-react-hooks |
| PWA | manifest.webmanifest + Service Worker próprio (cache-first estáticos, network-first navegações) |
| Filesystem | File System Access API (`showDirectoryPicker`) |
| Exportação | jsPDF + jspdf-autotable, docx, xlsx (SheetJS) |
| Gráficos | Recharts |
| Validação | Zod |
| Ícones | Lucide React |
| Fontes | Inter (texto) + Playfair Display (títulos) |

---

## 📂 Estrutura

```
src/
├── app/                  # Layout, página única (SPA), manifest, globals
├── components/
│   ├── onboarding/       # Wizard de 5 passos
│   ├── layout/           # AppShell (sidebar/bottom-nav/foco/busca)
│   ├── dashboard/        # Dashboard + heatmap
│   ├── diary/            # Form diário, calendário, templates, detalhe
│   ├── goals/            # Sonhos + metas categorizadas
│   ├── budget/           # Orçamento + gráficos + projeção
│   ├── library/          # Biblioteca de estudos
│   ├── stats/            # Estatísticas avançadas
│   ├── achievements/     # Conquistas
│   ├── settings/         # Pasta, backups, exportações, lembretes
│   ├── print/            # Layout de impressão "diário físico"
│   ├── shared/           # UI kit premium
│   └── pwa/              # SW register + tema
├── db/                   # Schema Dexie + camada de ações (XP/conquistas)
├── filesystem/           # File System Access API + fallback
├── export/               # PDF / DOCX / XLSX / MD / JSON
├── gamification/         # Motor de XP, níveis, conquistas
├── stores/               # Zustand
├── hooks/                # useLiveQuery, lembretes, backup
├── lib/                  # Formatação, mensagens motivacionais
└── types/                # Tipos centrais
```

---

## 🚀 Instalação e uso

```bash
# 1. Instalar dependências
bun install        # ou npm install

# 2. Rodar em desenvolvimento
bun run dev        # http://localhost:3000

# 3. Build de produção (PWA completo)
bun run build
bun run start
```

### Uso offline
1. Abra o app uma primeira vez (online) — o service worker faz o cache do shell
2. Instale como aplicativo (ícone na barra de endereço → "Instalar")
3. A partir daí o app abre e funciona **100% offline**; os dados ficam no IndexedDB do dispositivo

### Conectando sua pasta (recomendado)
1. No onboarding ou em **Configurações → Pasta no dispositivo**, clique em **"Conectar / criar pasta"**
2. Escolha (ou crie) a pasta `Diario_da_Riqueza` — as subpastas são criadas automaticamente
3. Backups diários, exportações e anexos passam a ser gravados lá diretamente
4. Navegadores suportados: **Chrome, Edge, Opera** (desktop e Android). Em outros, o app avisa e usa downloads

### Backups
- **Automático**: diário ao abrir o app (últimos 10 guardados internamente + cópia em `/Backups`)
- **Manual**: "Fazer backup agora" gera JSON completo
- **Restaurar**: da lista interna, dos arquivos da pasta ou de qualquer arquivo `.json` exportado

---

## 🔒 Privacidade

- Nenhum dado sai do dispositivo: não há servidor, API ou analytics
- O service worker só faz cache de arquivos estáticos do próprio app
- A pasta conectada é acessada apenas quando você exporta/anexa/faz backup

## 🛠️ Decisões técnicas

- **SPA em rota única**: todas as "páginas" são views comutadas via Zustand — elimina flashes de navegação e simplifica o offline
- **Camada de ações (`src/db/actions.ts`)**: toda mutação passa por ela, garantindo XP correto, verificação de conquistas e consistência dos backups
- **XP auditável**: cada ponto de XP é um registro em `xpEvents` (histórico completo nas estatísticas)
- **Handles de pasta são persistíveis**: o `FileSystemDirectoryHandle` é salvo no IndexedDB (structured-cloneable); permissões são revalidadas a cada visita
