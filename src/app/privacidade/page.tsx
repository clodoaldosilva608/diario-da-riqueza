import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Database,
  FileText,
  HandCoins,
  Mail,
  MonitorSmartphone,
  ShieldCheck,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade — Diário da Riqueza",
  description:
    "Como o Diário da Riqueza trata seus dados: tudo fica no seu dispositivo, sem cadastro em servidor. Transparência total sobre pagamentos, mural de fundadores e LGPD.",
  alternates: { canonical: "/privacidade" },
};

const SECTIONS: {
  id: string;
  icon: typeof Database;
  title: string;
  paragraphs: string[];
  list?: string[];
}[] = [
  {
    id: "dados-locais",
    icon: Database,
    title: "1. Seus dados ficam no seu dispositivo",
    paragraphs: [
      "O Diário da Riqueza foi construído com uma arquitetura local-first: todos os registros que você cria — entradas do diário, sonhos, metas, orçamento, estudos, anexos e progresso — são gravados exclusivamente no armazenamento do seu próprio navegador (IndexedDB). Não existe servidor de aplicação recebendo, armazenando ou processando o conteúdo que você escreve.",
      "Isso significa que ninguém — nem mesmo os criadores do projeto — consegue ler suas anotações, ver seus valores financeiros ou saber quais hábitos você está construindo. Sua privacidade não é uma promessa de política: é a forma como a tecnologia foi projetada. Se você trocar de dispositivo ou limpar os dados do navegador, os registros não nos acompanham — por isso recomendamos os backups e exportações disponíveis dentro do próprio app.",
    ],
    list: [
      "Não coletamos e-mail, telefone, CPF nem dados sensíveis pelo aplicativo;",
      "Não usamos cookies de publicidade nem rastreadores de terceiros;",
      "Não vendemos, alugamos ou compartilhamos dados — não há dados conosco para compartilhar.",
    ],
  },
  {
    id: "preferencias",
    icon: MonitorSmartphone,
    title: "2. Preferências locais (localStorage)",
    paragraphs: [
      "Para que a experiência seja agradável, o app guarda no seu dispositivo algumas preferências de uso: tema escolhido (escuro ou claro), ano em foco, configurações de lembretes e o estado do onboarding. Essas informações permanecem no seu navegador e nunca são transmitidas para fora dele.",
      "Você pode apagar tudo isso a qualquer momento: nas Configurações do app existem opções de backup, exportação e limpeza de dados. Ao limpar os dados do site no seu navegador, todo o conteúdo e as preferências são removidos de forma definitiva.",
    ],
  },
  {
    id: "pagamentos",
    icon: HandCoins,
    title: "3. Apoios e pagamentos (Cakto)",
    paragraphs: [
      "O Diário da Riqueza é gratuito. Quem quiser fortalecer o projeto pode fazer um apoio pontual ou assinar o plano Apoiador Fundador. Todo o processamento de pagamento é realizado pela Cakto, plataforma especializada que atua como intermediadora da cobrança.",
      "Quando você escolhe apoiar, os dados de pagamento (cartão, Pix ou boleto) são fornecidos diretamente à Cakto, sob as próprias políticas de privacidade e segurança dela. Nós não vemos e não armazenamos número de cartão, dados bancários completos ou informações de cobrança.",
      "Da Cakto recebemos apenas a confirmação da operação e o mínimo necessário para reconhecer o apoio: o nome do apoiador, o produto apoiado e o status da assinatura. Usamos essas informações exclusivamente para exibir o mural de fundadores e prestar o suporte adequado.",
    ],
  },
  {
    id: "mural",
    icon: Users,
    title: "4. Mural dos Fundadores",
    paragraphs: [
      "Apoiadores do plano Fundador podem aparecer no mural público da landing page. Por respeito à privacidade, o mural exibe apenas o nome em formato abreviado (por exemplo, \u201cMaria S.\u201d), o mês de entrada e o tempo de recorrência — nunca e-mail, documento, valores pagos ou dados de contato.",
      "Se você é apoiador e prefere não aparecer no mural, ou deseja alterar a forma como seu nome é exibido, basta nos avisar pelo canal de contato abaixo que ajustamos ou removemos seu nome em até 7 dias.",
    ],
  },
  {
    id: "lgpd",
    icon: ShieldCheck,
    title: "5. Seus direitos (LGPD)",
    paragraphs: [
      "A Lei Geral de Proteção de Dados (Lei nº 13.709/2018) garante ao titular uma série de direitos: confirmação de tratamento, acesso, correção, anonimização, portabilidade e eliminação dos dados. Como o conteúdo que você cria nunca sai do seu dispositivo, na prática você já exerce o controle total: pode acessar, exportar, corrigir e apagar tudo diretamente no app, sem precisar pedir nada a ninguém.",
      "Os únicos dados fora do seu dispositivo são os relacionados a apoios (tratados pela Cakto) e o nome abreviado do mural, quando aplicável. Para exercer qualquer direito sobre esses dados — acesso, correção ou exclusão —, fale conosco pelo canal de contato e responderemos em até 15 dias.",
    ],
  },
  {
    id: "contato",
    icon: Mail,
    title: "6. Contato",
    paragraphs: [
      "Dúvidas sobre esta política, pedidos relacionados ao mural de fundadores ou qualquer assunto de privacidade podem ser enviados para clodoaldo608@gmail.com. Este documento pode ser atualizado para refletir melhorias no projeto; a data da última revisão está indicada abaixo e mudanças relevantes serão comunicadas nesta mesma página.",
    ],
  },
];

const UPDATED = "outubro de 2026";

export default function PrivacidadePage() {
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
            Política de <span className="gold-gradient-text">Privacidade</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            A regra é simples: <strong className="text-foreground">seus dados são seus</strong>. O
            Diário da Riqueza funciona localmente no seu dispositivo e não mantém
            servidor com o conteúdo dos usuários. Esta página explica, sem
            juridiquês, exatamente como isso funciona — incluindo o que acontece
            quando você decide apoiar o projeto.
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
            Leia também os{" "}
            <Link href="/termos" className="text-gold underline-offset-4 hover:underline">
              Termos de Uso
            </Link>
            . Dúvidas rápidas? A seção{" "}
            <Link href="/#privacidade" className="text-gold underline-offset-4 hover:underline">
              Privacidade
            </Link>{" "}
            da página inicial resume estes pontos.
          </p>
        </footer>
      </div>
    </main>
  );
}
