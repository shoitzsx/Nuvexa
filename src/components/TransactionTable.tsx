import { Edit3, Layers3, Repeat2, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { transactionTypeLabels } from "../constants/transactions";
import { formatCurrency, formatDate } from "../lib/formatters";
import type { Transaction } from "../types/transactions";

interface TransactionTableProps {
  transactions: Transaction[];
  onDelete: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
}

function typeBadge(transaction: Transaction) {
  const isIncome = transaction.type === "income";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isIncome
          ? "bg-positive-50 text-positive-600 dark:bg-positive-600/15 dark:text-positive-100"
          : "bg-negative-50 text-negative-600 dark:bg-negative-600/15 dark:text-negative-100"
      }`}
    >
      {transactionTypeLabels[transaction.type]}
    </span>
  );
}

function valueText(transaction: Transaction) {
  const isIncome = transaction.type === "income";

  return (
    <span
      className={`font-semibold ${
        isIncome
          ? "text-positive-600 dark:text-positive-100"
          : "text-negative-600 dark:text-negative-100"
      }`}
    >
      {isIncome ? "+" : "-"} {formatCurrency(transaction.amount)}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      Nenhuma transação encontrada.
    </div>
  );
}

export function TransactionTable({
  transactions,
  onDelete,
  onEdit,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return <EmptyState />;
  }

  return (
    <section aria-label="Lista de movimentações">
      <div className="hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-normal text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-semibold" scope="col">
                Descrição
              </th>
              <th className="px-4 py-3 font-semibold" scope="col">
                Categoria
              </th>
              <th className="px-4 py-3 font-semibold" scope="col">
                Tipo
              </th>
              <th className="px-4 py-3 font-semibold" scope="col">
                Data
              </th>
              <th className="px-4 py-3 text-right font-semibold" scope="col">
                Valor
              </th>
              <th className="px-4 py-3 text-right font-semibold" scope="col">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {transactions.map((transaction) => (
              <motion.tr
                animate={{ opacity: 1, y: 0 }}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                exit={{ opacity: 0, y: -8 }}
                initial={{ opacity: 0, y: 8 }}
                key={transaction.id}
                transition={{ duration: 0.22 }}
              >
                <td className="max-w-xs px-4 py-4">
                  <div className="font-medium text-slate-950 dark:text-white">
                    {transaction.description}
                  </div>
                  {transaction.recurring_expense_id ? (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-600/15 dark:text-brand-100"><Repeat2 aria-hidden="true" size={12} /> Recorrente</span>
                  ) : null}
                  {transaction.installment_purchase_id ? <span className="mt-1 ml-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-600/15 dark:text-brand-100"><Layers3 aria-hidden="true" size={12} /> {transaction.installment_number}/{transaction.installments_count}</span> : null}
                  {transaction.observation ? (
                    <div className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {transaction.observation}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                  {transaction.category}
                </td>
                <td className="px-4 py-4">{typeBadge(transaction)}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                  {formatDate(transaction.date)}
                </td>
                <td className="px-4 py-4 text-right">{valueText(transaction)}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    {!transaction.installment_purchase_id ? <button
                      aria-label={`Editar ${transaction.description}`}
                      className="inline-flex size-10 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-brand-100"
                      onClick={() => onEdit(transaction)}
                      title="Editar"
                      type="button"
                    >
                      <Edit3 aria-hidden="true" size={18} />
                    </button> : null}
                    <button
                      aria-label={`Excluir ${transaction.description}`}
                      className="inline-flex size-10 items-center justify-center rounded-md text-slate-600 transition hover:bg-negative-50 hover:text-negative-600 dark:text-slate-300 dark:hover:bg-negative-600/15 dark:hover:text-negative-100"
                      onClick={() => onDelete(transaction)}
                      title="Excluir"
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={18} />
                    </button>
                  </div>
                </td>
              </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        <AnimatePresence initial={false}>
          {transactions.map((transaction) => (
          <motion.article
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: 8 }}
            key={transaction.id}
            transition={{ duration: 0.22 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  {transaction.description}
                </h3>
                {transaction.recurring_expense_id ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-600/15 dark:text-brand-100"><Repeat2 aria-hidden="true" size={12} /> Recorrente</span>
                ) : null}
                {transaction.installment_purchase_id ? <span className="mt-1 ml-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-600/15 dark:text-brand-100"><Layers3 aria-hidden="true" size={12} /> {transaction.installment_number}/{transaction.installments_count}</span> : null}
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {transaction.category} · {formatDate(transaction.date)}
                </p>
              </div>
              {typeBadge(transaction)}
            </div>
            {transaction.observation ? (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                {transaction.observation}
              </p>
            ) : null}
            <div className="mt-4 flex items-center justify-between gap-3">
              {valueText(transaction)}
              <div className="flex gap-2">
                {!transaction.installment_purchase_id ? <button
                  aria-label={`Editar ${transaction.description}`}
                  className="inline-flex size-10 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-brand-100"
                  onClick={() => onEdit(transaction)}
                  title="Editar"
                  type="button"
                >
                  <Edit3 aria-hidden="true" size={18} />
                </button> : null}
                <button
                  aria-label={`Excluir ${transaction.description}`}
                  className="inline-flex size-10 items-center justify-center rounded-md text-slate-600 transition hover:bg-negative-50 hover:text-negative-600 dark:text-slate-300 dark:hover:bg-negative-600/15 dark:hover:text-negative-100"
                  onClick={() => onDelete(transaction)}
                  title="Excluir"
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={18} />
                </button>
              </div>
            </div>
          </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
