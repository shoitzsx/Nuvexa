import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import logo from "../../logo.png";

// Conteúdo provisório (somente local): a política definitiva depende da nova
// implementação e de revisão jurídica.
export function PrivacyPage() {
  return (
    <main className="screen-enter min-h-screen bg-[#f7fbfc] px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto grid w-full max-w-3xl gap-10">
        <header className="flex items-center justify-between">
          <Link aria-label="Nuvexa: página inicial" className="rounded-md bg-white px-2 py-1 shadow-sm" to="/">
            <img alt="Nuvexa" className="h-8 w-auto" src={logo} />
          </Link>
          <ThemeToggle />
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-cyan-50 p-2 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">
              <ShieldCheck aria-hidden="true" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Política de Privacidade</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Documento em revisão.</p>
            </div>
          </div>
          <p className="mt-6 leading-7 text-slate-600 dark:text-slate-300">
            A Nuvexa está sendo reconstruída. A política de privacidade definitiva será publicada junto com a nova
            plataforma, descrevendo quais dados são coletados, como são usados, protegidos e excluídos.
          </p>
        </section>
      </div>
    </main>
  );
}
