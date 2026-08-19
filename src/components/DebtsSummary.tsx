import { HandCoins } from "lucide-react";
import { calculateDebtBalance } from "../lib/debtBalance";
import { formatCurrency } from "../lib/formatters";
import type { Debt } from "../types/debts";
import type { Transaction } from "../types/transactions";

export function DebtsSummary({ debts, transactions }: { debts: Debt[]; transactions: Transaction[] }) {
  const activeDebts = debts.filter((debt) => debt.status === "active");
  const items = activeDebts.map((debt) => ({ debt, balance: calculateDebtBalance(debt, transactions) }));
  const total = items.reduce((sum, item) => sum + item.balance.remaining, 0);
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><div className="rounded-md bg-negative-50 p-2 text-negative-600 dark:bg-negative-600/15 dark:text-negative-100"><HandCoins aria-hidden="true" size={22} /></div><div><h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total devido</h2><p className="mt-1 text-2xl font-bold text-negative-600 dark:text-negative-100">{formatCurrency(total)}</p></div></div>{items.length ? <div className="mt-4 grid gap-3">{items.map(({ debt, balance }) => <div key={debt.id}><div className="flex justify-between gap-3 text-sm"><span className="font-medium text-slate-950 dark:text-white">{debt.name}</span><span className="text-slate-500 dark:text-slate-400">{formatCurrency(balance.remaining)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-positive-600" style={{ width: `${balance.percentagePaid}%` }} /></div></div>)}</div> : <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Nenhuma dívida ativa.</p>}</section>;
}
