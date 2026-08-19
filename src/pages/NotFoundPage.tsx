import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="screen-enter flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold tracking-normal">Página não encontrada</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          O endereço acessado não existe na Nuvexa.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          to="/dashboard"
        >
          Voltar ao dashboard
        </Link>
      </section>
    </main>
  );
}
