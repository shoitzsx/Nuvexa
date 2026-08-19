import { KeyRound, Link as LinkIcon, LogIn, UserPlus } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/Button";
import {
  type FeedbackMessage,
  InlineFeedback,
} from "../components/InlineFeedback";
import { SetupNotice } from "../components/SetupNotice";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import { getAuthErrorMessage } from "../lib/authErrors";
import { isSupabaseConfigured } from "../lib/supabase";

type AuthMode = "login" | "signup" | "magic";

interface LocationState {
  notice?: string;
}

function getModeLabel(mode: AuthMode) {
  if (mode === "signup") {
    return "Criar conta";
  }

  if (mode === "magic") {
    return "Magic link";
  }

  return "Entrar";
}

export function LoginPage() {
  const { loading, sendMagicLink, signInWithPassword, signUpWithPassword, user } =
    useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  useEffect(() => {
    const accountDeletionNotice = window.localStorage.getItem(
      "finantrack.accountDeletionNotice",
    );

    if (accountDeletionNotice) {
      window.localStorage.removeItem("finantrack.accountDeletionNotice");
      toast.success(accountDeletionNotice, { id: "account-deleted" });
      setFeedback({
        type: "success",
        message: accountDeletionNotice,
      });
      return;
    }

    if (locationState?.notice) {
      toast.success(locationState.notice, { id: "auth-notice" });
      setFeedback({
        type: "success",
        message: locationState.notice,
      });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, locationState, navigate]);

  const passwordIsRequired = mode !== "magic";

  const modeConfig = useMemo(
    () => ({
      login: {
        icon: <LogIn aria-hidden="true" size={18} />,
        submitLabel: "Entrar",
      },
      signup: {
        icon: <UserPlus aria-hidden="true" size={18} />,
        submitLabel: "Criar conta",
      },
      magic: {
        icon: <LinkIcon aria-hidden="true" size={18} />,
        submitLabel: "Enviar link",
      },
    }),
    [],
  );

  if (!loading && user) {
    return <Navigate replace to="/dashboard" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!email.includes("@")) {
      toast.error("Informe um email válido.", { id: "auth-validation-error" });
      setFeedback({
        type: "error",
        message: "Informe um email válido.",
      });
      return;
    }

    if (passwordIsRequired && password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.", {
        id: "auth-validation-error",
      });
      setFeedback({
        type: "error",
        message: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    setSubmitting(true);

    const result =
      mode === "login"
        ? await signInWithPassword(email, password)
        : mode === "signup"
          ? await signUpWithPassword(email, password)
          : await sendMagicLink(email);

    setSubmitting(false);

    if (result.error) {
      const message = getAuthErrorMessage(result.error.message);
      toast.error(message, { id: "auth-error" });
      setFeedback({
        type: "error",
        message,
      });
      return;
    }

    if (mode === "login") {
      toast.success("Bem-vindo de volta!", { id: "login-success" });
      navigate("/dashboard", { replace: true });
      return;
    }

    const successMessage =
      mode === "signup"
        ? "Conta criada. Verifique seu email para continuar."
        : "Magic link enviado para seu email.";
    toast.success(successMessage, { id: "auth-success" });
    setFeedback({
      type: "success",
      message: successMessage,
    });
  }

  return (
    <main className="screen-enter min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <Link
            className="text-xl font-bold tracking-normal text-slate-950 dark:text-white"
            to="/login"
          >
            NUVEXA
          </Link>
          <ThemeToggle />
        </header>

        <div className="grid min-h-[calc(100vh-8rem)] items-center gap-8 lg:grid-cols-[1fr_420px]">
          <section className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100">
              <KeyRound aria-hidden="true" size={18} />
              Gestão financeira pessoal
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-normal text-slate-950 dark:text-white sm:text-5xl">
              NUVEXA
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Organize receitas, despesas e compromissos em uma visão clara,
              privada e segura.
            </p>
            <div className="mt-6">
              <Link
                className="text-sm font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-100"
                to="/privacy"
              >
                Política de Privacidade
              </Link>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                {getModeLabel(mode)}
              </h2>
            </div>

            <div
              aria-label="Modo de autenticação"
              className="mb-5 grid grid-cols-3 rounded-md bg-slate-100 p-1 dark:bg-slate-950"
              role="group"
            >
              {(["login", "signup", "magic"] as AuthMode[]).map((item) => (
                <button
                  aria-pressed={mode === item}
                  className={`min-h-10 rounded px-2 text-sm font-semibold transition ${
                    mode === item
                      ? "bg-white text-brand-600 shadow-sm dark:bg-slate-800 dark:text-brand-100"
                      : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                  }`}
                  key={item}
                  onClick={() => {
                    setMode(item);
                    setFeedback(null);
                  }}
                  type="button"
                >
                  {getModeLabel(item)}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <SetupNotice />
            </div>

            <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
                <input
                  autoComplete="email"
                  className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 transition placeholder:text-slate-400 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@email.com"
                  type="email"
                  value={email}
                />
              </label>

              {passwordIsRequired ? (
                <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Senha
                  <input
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 transition placeholder:text-slate-400 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    type="password"
                    value={password}
                  />
                </label>
              ) : null}

              <InlineFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

              <Button
                disabled={!isSupabaseConfigured}
                icon={modeConfig[mode].icon}
                isLoading={submitting}
                type="submit"
              >
                {modeConfig[mode].submitLabel}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
