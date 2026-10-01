/**
 * Material de divulgação do Diário da Riqueza para redes sociais.
 *
 * Fonte da verdade deste kit: os arquivos estáticos em /public/marketing/
 * (20 artes 1080x1080 + ZIP completo). As legendas aqui espelham o
 * legendas.md do kit — cada post tem título, corpo e exatamente 4 hashtags.
 *
 * Usado pela seção /admin/divulgacao (copiar legenda, baixar imagem,
 * baixar todas as legendas em .md).
 */

export type MarketingGroup =
  | 'Marca'
  | 'Recursos'
  | 'Inspiração'
  | 'Comunidade & Apoio'
  | 'Call to action';

export interface MarketingPost {
  /** nome do arquivo em /marketing/ (sem extensão) */
  slug: string;
  /** rótulo curto para exibição */
  label: string;
  group: MarketingGroup;
  /** primeira linha da legenda (gancho) */
  title: string;
  /** corpo da legenda */
  body: string;
  /** exatamente 4 hashtags, sempre incluindo a marca */
  hashtags: [string, string, string, string];
}

export const MARKETING_POSTS: MarketingPost[] = [
  {
    slug: '01-capa-marca',
    label: 'Capa da marca',
    group: 'Marca',
    title: 'Sua vida financeira, finalmente organizada 📓✨',
    body:
      'O Diário da Riqueza é um app gratuito que reúne tudo em um só lugar: registro de receitas e despesas, metas, orçamento, gráficos de evolução e um diário para anotar o que cada real significa para você. Simples de usar, direto do seu celular.',
    hashtags: ['#DiárioDaRiqueza', '#FinançasPessoais', '#OrganizaçãoFinanceira', '#ControleFinanceiro'],
  },
  {
    slug: '02-offline',
    label: '100% offline',
    group: 'Recursos',
    title: 'Sem internet? Sem problema. 📵',
    body:
      'O Diário da Riqueza funciona 100% offline. Você registra aquele gasto no ônibus, no mercado ou no meio da viagem — sem sinal não é mais desculpa. Tudo fica salvo no seu aparelho e sincroniza quando você quiser exportar.',
    hashtags: ['#DiárioDaRiqueza', '#AppOffline', '#Praticidade', '#FinançasPessoais'],
  },
  {
    slug: '03-privacidade',
    label: 'Privacidade',
    group: 'Recursos',
    title: 'Seus dados financeiros são SÓ seus 🔒',
    body:
      'Aqui não existe servidor guardando suas informações. Tudo que você registra fica salvo apenas no seu celular — nada é enviado, nada é vendido, nada é analisado. Privacidade de verdade, do jeito que deveria ser.',
    hashtags: ['#DiárioDaRiqueza', '#Privacidade', '#SegurançaDigital', '#FinançasPessoais'],
  },
  {
    slug: '04-sem-cadastro',
    label: 'Sem cadastro',
    group: 'Recursos',
    title: 'Ninguém gosta de criar cadastro. Então a gente removeu. 😅',
    body:
      'No Diário da Riqueza você abre o site e já começa a usar. Sem e-mail, sem senha, sem confirmar nada por código. Menos burocracia, mais organização — do jeito que deveria ser desde sempre.',
    hashtags: ['#DiárioDaRiqueza', '#SemCadastro', '#Simplicidade', '#FinançasPessoais'],
  },
  {
    slug: '05-gratuito',
    label: '100% gratuito',
    group: 'Recursos',
    title: 'Organizar o dinheiro não devia custar dinheiro 💚',
    body:
      'Por isso o Diário da Riqueza é 100% gratuito nos recursos principais: registro de entradas e saídas, metas, gráficos, diário e exportação dos seus dados. Sem pegadinha, sem mensalidade escondida. Comece agora.',
    hashtags: ['#DiárioDaRiqueza', '#Grátis', '#AppGratuito', '#FinançasPessoais'],
  },
  {
    slug: '06-instalar',
    label: 'Instale em segundos',
    group: 'Recursos',
    title: 'Sem loja de apps, sem espera: instale em segundos ⚡',
    body:
      'O Diário da Riqueza é um aplicativo web (PWA). Abra o site, toque em “Adicionar à tela inicial” e pronto — o ícone aparece no seu celular como qualquer outro app. Rápido, leve e sem encher seu aparelho.',
    hashtags: ['#DiárioDaRiqueza', '#PWA', '#Tecnologia', '#Produtividade'],
  },
  {
    slug: '07-receitas-despesas',
    label: 'Receitas e despesas',
    group: 'Recursos',
    title: 'Para onde foi o seu dinheiro esse mês? 🤔',
    body:
      'Se a resposta é “não faço ideia”, o Diário da Riqueza foi feito para você. Registre receitas e despesas em segundos, com categorias e observações — e nunca mais fique no escuro sobre os seus gastos.',
    hashtags: ['#DiárioDaRiqueza', '#ControleFinanceiro', '#ReceitasEDespesas', '#OrganizaçãoFinanceira'],
  },
  {
    slug: '08-evolucao',
    label: 'Gráficos de evolução',
    group: 'Recursos',
    title: 'O gráfico que você vai querer olhar todo mês 📈',
    body:
      'Acompanhe a sua evolução financeira com gráficos claros: para onde o dinheiro vai, como seus gastos se comportam e quanto falta para a sua meta. Ver o progresso é o combustível para continuar.',
    hashtags: ['#DiárioDaRiqueza', '#EvoluçãoFinanceira', '#PlanejamentoFinanceiro', '#Gráficos'],
  },
  {
    slug: '09-metas',
    label: 'Metas',
    group: 'Recursos',
    title: 'Meta sem acompanhamento é só desejo 🎯',
    body:
      'Defina suas metas financeiras no Diário da Riqueza, acompanhe o progresso em tempo real e comemore cada conquista no caminho. Sonho com data e valor deixa de ser sonho — passa a ser plano.',
    hashtags: ['#DiárioDaRiqueza', '#MetasFinanceiras', '#Objetivos', '#PlanejamentoFinanceiro'],
  },
  {
    slug: '10-diario',
    label: 'Diário do dinheiro',
    group: 'Recursos',
    title: 'Escrever sobre dinheiro muda a relação que você tem com ele ✍️',
    body:
      'Além de registrar valores, o Diário da Riqueza tem espaço para observações: por que você gastou, como se sentiu, o que gostaria de fazer diferente. Com o tempo, esse hábito vira consciência — e consciência vira resultado.',
    hashtags: ['#DiárioDaRiqueza', '#DiárioDoDinheiro', '#HábitosFinanceiros', '#ConsciênciaFinanceira'],
  },
  {
    slug: '11-sequencia',
    label: 'Sequência de dias',
    group: 'Recursos',
    title: 'Um dia de cada vez. É assim que o hábito se constrói 🔥',
    body:
      'Mantenha a sua sequência de dias registrados e veja o efeito composto acontecer: registros viram rotina, rotina vira controle e controle vira tranquilidade. A consistência está do seu lado.',
    hashtags: ['#DiárioDaRiqueza', '#Consistência', '#HábitosFinanceiros', '#Disciplina'],
  },
  {
    slug: '12-backup',
    label: 'Backup e exportação',
    group: 'Recursos',
    title: 'Seu histórico financeiro, protegido de verdade 🗄️',
    body:
      'Backup automático e exportação em PDF, Excel e JSON: seus dados ficam seguros no seu aparelho e você pode levá-los para onde quiser. Trocou de celular? Seus registros vão com você.',
    hashtags: ['#DiárioDaRiqueza', '#Backup', '#SegurançaDigital', '#OrganizaçãoFinanceira'],
  },
  {
    slug: '13-orcamento',
    label: 'Orçamento',
    group: 'Recursos',
    title: 'Um orçamento que cabe na rotina — e que você realmente mantém 🧾',
    body:
      'Nada de planilha complicada: no Diário da Riqueza você organiza gastos fixos e variáveis, acompanha limites e vê a projeção até a sua meta. Orçamento simples é orçamento que funciona.',
    hashtags: ['#DiárioDaRiqueza', '#Orçamento', '#PlanejamentoFinanceiro', '#GastosFixos'],
  },
  {
    slug: '14-citacao',
    label: 'Citação motivacional',
    group: 'Inspiração',
    title: 'Riqueza se constrói na disciplina de cada dia. 💛',
    body:
      'Não existe atalho: existe constância. Registre, acompanhe, ajuste — todos os dias. É assim que a organização financeira deixa de ser esforço e vira estilo de vida. Salve este post para lembrar. 📌',
    hashtags: ['#DiárioDaRiqueza', '#MindsetFinanceiro', '#Disciplina', '#Motivação'],
  },
  {
    slug: '15-mural-fundadores',
    label: 'Mural dos Fundadores',
    group: 'Comunidade & Apoio',
    title: '75 nomes já fazem parte da história deste projeto 🏛️',
    body:
      'O Mural dos Fundadores eterniza as pessoas que apoiaram o Diário da Riqueza desde o começo — e segue aberto para quem quiser fazer parte. Conheça o projeto, apoie e deixe o seu nome registrado.',
    hashtags: ['#DiárioDaRiqueza', '#MuralDosFundadores', '#Comunidade', '#ApoieOProjeto'],
  },
  {
    slug: '16-apoio-5',
    label: 'Apoio R$ 5',
    group: 'Comunidade & Apoio',
    title: 'Um café que mantém um projeto de pé ☕',
    body:
      'Com R$ 5 você apoia o Diário da Riqueza e ajuda a manter o app no ar: gratuito, sem anúncios e sem cadastro para todo mundo. Feito de forma independente, com muito carinho. Todo apoio conta — muito.',
    hashtags: ['#DiárioDaRiqueza', '#ApoieOProjeto', '#Comunidade', '#Indie'],
  },
  {
    slug: '17-apoio-15',
    label: 'Apoio R$ 15',
    group: 'Comunidade & Apoio',
    title: 'Quer entrar para a história? Por R$ 15 você entra. 📜',
    body:
      'Quem apoia o Diário da Riqueza com R$ 15 ganha um lugar no Mural dos Fundadores: o nome fica eternizado dentro da aplicação, para sempre. Um apoio pequeno, uma marca permanente.',
    hashtags: ['#DiárioDaRiqueza', '#MuralDosFundadores', '#ApoieOProjeto', '#Comunidade'],
  },
  {
    slug: '18-apoio-50',
    label: 'Apoio R$ 50',
    group: 'Comunidade & Apoio',
    title: 'R$ 50 que aceleram o projeto 🚀',
    body:
      'Com R$ 50 de apoio, você entra em destaque no Mural dos Fundadores e ajuda a financiar as próximas funcionalidades do Diário da Riqueza. É o combustível que transforma ideias em recursos de verdade.',
    hashtags: ['#DiárioDaRiqueza', '#ApoieOProjeto', '#MuralDosFundadores', '#Comunidade'],
  },
  {
    slug: '19-fundador-ouro',
    label: 'Fundador Ouro',
    group: 'Comunidade & Apoio',
    title: 'Fundador Ouro: o seu nome eternizado no app 👑',
    body:
      'Por R$ 9,90/mês você se torna Fundador Ouro do Diário da Riqueza: nome eternizado no Mural dos Fundadores, título exclusivo e o apoio que garante a evolução contínua do projeto. Vagas de fundador são para sempre.',
    hashtags: ['#DiárioDaRiqueza', '#FundadorOuro', '#MuralDosFundadores', '#ApoieOProjeto'],
  },
  {
    slug: '20-cta-final',
    label: 'CTA final',
    group: 'Call to action',
    title: 'Comece hoje. É grátis. Leva menos de 1 minuto. ⏱️',
    body:
      '1️⃣ Acesse diariodariqueza.vercel.app\n2️⃣ Toque em “Adicionar à tela inicial”\n3️⃣ Registre a sua primeira entrada\n\nGrátis, offline, sem cadastro. O melhor dia para começar a se organizar foi ontem — o segundo melhor é hoje. Compartilhe com alguém que precisa disso. 🔁',
    hashtags: ['#DiárioDaRiqueza', '#ComeceAgora', '#AppGrátis', '#FinançasPessoais'],
  },
] as const;

/** caminho do ZIP com todo o kit (20 imagens + legendas.md) em /public */
export const MARKETING_ZIP_PATH = '/marketing/kit-divulgacao-diario-da-riqueza.zip';

/** dimensões únicas das artes do kit */
export const MARKETING_SIZE = '1080 × 1080 px';

/** monta o texto completo de uma legenda (formato para colar na rede) */
export function postCaption(post: MarketingPost): string {
  return `${post.title}\n\n${post.body}\n\n${post.hashtags.join(' ')}`;
}

/** gera o conteúdo do arquivo legendas.md a partir dos dados */
export function buildCaptionsMarkdown(): string {
  const head = [
    '# 📱 Legendas — Diário da Riqueza (20 posts prontos)',
    '',
    'Cada legenda já vem com título, texto e exatamente 4 hashtags. Imagens correspondentes no kit (.zip) ou em /marketing/<arquivo>.png.',
    '',
    '---',
    '',
  ].join('\n');
  const body = MARKETING_POSTS.map((p) =>
    [`## ${p.slug}.png`, '', postCaption(p), '', '---', ''].join('\n'),
  ).join('\n');
  return head + '\n' + body;
}
