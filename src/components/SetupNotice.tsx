import { AlertTriangle } from "lucide-react";
import { isSupabaseConfigured } from "../lib/supabase";

export function SetupNotice() {
  if (isSupabaseConfigured) {
    return null;
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={20} />
        <div>
          <h2 className="font-semibold">Site temporariamente indisponível</h2>
          <p className="mt-1 leading-6">
            Não foi possível carregar os serviços necessários para continuar.
            Tente novamente mais tarde.
          </p>
        </div>
      </div>
    </section>
  );
}
