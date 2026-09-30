'use client';

/**
 * Ajuda — central de dúvidas do app:
 * - Ações rápidas (tour guiado, Obsidian, exportações)
 * - Guia detalhado de cada aba (accordion)
 * - Perguntas frequentes (accordion)
 * - Dados de exemplo (status + limpar)
 * - Problemas comuns
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LifeBuoy, PlayCircle, BookOpenCheck, NotebookPen, Target, Wallet, LibraryBig,
  BarChart3, Trophy, Settings, Sparkles, Trash2, RefreshCcw, Database,
  HelpCircle, Wrench, ChevronRight,
} from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SectionHeader } from '@/components/shared/ui-kit';
import { useAppStore } from '@/stores/useAppStore';
import { countExampleData, clearExampleData } from '@/db/seed';

/* ============================== CONTEÚDO DO GUIA ============================== */

const GUIA_ABAS = [
  {
    icon: BookOpenCheck,
    aba: 'Início (Dashboard)',
    texto:
      'É o seu centro de comando. Mostra a meta financeira do ano com progresso automático, o streak de dias seguidos, XP e nível, o resumo do orçamento do mês, os últimos aprendizados e o calendário de consistência do ano. O botão "Registrar Hoje" no topo leva direto ao diário do dia — é por ali que o método acontece: um dia de cada vez.',
  },
  {
    icon: NotebookPen,
    aba: 'Diário',
    texto:
      'Uma entrada por dia, com os campos do método Haroldo Ochoa: horário que acordou, exercício físico, alimentação, estudo do dia, ações produtivas, receitas/despesas do dia, humor e energia. Dois campos merecem carinho especial: "Reflexões" (o que você pensou sobre o dia) e "Em prática" (a ação concreta que aplicou — obrigatória, vale +40 XP). Você pode criar modelos (templates) para preencher dias parecidos rapidinho e anexar fotos de recibos.',
  },
  {
    icon: Target,
    aba: 'Sonhos & Metas',
    texto:
      'Aqui vivem os sonhos da capa do diário físico (lista livre, sem data) e as metas categorizadas com valor-alvo e prazo. Recomendação do método: comece com pelo menos 10 metas espalhadas pelas 7 categorias (saúde, financeira, relacionamento, espiritual, carreira, estilo de vida e outros). Atualize o valor atual conforme avança — a barra de progresso e o dashboard acompanham sozinhos.',
  },
  {
    icon: Wallet,
    aba: 'Orçamento',
    texto:
      'Lançamentos de receitas e despesas com categoria, valor e frequência. Lançamentos "mensais" (salário, aluguel) entram no cálculo de todos os meses a partir da data do lançamento — você lança uma vez só. O saldo do mês alimenta o dashboard e as estatísticas. Dica: registre tudo, até o cafezinho; consciência financeira nasce do detalhe.',
  },
  {
    icon: LibraryBig,
    aba: 'Biblioteca',
    texto:
      '20 temas prontos de Finanças (reserva de emergência, juros compostos, Tesouro Direto, FIIs…) e Negócios (vendas, precificação, tráfego pago…). Escolha um tema, marque o progresso e, principalmente, preencha "O que aprendi" — é o campo que transforma leitura em conhecimento seu. Concluir um estudo vale +30 XP.',
  },
  {
    icon: BarChart3,
    aba: 'Estatísticas',
    texto:
      'Gráficos de evolução: humor e energia ao longo dos dias, receitas x despesas, distribuição do orçamento por categoria e consistência de registros. Use nas revisões semanais: 10 minutos de domingo à noite olhando os números valem mais que meses no piloto automático.',
  },
  {
    icon: Trophy,
    aba: 'Conquistas',
    texto:
      'Marcos de disciplina desbloqueados automaticamente: primeiro registro, streaks de 7/30/100 dias, primeiros estudos concluídos, metas atingidas e mais. Não são enfeite: cada conquista corresponde a um hábito real que você construiu.',
  },
  {
    icon: Settings,
    aba: 'Configurações',
    texto:
      'Tudo sob seu controle: perfil e meta anual, pasta do dispositivo (Backups/Exportações/Anexos/Impressões), integração com Obsidian (exportar vault .zip, conectar vault para sincronizar, backup criptografado), backups automáticos, exportações em PDF/Word/Excel/Markdown/JSON, lembrete diário, tema escuro/claro, modo foco, tour guiado e limpeza dos dados de exemplo.',
  },
];

const FAQ = [
  {
    q: 'Onde meus dados ficam? Alguém os vê?',
    a: 'Todos os dados vivem exclusivamente no seu navegador (IndexedDB) e, se você conectar uma pasta, no seu próprio disco. Nenhum servidor recebe nada — o app é 100% offline. O único "transporte" é o que VOCÊ configurar: se o seu vault do Obsidian sincroniza via iCloud/OneDrive/Syncthing, os arquivos do app viajam do seu dispositivo para o seu outro dispositivo, sempre dentro da sua pasta pessoal.',
  },
  {
    q: 'Como faço backup dos meus dados?',
    a: 'Três caminhos: (1) Backup automático diário (ligado por padrão em Configurações) que salva um JSON completo na pasta /Backups; (2) "Fazer backup agora" a qualquer momento; (3) Exportação JSON portátil. Se você conecta o vault do Obsidian, o estado completo também vive em Diario_da_Riqueza/_dados/diario-da-riqueza.json — mais uma cópia automática a cada sincronização.',
  },
  {
    q: 'O que é XP e como ganho mais?',
    a: 'XP é a pontuação do treino mental: +50 por dia registrado, +40 por colocar em prática, +30 por estudo concluído, +25 por meta atingida e bônus de consistência a partir de 7 dias de streak (10 XP, subindo para 25 e 50 nos marcos maiores). XP acumula níveis — a gamificação existe para transformar disciplina em hábito, não para virar fim em si mesma.',
  },
  {
    q: 'Como funciona a integração com Obsidian?',
    a: 'Em Configurações → Integração Obsidian você pode: (1) Exportar um vault .zip — funciona em qualquer navegador, inclusive celular; copie a pasta Diario_da_Riqueza para o seu vault e abra o 00-Dashboard.md; (2) Conectar a pasta do vault (Chrome/Edge desktop) — o app espelha tudo em Markdown com frontmatter e importa de volta as seções "Reflexões" e "Em prática" que você editar no Obsidian; (3) Sincronizar entre dispositivos — o estado completo vive dentro do vault, então o sync que você já usa (iCloud, Syncthing, Obsidian Sync) leva os dados do app junto. Edição em dois lugares usa last-write-wins com log de conflitos.',
  },
  {
    q: 'Posso usar no celular e no computador ao mesmo tempo?',
    a: 'Sim. Cada dispositivo mantém seus dados locais; para compartilhar, conecte o mesmo vault do Obsidian nos dois e sincronize (botão "Sincronizar agora" ou auto-sync na abertura). No celular, onde o navegador não abre pastas reais, use o export .zip ou edite as notas pelo próprio Obsidian Mobile — na próxima sincronização do desktop as edições de texto voltam para o app.',
  },
  {
    q: 'Por que existem dados de exemplo? Posso apagar?',
    a: 'Para você nunca começar diante de uma tela vazia: o app vem com 3 dias de diário realistas, 2 metas com progresso, sonhos, orçamento do mês e 2 estudos iniciados — para você ver como tudo se conecta antes de registrar o seu primeiro dia real. Eles são marcados como exemplo e podem ser editados um a um ou apagados de uma vez aqui mesmo, ou em Configurações → Dados de exemplo. Apagar também remove do vault Obsidian na próxima sincronização.',
  },
  {
    q: 'Meu navegador "não suporta File System Access" — e agora?',
    a: 'Pastas reais do disco exigem Chrome, Edge ou Opera (desktop ou Android). Firefox e Safari/iOS não suportam ainda — nestes, o app funciona 100% com armazenamento interno e downloads automáticos para backups/exportações. Nada se perde: os dados ficam no IndexedDB do navegador e podem ser exportados/restaurados normalmente.',
  },
  {
    q: 'Como instalo o app no celular (PWA)?',
    a: 'Abra o app no navegador do celular, toque no menu do navegador e escolha "Adicionar à tela inicial" (Android) ou "Adicionar à Tela de Início" (iOS). Ele abre em tela cheia como app nativo, funciona offline e mantém os dados locais do dispositivo.',
  },
  {
    q: 'Posso editar ou excluir qualquer registro?',
    a: 'Sim — tudo no app é editável: entradas do diário (clique no dia), metas (progresso, status, prazo), lançamentos do orçamento, sonhos, estudos e templates. Excluir um registro grava um "tombstone" que também remove o arquivo correspondente do vault Obsidian na próxima sincronização.',
  },
  {
    q: 'Como imprimo meu diário (versão física)?',
    a: 'Em Configurações → Exportações → Impressão há dois modos: "Imprimir como está" (a tela vira papel) e "Diário físico (capa)" — um layout A5 clássico com capa, sumário e uma página por dia, no espírito do diário impresso do método. As impressões também podem ser salvas na pasta /Impressoes.',
  },
];

const PROBLEMAS = [
  {
    p: '"Falha ao sincronizar" com o vault do Obsidian',
    s: 'Verifique se a permissão da pasta ainda está concedida: em Configurações → Integração Obsidian, clique em "Conectar vault" novamente e escolha a mesma pasta. Se o erro persistir, copie a mensagem exata e reporte — cada mensagem indica a causa (nome de arquivo, permissão, pasta movida).',
  },
  {
    p: 'Pasta do dispositivo desconectou sozinha',
    s: 'Navegadores revogam a permissão de pasta após algum tempo sem uso. Basta reconectar: Configurações → Pasta no dispositivo → "Conectar / criar pasta", escolhendo a mesma pasta de antes. Nenhum dado é perdido.',
  },
  {
    p: 'Registros sumiram / quero restaurar um backup',
    s: 'Abra Configurações → Backups e restauração. Os backups internos (últimos 10) e os arquivos da pasta /Backups podem ser restaurados com um clique. Restaurar é seguro: os registros voltam com os mesmos identificadores.',
  },
  {
    p: 'App lento ou com comportamento estranho',
    s: 'Feche e reabra o app (no PWA, feche por completo). Se persistir, faça um backup, use "Apagar todos os dados" e restaure o backup — isso recria o banco do zero. Lembre também de que modo anônimo e extensões podem bloquear o IndexedDB.',
  },
  {
    p: 'Não recebo o lembrete diário',
    s: 'O lembrete usa notificações locais e funciona enquanto o app estiver aberto (instalado como PWA = sempre "aberto"). Confira em Configurações → Lembrete diário: switch ligado, horário certo e permissão de notificação concedida pelo navegador.',
  },
];

/* ============================== VIEW ============================== */

export function HelpView() {
  const setView = useAppStore((s) => s.setView);
  const setTourOpen = useAppStore((s) => s.setTourOpen);
  const [exampleCount, setExampleCount] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const liveCount = useLiveQuery(() => countExampleData(), [], 0);
  useEffect(() => setExampleCount(liveCount), [liveCount]);

  return (
    <div className="space-y-5">
      <SectionHeader icon={LifeBuoy} title="Ajuda" subtitle="Como usar o Diário da Riqueza — do primeiro dia à mestria" />

      {/* ===================== AÇÕES RÁPIDAS ===================== */}
      <Card className="border-gold/25 bg-gradient-to-br from-gold/10 via-card to-card">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-display text-lg font-bold">Primeira vez por aqui?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              O tour guiado percorre cada área do app em 1 minuto — ou leia o guia abaixo no seu ritmo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-gold text-black hover:bg-gold-light"
              onClick={() => {
                setTourOpen(true);
                setView('dashboard');
              }}
            >
              <PlayCircle className="mr-1.5 h-4 w-4" /> Iniciar tour guiado
            </Button>
            <Button variant="outline" className="border-gold/40 text-gold" onClick={() => setView('config')}>
              <Settings className="mr-1.5 h-4 w-4" /> Integração Obsidian
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===================== ROTINA RECOMENDADA ===================== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-gold" /> A rotina recomendada (5 minutos por dia)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            {[
              ['Manhã', 'Abra o app, veja a mensagem do dia e registre o horário que acordou. Clareza logo cedo ancora o dia no propósito.'],
              ['Durante o dia', 'Anote lançamentos no orçamento na hora (30 segundos cada) e marque o estudo do dia na Biblioteca.'],
              ['Noite', 'Complete o registro do dia: exercício, alimentação, finanças e, principalmente, "Em prática" — a ação concreta que aplicou. Um dia completo vale +90 XP.'],
              ['Domingo', 'Revise Estatísticas e o progresso das metas. Ajuste o plano da semana com base nos números, não na memória.'],
            ].map(([hora, texto], i) => (
              <li key={hora} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-xs font-bold text-gold">
                  {i + 1}
                </span>
                <div>
                  <span className="font-semibold">{hora}:</span>{' '}
                  <span className="text-muted-foreground">{texto}</span>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* ===================== GUIA DE CADA ABA ===================== */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpenCheck className="h-4 w-4 text-gold" /> Guia de cada aba
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {GUIA_ABAS.map((g, i) => (
              <AccordionItem key={g.aba} value={`aba-${i}`}>
                <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2.5">
                    <g.icon className="h-4 w-4 text-gold" /> {g.aba}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {g.texto}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* ===================== FAQ ===================== */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4 text-gold" /> Perguntas frequentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* ===================== DADOS DE EXEMPLO ===================== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-gold" /> Dados de exemplo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-gold/40 text-gold">
              {exampleCount} registro(s) de exemplo
            </Badge>
            <span className="text-xs text-muted-foreground">
              diário, metas, sonhos, orçamento e estudos — editáveis individualmente como qualquer registro.
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Eles existem para você começar vendo o método funcionando: explore o dashboard, o progresso
            das metas e o formato das entradas sem medo. Quando estiver pronto (ou agora mesmo), apague
            todos de uma vez — a remoção também é propagada para o vault do Obsidian na próxima sincronização.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" disabled={exampleCount === 0 || clearing} onClick={() => setClearOpen(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              {clearing ? 'Apagando…' : 'Apagar dados de exemplo'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setView('sonhos');
                toast.info('Dica: as metas "Reserva de emergência" e "Estudar finanças 30 dias" são exemplos — edite ou exclua à vontade.');
              }}
            >
              <RefreshCcw className="mr-1.5 h-4 w-4" /> Ver metas de exemplo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===================== PROBLEMAS COMUNS ===================== */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4 text-gold" /> Problemas comuns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {PROBLEMAS.map((pr, i) => (
              <AccordionItem key={pr.p} value={`prob-${i}`}>
                <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2.5 text-left">
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gold" /> {pr.p}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {pr.s}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todos os dados de exemplo?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão removidos {exampleCount} registro(s) marcados como exemplo (diário, metas, sonhos,
              orçamento, estudos e o XP semeado). Seus registros reais NÃO são tocados. A remoção será
              propagada ao vault Obsidian na próxima sincronização.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                setClearing(true);
                try {
                  const n = await clearExampleData();
                  toast.success(`${n} registro(s) de exemplo apagado(s).`);
                } catch (e) {
                  toast.error('Falha ao apagar exemplos: ' + String(e));
                } finally {
                  setClearing(false);
                }
              }}
            >
              Apagar exemplos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
