import { AlertTriangle, Bell, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/Button";
import { useAlertDismissals } from "../hooks/useAlertDismissals";
import { useCreditCards } from "../hooks/useCreditCards";
import { useDebts } from "../hooks/useDebts";
import { useIncomeSources } from "../hooks/useIncomeSources";
import { useRecurringExpenses } from "../hooks/useRecurringExpenses";
import { useSavingsGoals } from "../hooks/useSavingsGoals";
import { useTransactions } from "../hooks/useTransactions";
import { getFinancialAlerts } from "../lib/alertsEngine";

export function AlertsPage() {
  const { creditCards, invoices } = useCreditCards(); const { recurringExpenses } = useRecurringExpenses(); const { debts } = useDebts(); const { goals, savingsTransactions } = useSavingsGoals(); const { incomeSources } = useIncomeSources(); const { transactions } = useTransactions(); const { dismissals, dismissAlert } = useAlertDismissals();
  const dismissed = new Set(dismissals.map((dismissal) => dismissal.alert_key)); const alerts = getFinancialAlerts({ creditCards, invoices, recurringExpenses, debts, goals, savingsTransactions, incomeSources, transactions }).filter((alert) => !dismissed.has(alert.key));
  async function dismiss(key: string) { try { await dismissAlert(key); toast.success("Alerta descartado.", { id: `dismissed:${key}` }); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível descartar o alerta.", { id: `dismiss-error:${key}` }); } }
  return <div className="grid gap-6"><section><div className="flex items-center gap-2"><Bell aria-hidden="true" size={24} /><h1 className="text-2xl font-bold text-slate-950 dark:text-white">Alertas</h1></div><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Avisos informativos calculados a partir dos seus dados cadastrados.</p></section><section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">{alerts.length === 0 ? <div className="flex min-h-40 flex-col items-center justify-center text-center"><CheckCircle2 aria-hidden="true" className="text-positive-600" size={30} /><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Nenhum alerta no momento.</p></div> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{alerts.map((alert) => <article className="flex items-start justify-between gap-4 py-4 first:pt-0" key={alert.key}><div className="flex gap-3"><AlertTriangle aria-hidden="true" className={alert.severity === "attention" ? "text-amber-600" : "text-brand-600"} size={20} /><div><h2 className="font-semibold text-slate-950 dark:text-white">{alert.title}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{alert.message}</p></div></div><Button aria-label="Descartar alerta" className="min-h-10 px-3" icon={<X aria-hidden="true" size={16} />} onClick={() => dismiss(alert.key)} variant="ghost">Descartar</Button></article>)}</div>}</section><p className="text-xs text-slate-500 dark:text-slate-400">Despesas fixas e dívidas não possuem status de pagamento neste momento; por isso, os avisos indicam proximidade de vencimento, não contas pendentes.</p></div>;
}