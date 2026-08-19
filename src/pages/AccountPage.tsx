import { ShieldAlert, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/Button";
import {
  type FeedbackMessage,
  InlineFeedback,
} from "../components/InlineFeedback";
import { useAuth } from "../hooks/useAuth";
import { getAuthErrorMessage } from "../lib/authErrors";
import { supabase } from "../lib/supabase";

export function AccountPage() {
  const { clearLocalSession, user } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const canDelete = confirmation === "EXCLUIR";

  async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canDelete) {
      toast.error("Digite EXCLUIR para confirmar.", {
        id: "account-delete-validation-error",
      });
      setFeedback({
        type: "error",
        message: "Digite EXCLUIR para confirmar.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const { error } = await supabase.rpc("delete_current_user");

    if (error) {
      setSubmitting(false);
      const message = getAuthErrorMessage(error.message);
      toast.error(message, { id: "account-delete-error" });
      setFeedback({
        type: "error",
        message,
      });
      return;
    }

    toast.info("Conta e dados financeiros removidos.", { id: "account-deleted" });
    clearLocalSession();
    navigate("/login", {
      replace: true,
    });
  }

  return (
    <div className="grid gap-6">
      <section>
        <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-white">
          Conta
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {user?.email}
        </p>
      </section>

      <section className="rounded-lg border border-negative-100 bg-white p-6 shadow-sm dark:border-negative-600/30 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-negative-50 p-2 text-negative-600 dark:bg-negative-600/15 dark:text-negative-100">
            <ShieldAlert aria-hidden="true" size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              Excluir minha conta
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Ao confirmar, sua conta e suas transações serão removidas
              definitivamente. A ação não pode ser desfeita.
            </p>
          </div>
        </div>

        <form className="mt-6 grid max-w-xl gap-4" onSubmit={handleDeleteAccount}>
          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Confirmação
            <input
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 transition placeholder:text-slate-400 focus:border-negative-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Digite EXCLUIR"
              value={confirmation}
            />
          </label>

          <InlineFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

          <Button
            disabled={!canDelete}
            icon={<Trash2 aria-hidden="true" size={18} />}
            isLoading={submitting}
            type="submit"
            variant="danger"
          >
            Excluir minha conta
          </Button>
        </form>
      </section>
    </div>
  );
}
