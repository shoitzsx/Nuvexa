import { BarChart3, Bell, CalendarDays, CreditCard, HandCoins, Layers3, LayoutDashboard, LogOut, PiggyBank, Repeat2, ShieldCheck, TrendingUp, UserRound, WalletCards } from "lucide-react";
import { motion } from "framer-motion";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "./Button";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import logo from "../../logo.png";

const navLinkBase =
  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors";

export function AppLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    const { error } = await signOut();

    if (error) {
      toast.error("Não foi possível sair da sua conta.", { id: "logout-error" });
      return;
    }

    toast.info("Você saiu da sua conta.", { id: "logout-success" });
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex rounded-md bg-white p-1.5 shadow-sm">
                <img alt="Nuvexa" className="h-8 w-auto" src={logo} />
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {user?.email}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ThemeToggle />
              <Button
                icon={<LogOut aria-hidden="true" size={18} />}
                onClick={handleSignOut}
                variant="secondary"
              >
                Sair
              </Button>
            </div>
          </div>

          <nav aria-label="Navegação principal" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <NavLink
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`
              }
              to="/dashboard"
            >
              <LayoutDashboard aria-hidden="true" size={18} />
              Dashboard
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`
              }
              to="/privacy"
            >
              <ShieldCheck aria-hidden="true" size={18} />
              Privacidade
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`
              }
              to="/account"
            >
              <UserRound aria-hidden="true" size={18} />
              Conta
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`
              }
              to="/income-sources"
            >
              <WalletCards aria-hidden="true" size={18} />
              Fontes de renda
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`
              }
              to="/recurring-expenses"
            >
              <Repeat2 aria-hidden="true" size={18} />
              Despesas fixas
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`
              }
              to="/credit-cards"
            >
              <CreditCard aria-hidden="true" size={18} />
              Cartões
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`
              }
              to="/installments"
            >
              <Layers3 aria-hidden="true" size={18} />
              Parcelamentos
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`
              }
              to="/debts"
            >
              <HandCoins aria-hidden="true" size={18} />
              Dívidas
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`
              }
              to="/savings-goals"
            >
              <PiggyBank aria-hidden="true" size={18} />
              Metas
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`
              }
              to="/financial-projection"
            >
              <TrendingUp aria-hidden="true" size={18} />
              Projeção
            </NavLink>
            <NavLink
              className={({ isActive }) => `${navLinkBase} ${isActive ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`}
              to="/calendar"
            >
              <CalendarDays aria-hidden="true" size={18} />
              Calendário
            </NavLink>
            <NavLink
              className={({ isActive }) => `${navLinkBase} ${isActive ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`}
              to="/alerts"
            >
              <Bell aria-hidden="true" size={18} />
              Alertas
            </NavLink>
            <NavLink
              className={({ isActive }) => `${navLinkBase} ${isActive ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`}
              to="/reports"
            >
              <BarChart3 aria-hidden="true" size={18} />
              Relatórios
            </NavLink>
          </nav>
        </div>
      </header>

      <motion.main
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <Outlet />
      </motion.main>
    </div>
  );
}
