import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isSupabaseConfigured } from "../lib/supabase";
import { SetupNotice } from "./SetupNotice";

export function ProtectedRoute() {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
        <SetupNotice />
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm shadow-soft dark:border-slate-800 dark:bg-slate-900">
          Carregando sessão
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
}
