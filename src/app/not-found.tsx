import Link from "next/link";
import { BookOpenCheck, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10">
          <Compass className="h-7 w-7 text-gold" aria-hidden="true" />
        </span>
        <p className="mt-5 font-display text-6xl font-black gold-gradient-text">404</p>
        <h1 className="mt-3 font-display text-2xl font-bold">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          O endereço que você tentou abrir não existe ou mudou de lugar. O
          Diário da Riqueza continua no mesmo lugar de sempre — direto do início.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          Ir para o Diário da Riqueza
        </Link>
      </div>
    </main>
  );
}
