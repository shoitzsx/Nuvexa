import { PiggyBank } from "lucide-react";
import { calculateSavingsGoalBalance } from "../lib/savingsGoalBalance";
import { formatCurrency } from "../lib/formatters";
import type { SavingsGoal, SavingsTransaction } from "../types/savingsGoals";

export function SavingsGoalsSummary({ goals, savingsTransactions }: { goals: SavingsGoal[]; savingsTransactions: SavingsTransaction[] }) {
  const activeGoals = goals.filter((goal) => goal.status === "active");
  const items = activeGoals.map((goal) => ({ goal, balance: calculateSavingsGoalBalance(goal, savingsTransactions) }));
  const totalSaved = items.reduce((total, item) => total + item.balance.savedAmount, 0);

  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><div className="rounded-md bg-positive-50 p-2 text-positive-600 dark:bg-positive-600/15 dark:text-positive-100"><PiggyBank aria-hidden="true" size={22} /></div><div><h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total guardado em metas ativas</h2><p className="mt-1 text-2xl font-bold text-positive-600 dark:text-positive-100">{formatCurrency(totalSaved)}</p></div></div>{items.length ? <div className="mt-4 grid gap-3">{items.map(({ goal, balance }) => <div key={goal.id}><div className="flex justify-between gap-3 text-sm"><span className="font-medium text-slate-950 dark:text-white">{goal.name}</span><span className="text-slate-500 dark:text-slate-400">{balance.percentageComplete.toFixed(0)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-positive-600" style={{ width: `${balance.percentageComplete}%` }} /></div></div>)}</div> : <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Nenhuma meta ativa.</p>}</section>;
}