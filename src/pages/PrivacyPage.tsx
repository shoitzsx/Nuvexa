import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import logo from "../../logo.png";

export function PrivacyPage() {
  const { user } = useAuth();

  return (
    <main className="screen-enter min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto grid w-full max-w-4xl gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link aria-label="Nuvexa: página inicial" className="rounded-md bg-white p-1.5 shadow-sm" to={user ? "/dashboard" : "/"}>
            <img alt="Nuvexa" className="h-8 w-auto" src={logo} />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              to={user ? "/dashboard" : "/login"}
            >
              {user ? "Dashboard" : "Entrar"}
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <section className="flex items-start gap-3">
          <div className="rounded-md bg-brand-50 p-2 text-brand-600 dark:bg-brand-600/15 dark:text-brand-100">
            <ShieldCheck aria-hidden="true" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-white">
              Política de Privacidade
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Como protegemos as informações da sua conta.
            </p>
          </div>
        </section>

        <section className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-950 [&_h2]:dark:text-white [&_p]:leading-7">
          <div>
            <h2>Dados coletados</h2>
            <p className="mt-2">
              A Nuvexa coleta o email usado para autenticação e as transações
              financeiras cadastradas pelo usuário, incluindo descrição, valor,
              tipo, categoria, data e observação opcional.
            </p>
          </div>

          <div>
            <h2>Uso dos dados</h2>
            <p className="mt-2">
              Os dados são usados para autenticação, listagem de movimentações,
              cálculo de indicadores e geração dos gráficos do dashboard.
            </p>
          </div>

          <div>
            <h2>Compartilhamento</h2>
            <p className="mt-2">
              Os dados cadastrados não são compartilhados com terceiros pelo
              Nuvexa. Eles são usados apenas para manter sua conta e suas
              movimentações disponíveis com segurança.
            </p>
          </div>

          <div>
            <h2>Segurança</h2>
            <p className="mt-2">
              Cada transação é associada ao usuário autenticado. As regras de
              segurança impedem leitura, criação, edição ou exclusão de dados
              pertencentes a outro usuário.
            </p>
          </div>

          <div>
            <h2>Exclusão</h2>
            <p className="mt-2">
              A tela Conta permite excluir a conta. O processo remove as
              transações financeiras associadas e encerra o acesso do usuário.
            </p>
          </div>

          <div>
            <h2>Revisão jurídica</h2>
            <p className="mt-2">
              Antes do lançamento comercial oficial, busque revisão jurídica
              especializada para adequar a política às obrigações aplicáveis.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
