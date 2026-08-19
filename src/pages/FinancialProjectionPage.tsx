import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { useCreditCards } from "../hooks/useCreditCards";
import { useDebts } from "../hooks/useDebts";
import { useIncomeSources } from "../hooks/useIncomeSources";
import { useRecurringExpenses } from "../hooks/useRecurringExpenses";
import { useTransactions } from "../hooks/useTransactions";
import { calculateMonthlyProjection } from "../lib/projectionEngine";
import { formatCurrency } from "../lib/formatters";

function currentMonth(): string { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function formatMonth(month: string): string { return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`)).replace(".", ""); }

export function FinancialProjectionPage() {
  const [months, setMonths] = useState<6 | 12>(6);
  const { incomeSources } = useIncomeSources();
  const { recurringExpenses } = useRecurringExpenses();
  const { invoices } = useCreditCards();
  const { debts } = useDebts();
  const { transactions } = useTransactions();
  const projections = calculateMonthlyProjection({ startMonth: currentMonth(), months, incomeSources, recurringExpenses, invoices, debts, transactions });
  const hasRecurringIncome = incomeSources.some((source) => source.status === "active" && source.recurrence_type === "recurring" && (source.expected_amount ?? 0) > 0);
  const chartData = projections.map((projection) => ({ month: formatMonth(projection.month), saldo: projection.projectedBalance }));

  return <div className="grid gap-6"><section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2"><TrendingUp aria-hidden="true" size={24} /><h1 className="text-2xl font-bold text-slate-950 dark:text-white">Projeção financeira</h1></div><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Estimativa baseada nos valores recorrentes já cadastrados. Gastos eventuais não são previstos.</p></div><div className="flex gap-2" role="group" aria-label="Período da projeção"><Button onClick={() => setMonths(6)} variant={months === 6 ? "primary" : "secondary"}>6 meses</Button><Button onClick={() => setMonths(12)} variant={months === 12 ? "primary" : "secondary"}>12 meses</Button></div></section>{!hasRecurringIncome ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">Não há fonte de renda recorrente ativa cadastrada. Os saldos projetados não incluem receitas até que uma fonte recorrente seja adicionada.</div> : null}<section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-semibold text-slate-950 dark:text-white">Evolução do saldo projetado</h2><div className="mt-4 h-72"><ResponsiveContainer height="100%" width="100%"><LineChart data={chartData}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="month" stroke="#64748b" /><YAxis stroke="#64748b" tickFormatter={(value) => `R$ ${value}`} /><Tooltip formatter={(value: unknown) => formatCurrency(Number(value ?? 0))} /><Line dataKey="saldo" dot={{ r: 3 }} stroke="#2563eb" strokeWidth={2} type="monotone" /></LineChart></ResponsiveContainer></div></section><section className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400"><tr><th className="px-5 py-4 font-medium">Mês</th><th className="px-5 py-4 text-right font-medium">Receitas previstas</th><th className="px-5 py-4 text-right font-medium">Gastos previstos</th><th className="px-5 py-4 text-right font-medium">Comprometido</th><th className="px-5 py-4 text-right font-medium">Saldo projetado</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{projections.map((projection) => <tr key={projection.month}><td className="px-5 py-4 font-medium capitalize text-slate-950 dark:text-white">{formatMonth(projection.month)}</td><td className="px-5 py-4 text-right text-positive-600 dark:text-positive-100">{formatCurrency(projection.expectedIncome)}</td><td className="px-5 py-4 text-right text-negative-600 dark:text-negative-100">{formatCurrency(projection.expectedExpenses)}</td><td className="px-5 py-4 text-right text-slate-700 dark:text-slate-200">{formatCurrency(projection.committed)}</td><td className={`px-5 py-4 text-right font-semibold ${projection.projectedBalance >= 0 ? "text-positive-600 dark:text-positive-100" : "text-negative-600 dark:text-negative-100"}`}>{formatCurrency(projection.projectedBalance)}</td></tr>)}</tbody></table></section><p className="text-xs text-slate-500 dark:text-slate-400">Gastos previstos combinam despesas fixas, faturas de cartão com vencimento no mês e parcelas de dívidas ativas. O saldo é calculado separadamente para cada mês, sem acumular sobras.</p></div>;
}