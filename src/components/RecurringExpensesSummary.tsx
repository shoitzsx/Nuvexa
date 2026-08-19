import { Repeat2 } from "lucide-react";
import { formatCurrency } from "../lib/formatters";
import type { Transaction } from "../types/transactions";

export function RecurringExpensesSummary({ transactions }: { transactions: Transaction[] }) {
  const month = new Date().toISOString().slice(0, 7);
  const total = transactions.filter((transaction) => transaction.type === "expense" && transaction.recurring_expense_id && transaction.date.startsWith(month)).reduce((sum, transaction) => sum + transaction.amount, 0);

  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><div className="rounded-md bg-negative-50 p-2 text-negative-600 dark:bg-negative-600/15 dark:text-negative-100"><Repeat2 aria-hidden="true" size={22} /></div><div><h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Despesas fixas neste mês</h2><p className="mt-1 text-2xl font-bold text-negative-600 dark:text-negative-100">{formatCurrency(total)}</p></div></div><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Total calculado apenas pelas ocorrências registradas.</p></section>;
}