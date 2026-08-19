import { CalendarDays, FilterX, Search } from "lucide-react";
import {
  emptyTransactionFilters,
  getTransactionCategories,
  transactionTypeLabels,
} from "../constants/transactions";
import type { TransactionFilters } from "../types/transactions";
import { Button } from "./Button";

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

function hasActiveFilters(filters: TransactionFilters) {
  return (
    filters.search.trim().length > 0 ||
    filters.type !== "all" ||
    filters.category !== "all" ||
    filters.startDate.length > 0 ||
    filters.endDate.length > 0
  );
}

export function TransactionFilters({
  filters,
  onChange,
}: TransactionFiltersProps) {
  const availableCategories = getTransactionCategories();

  function updateFilter(nextFilters: Partial<TransactionFilters>) {
    onChange(Object.assign({}, filters, nextFilters));
  }

  return (
    <section
      aria-label="Filtros de movimentações"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.3fr)_repeat(4,minmax(140px,1fr))_auto]">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Pesquisar
          <span className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              className="min-h-11 w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-slate-950 transition placeholder:text-slate-400 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              onChange={(event) => updateFilter({ search: event.target.value })}
              placeholder="Descrição"
              type="search"
              value={filters.search}
            />
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Tipo
          <select
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            onChange={(event) =>
              updateFilter({
                type: event.target.value as TransactionFilters["type"],
              })
            }
            value={filters.type}
          >
            <option value="all">Todos</option>
            <option value="income">{transactionTypeLabels.income}</option>
            <option value="expense">{transactionTypeLabels.expense}</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Categoria
          <select
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            onChange={(event) =>
              updateFilter({
                category: event.target
                  .value as TransactionFilters["category"],
              })
            }
            value={filters.category}
          >
            <option value="all">Todas</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Início
          <span className="relative">
            <CalendarDays
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              className="min-h-11 w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-slate-950 transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              onChange={(event) =>
                updateFilter({ startDate: event.target.value })
              }
              type="date"
              value={filters.startDate}
            />
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Fim
          <span className="relative">
            <CalendarDays
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              className="min-h-11 w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-slate-950 transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              onChange={(event) => updateFilter({ endDate: event.target.value })}
              type="date"
              value={filters.endDate}
            />
          </span>
        </label>

        <div className="flex items-end">
          <Button
            className="w-full lg:w-auto"
            disabled={!hasActiveFilters(filters)}
            icon={<FilterX aria-hidden="true" size={18} />}
            onClick={() => onChange(emptyTransactionFilters)}
            variant="secondary"
          >
            Limpar
          </Button>
        </div>
      </div>
    </section>
  );
}
