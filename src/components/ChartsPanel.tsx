import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getTransactionCategories } from "../constants/transactions";
import { formatCurrency, formatDate } from "../lib/formatters";
import type { Transaction } from "../types/transactions";

interface ChartsPanelProps {
  transactions: Transaction[];
}

interface ChartPoint {
  name: string;
  total: number;
}

interface EvolutionPoint {
  date: string;
  saldo: number;
}

const pieColors = [
  "#dc2626",
  "#f97316",
  "#d97706",
  "#7c3aed",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#4f46e5",
  "#64748b",
];

function sumByType(transactions: Transaction[], type: "income" | "expense") {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amount, 0);
}

function getExpensesByCategory(transactions: Transaction[]): ChartPoint[] {
  return getTransactionCategories()
    .map((category) => {
      const total = transactions
        .filter(
          (transaction) =>
            transaction.type === "expense" && transaction.category === category,
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      return {
        name: category,
        total,
      };
    })
    .filter((point) => point.total > 0);
}

function getEvolution(transactions: Transaction[]): EvolutionPoint[] {
  const totalsByDate = new Map<string, number>();

  transactions.forEach((transaction) => {
    const currentTotal = totalsByDate.get(transaction.date) ?? 0;
    const signedAmount =
      transaction.type === "income" ? transaction.amount : -transaction.amount;
    totalsByDate.set(transaction.date, currentTotal + signedAmount);
  });

  let accumulated = 0;

  return Array.from(totalsByDate.entries())
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, total]) => {
      accumulated += total;

      return {
        date,
        saldo: accumulated,
      };
    });
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-md border border-dashed border-slate-300 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {text}
    </div>
  );
}

export function ChartsPanel({ transactions }: ChartsPanelProps) {
  const income = sumByType(transactions, "income");
  const expense = sumByType(transactions, "expense");
  const typeData: ChartPoint[] = [
    {
      name: "Receitas",
      total: income,
    },
    {
      name: "Despesas",
      total: expense,
    },
  ].filter((point) => point.total > 0);
  const categoryData = getExpensesByCategory(transactions);
  const evolutionData = getEvolution(transactions);

  const tooltipFormatter = (value: unknown) => {
    if (Array.isArray(value)) {
      return formatCurrency(Number(value[0] ?? 0));
    }

    return formatCurrency(Number(value ?? 0));
  };

  return (
    <section
      aria-label="Gráficos financeiros"
      className="grid gap-4 xl:grid-cols-3"
    >
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">
          Receitas x Despesas
        </h2>
        <div className="mt-4 h-72">
          {typeData.length > 0 ? (
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={typeData}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={(value) => `R$ ${value}`} />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {typeData.map((point) => (
                    <Cell
                      fill={point.name === "Receitas" ? "#059669" : "#dc2626"}
                      key={point.name}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart text="Sem dados para comparar." />
          )}
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">
          Gastos por categoria
        </h2>
        <div className="mt-4 h-72">
          {categoryData.length > 0 ? (
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="total"
                  innerRadius={60}
                  nameKey="name"
                  outerRadius={96}
                  paddingAngle={2}
                >
                  {categoryData.map((point, index) => (
                    <Cell
                      fill={pieColors[index % pieColors.length]}
                      key={point.name}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart text="Sem despesas no período." />
          )}
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">
          Evolução financeira
        </h2>
        <div className="mt-4 h-72">
          {evolutionData.length > 0 ? (
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={evolutionData}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tickFormatter={(value) => formatDate(String(value))}
                />
                <YAxis stroke="#64748b" tickFormatter={(value) => `R$ ${value}`} />
                <Tooltip
                  formatter={tooltipFormatter}
                  labelFormatter={(label) => formatDate(String(label))}
                />
                <Area
                  dataKey="saldo"
                  fill="url(#balanceGradient)"
                  stroke="#2563eb"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart text="Sem movimentações no período." />
          )}
        </div>
      </article>
    </section>
  );
}
