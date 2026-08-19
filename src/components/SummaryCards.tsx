import {
  ArrowDownCircle,
  ArrowUpCircle,
  ListChecks,
  WalletCards,
} from "lucide-react";
import { formatCurrency } from "../lib/formatters";
import type { Transaction } from "../types/transactions";

interface SummaryCardsProps {
  transactions: Transaction[];
}

function sumByType(transactions: Transaction[], type: "income" | "expense") {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amount, 0);
}

export function SummaryCards({ transactions }: SummaryCardsProps) {
  const income = sumByType(transactions, "income");
  const expense = sumByType(transactions, "expense");
  const balance = income - expense;

  const cards = [
    {
      label: "Receitas - Despesas",
      value: formatCurrency(balance),
      icon: WalletCards,
      color:
        balance >= 0
          ? "text-positive-600 dark:text-positive-100"
          : "text-negative-600 dark:text-negative-100",
      iconBg:
        balance >= 0
          ? "bg-positive-50 dark:bg-positive-600/15"
          : "bg-negative-50 dark:bg-negative-600/15",
    },
    {
      label: "Soma das entradas",
      value: formatCurrency(income),
      icon: ArrowUpCircle,
      color: "text-positive-600 dark:text-positive-100",
      iconBg: "bg-positive-50 dark:bg-positive-600/15",
    },
    {
      label: "Soma das saídas",
      value: formatCurrency(expense),
      icon: ArrowDownCircle,
      color: "text-negative-600 dark:text-negative-100",
      iconBg: "bg-negative-50 dark:bg-negative-600/15",
    },
    {
      label: "Movimentações",
      value: String(transactions.length),
      icon: ListChecks,
      color: "text-brand-600 dark:text-brand-100",
      iconBg: "bg-brand-50 dark:bg-brand-600/15",
    },
  ];

  return (
    <section
      aria-label="Indicadores financeiros"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            key={card.label}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
                <p className={`mt-3 text-2xl font-bold tracking-normal ${card.color}`}>
                  {card.value}
                </p>
              </div>
              <div className={`rounded-md p-2 ${card.iconBg} ${card.color}`}>
                <Icon aria-hidden="true" size={22} />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
