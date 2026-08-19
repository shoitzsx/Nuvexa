import { CircleDollarSign, Repeat2, Sparkles } from "lucide-react";
import { formatCurrency } from "../lib/formatters";
import type { IncomeSource } from "../types/incomeSources";
import type { Transaction } from "../types/transactions";

interface IncomeSourcesSummaryProps {
  incomeSources: IncomeSource[];
  transactions: Transaction[];
}

export function IncomeSourcesSummary({
  incomeSources,
  transactions,
}: IncomeSourcesSummaryProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const totals = new Map<string, number>();

  transactions
    .filter(
      (transaction) =>
        transaction.type === "income" &&
        transaction.date.startsWith(currentMonth) &&
        transaction.income_source_id,
    )
    .forEach((transaction) => {
      const sourceId = transaction.income_source_id as string;
      totals.set(sourceId, (totals.get(sourceId) ?? 0) + transaction.amount);
    });

  const sourceTotals = incomeSources
    .map((source) => ({ source, total: totals.get(source.id) ?? 0 }))
    .filter((item) => item.total > 0)
    .sort((left, right) => right.total - left.total);
  const recurringTotal = sourceTotals
    .filter((item) => item.source.recurrence_type === "recurring")
    .reduce((total, item) => total + item.total, 0);
  const eventualTotal = sourceTotals
    .filter((item) => item.source.recurrence_type === "eventual")
    .reduce((total, item) => total + item.total, 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Receitas por fonte neste mês
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Entradas associadas a uma fonte de renda.
          </p>
        </div>
        <CircleDollarSign aria-hidden="true" className="text-positive-600 dark:text-positive-100" size={24} />
      </div>

      {sourceTotals.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Nenhuma receita associada a uma fonte de renda neste mês.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-positive-50 p-3 dark:bg-positive-600/15">
              <div className="flex items-center gap-2 text-sm font-medium text-positive-600 dark:text-positive-100">
                <Repeat2 aria-hidden="true" size={16} /> Recorrente
              </div>
              <p className="mt-2 text-lg font-bold text-positive-600 dark:text-positive-100">
                {formatCurrency(recurringTotal)}
              </p>
            </div>
            <div className="rounded-md bg-brand-50 p-3 dark:bg-brand-600/15">
              <div className="flex items-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-100">
                <Sparkles aria-hidden="true" size={16} /> Eventual
              </div>
              <p className="mt-2 text-lg font-bold text-brand-600 dark:text-brand-100">
                {formatCurrency(eventualTotal)}
              </p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {sourceTotals.map(({ source, total }) => (
              <div className="flex items-center justify-between gap-4 py-3" key={source.id}>
                <div>
                  <p className="font-medium text-slate-950 dark:text-white">{source.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{source.category}</p>
                </div>
                <span className="font-semibold text-positive-600 dark:text-positive-100">
                  {formatCurrency(total)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}