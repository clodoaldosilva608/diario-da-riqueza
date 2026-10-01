import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  FileText,
  Gavel,
  HandCoins,
  RefreshCcw,
  ScrollText,
  Wallet,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Uso — Diário da Riqueza",
  description:
    "Termos de uso do Diário da Riqueza: ferramenta gratuita de organização pessoal, apoios opcionais via Cakto, cancelamento a qualquer momento. Sem promessas de resultado financeiro.",
  alternates: { canonical: "/termos" },
};

const SECTIONS: {
  id: string;
  icon: typeof ScrollText;
  title: string;
  paragraphs: string[];
  list?: string[];
}[] = [
  {
    id: "servico",
    icon: ScrollText,
    title: "1. O que é o Diário da Riqueza",
    paragraphs: [
      "O Diário da Riqueza é um aplicativo web gratuito de organização pessoal: registro diário, metas, orçamento, estudos e hábitos, com funcionamento offline e dados armazenados no próprio dispositivo do usuário. Ao usar o aplicativo, você concorda com estes Termos e com a nossa Política de Privacidade.",
      "O app é oferecido para uso pessoal e intransferível. Você pode usá-lo quantas vezes quiser, nos dispositivos que lhe pertencem, e exportar seus dados quando desejar — eles são seus em qualquer circunstância.",
    ],
  },
  {
    id: "nao-investimento",
    icon: Gavel,
    title: "2. Não é consultoria nem recomendação financeira",
    paragraphs: [
      "O nome \u201cDiário da Riqueza\u201d descreve o objetivo de construir riqueza com disciplina — e não qualquer promessa de ganho. O aplicativo é uma ferramenta de organização e acompanhamento. Ele não oferece consultoria de investimentos, análise de mercado, recomendação de compra ou venda de ativos, e não substitui um profissional de finanças, contabilidade ou psicologia.",
      "Resultados dependem exclusivamente das suas ações, decisões e contexto pessoal. Nenhum conteúdo do app ou da página de divulgação deve ser interpretado como garantia de rendimento, retorno ou enriquecimento. Se precisar de orientação financeira personalizada, procure um profissional habilitado.",
    ],
  },
  {
    id: "responsabilidade",
    icon: Ban,
    title: "3. Responsabilidade pelo seu conteúdo e backups",
    paragraphs: [
      "Como os dados ficam apenas no seu dispositivo, você é responsável por eles. Recomendamos fortemente o uso das ferramentas de backup e exportação do app (PDF, planilha, pasta no computador) — especialmente antes de limpar dados do navegador, formatar o dispositivo ou trocar de computador.",
      "O app é fornecido \u201cno estado em que se encontra\u201d, com dedicação contínua, mas sem garantia de disponibilidade ininterrupta. Eventuais falhas de navegador, limpeza acidental de dados ou problemas de dispositivo estão fora do nosso controle — é exatamente para isso que existem os backups.",
    ],
  },
  {
    id: "apoios",
    icon: HandCoins,
    title: "4. Apoios e assinatura Fundador",
    paragraphs: [
      "O uso do aplicativo é gratuito e completo. Os apoios existem para quem quer sustentar o projeto: valores únicos (R$ 5, R$ 15 e R$ 50) ou a assinatura mensal Apoiador Fundador (R$ 9,90/mês). A assinatura dá direito ao nome no Mural dos Fundadores enquanto estiver ativa.",
      "O processamento de todos os pagamentos é feito pela Cakto, nossa plataforma de pagamentos. As regras de cobrança, segurança de transação e reembolso seguem as políticas da Cakto aplicáveis a cada meio de pagamento.",
    ],
    list: [
      "A assinatura é mensal e renovada automaticamente até o cancelamento;",
      "Você pode cancelar a qualquer momento, direto na plataforma de pagamento ou pelo nosso canal de contato — o nome sai do mural após o fim do ciclo já pago;",
      "Apoios pontuais são contribuições voluntárias e não geram cobranças futuras;",
      "Em caso de cobrança em duplicidade ou erro de transação, entre em contato que resolvemos junto à Cakto.",
    ],
  },
  {
    id: "mural",
    icon: Wallet,
    title: "5. Mural dos Fundadores",
    paragraphs: [
      "Apoiadores com assinatura ativa aparecem no mural público com o nome abreviado. Assinaturas canceladas, pausadas ou inadimplentes (após o período de carência) saem do mural automaticamente. A participação é opcional: basta pedir a remoção pelo canal de contato.",
      "Reservamo-nos o direito de remover do mural nomes usados de má-fé, com conteúdo ofensivo ou que caracterizem tentativa de se passar por outra pessoa.",
    ],
  },
  {
    id: "mudancas",
    icon: RefreshCcw,
    title: "6. Mudanças nestes Termos",
    paragraphs: [
      "O projeto evolui com o apoio da comunidade, e estes Termos podem ser atualizados para refletir novos recursos ou orientações. A versão vigente estará sempre nesta página, com a data de revisão indicada. Mudanças que afetem assinaturas serão comunicadas com antecedência razoável pelo canal disponível (e-mail cadastrado na plataforma de pagamento).",
      "Se após uma mudança você não concordar com os novos termos, pode encerrar o uso do app e, sendo apoiador, cancelar a assinatura sem custo adicional.",
    ],
  },
  {
    id: "contato-termos",
    icon: FileText,
    title: "7. Contato",
    paragraphs: [
      "Questões sobre estes Termos, cobranças, cancelamentos ou o mural de fundadores: clodoaldo608@gmail.com. Respondemos com atenção — o projeto vive do relacionamento direto com quem o sustenta.",
    ],
  },
];

const UPDATED = "outubro de 2026";

export default function TermosPage() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para o início
        </Link>

        <header className="mt-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Transparência
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            Termos de <span className="gold-gradient-text">Uso</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Regras claras e diretas para usar o Diário da Riqueza e, se fizer
            sentido para você, apoiar o projeto. Escritos em linguagem humana —
            porque confiança se constrói com transparência, não com cláusulas
            escondidas.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Última atualização: {UPDATED}.
          </p>
        </header>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-titulo`}
              className="scroll-mt-20 rounded-3xl border border-border bg-card p-6 sm:p-8"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
                  <s.icon className="h-5 w-5 text-gold" aria-hidden="true" />
                </span>
                <h2 id={`${s.id}-titulo`} className="font-display text-xl font-bold sm:text-2xl">
                  {s.title}
                </h2>
              </div>
              <div className="mt-4 space-y-4">
                {s.paragraphs.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {p}
                  </p>
                ))}
                {s.list ? (
                  <ul className="space-y-2 pl-1">
                    {s.list.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground sm:text-base"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-10 border-t border-border/60 pt-6 text-sm text-muted-foreground">
          <p>
            Veja também a{" "}
            <Link href="/privacidade" className="text-gold underline-offset-4 hover:underline">
              Política de Privacidade
            </Link>
            . O compromisso com a transparência também está resumido na seção{" "}
            <Link href="/#transparencia" className="text-gold underline-offset-4 hover:underline">
              O que a ferramenta não promete
            </Link>{" "}
            da página inicial.
          </p>
        </footer>
      </div>
    </main>
  );
}
