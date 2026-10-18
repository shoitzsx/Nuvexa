import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import logo from "../../logo.png";

// Página provisória (somente local) enquanto o novo acesso é construído.
export function AccessComingSoonPage() {
  return (
    <main className="screen-enter min-h-screen bg-[#f7fbfc] px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-16">
        <header className="flex items-center justify-between">
          <Link aria-label="Nuvexa: página inicial" className="rounded-md bg-white px-2 py-1 shadow-sm" to="/">
            <img alt="Nuvexa" className="h-8 w-auto" src={logo} />
          </Link>
          <ThemeToggle />
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Em construção</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">O acesso à Nuvexa está chegando.</h1>
          <p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-300">
            Estamos construindo a nova plataforma. O cadastro e o login ainda não estão disponíveis.
          </p>
          <Link
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-cyan-700 dark:bg-cyan-400 dark:text-slate-950"
            to="/"
          >
            <ArrowLeft size={18} /> Voltar para o início
          </Link>
        </section>
      </div>
    </main>
  );
}
