import { calculateDebtBalance } from "./debtBalance";
import { calculateMonthlyProjection } from "./projectionEngine";
import { calculateSavingsGoalBalance } from "./savingsGoalBalance";
import { isRecurringExpenseDueOn } from "./calendarEngine";
import type { CreditCard, Invoice } from "../types/creditCards";
import type { Debt } from "../types/debts";
import type { IncomeSource } from "../types/incomeSources";
import type { RecurringExpense } from "../types/recurringExpenses";
import type { SavingsGoal, SavingsTransaction } from "../types/savingsGoals";
import type { Transaction } from "../types/transactions";
import type { FinancialAlert } from "../types/alerts";

export const alertThresholds = { invoiceDueDays: 3, cardLimitPercent: 80, upcomingDueDays: 7, goalCompletionPercent: 80, incomeCommittedPercent: 80 } as const;
function inputDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function addDays(date: Date, days: number): Date { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function daysUntil(date: string, currentDate: Date): number { const start = new Date(`${inputDate(currentDate)}T12:00:00`); const end = new Date(`${date}T12:00:00`); return Math.round((end.getTime() - start.getTime()) / 86400000); }
function currentMonth(date: Date): string { return inputDate(date).slice(0, 7); }

export interface AlertsInput { currentDate?: Date; creditCards: CreditCard[]; invoices: Invoice[]; recurringExpenses: RecurringExpense[]; debts: Debt[]; goals: SavingsGoal[]; savingsTransactions: SavingsTransaction[]; incomeSources: IncomeSource[]; transactions: Transaction[]; }

export function getFinancialAlerts(input: AlertsInput): FinancialAlert[] {
  const currentDate = input.currentDate ?? new Date();
  const month = currentMonth(currentDate);
  const alerts: FinancialAlert[] = [];
  input.invoices.filter((invoice) => invoice.status !== "paid" && daysUntil(invoice.due_date, currentDate) >= 0 && daysUntil(invoice.due_date, currentDate) <= alertThresholds.invoiceDueDays).forEach((invoice) => { const name = input.creditCards.find((card) => card.id === invoice.credit_card_id)?.name ?? "cartão"; const days = daysUntil(invoice.due_date, currentDate); alerts.push({ key: `invoice_due:${invoice.id}`, severity: "attention", title: "Fatura próxima do vencimento", message: `Sua fatura do cartão ${name} vence em ${days} dia(s).` }); });
  const unpaidInvoiceIds = new Set(input.invoices.filter((invoice) => invoice.status !== "paid").map((invoice) => invoice.id));
  input.creditCards.filter((card) => card.status === "active").forEach((card) => { const used = input.transactions.filter((transaction) => transaction.credit_card_id === card.id && transaction.invoice_id !== null && unpaidInvoiceIds.has(transaction.invoice_id)).reduce((total, transaction) => total + transaction.amount, 0); const percentage = (used / card.credit_limit) * 100; if (percentage >= alertThresholds.cardLimitPercent) alerts.push({ key: `card_limit:${card.id}:${month}`, severity: "attention", title: "Limite de cartão alto", message: `Você já usou ${percentage.toFixed(0)}% do limite do cartão ${card.name}.` }); });
  const invoiceMonthById = new Map(input.invoices.map((invoice) => [invoice.id, invoice.due_date.slice(0, 7)]));
  input.transactions.filter((transaction) => transaction.installment_number !== null && transaction.installments_count !== null && transaction.installment_number === transaction.installments_count && (transaction.invoice_id ? invoiceMonthById.get(transaction.invoice_id) === month : transaction.date.startsWith(month))).forEach((transaction) => alerts.push({ key: `last_installment:${transaction.id}`, severity: "info", title: "Última parcela do mês", message: `A última parcela de ${transaction.description} será paga este mês.` }));
  const upcomingDates = Array.from({ length: alertThresholds.upcomingDueDays + 1 }, (_, index) => inputDate(addDays(currentDate, index)));
  const upcomingRecurring = input.recurringExpenses.flatMap((expense) => upcomingDates.filter((date) => isRecurringExpenseDueOn(expense, date)).map((date) => `${expense.id}:${date}`));
  if (upcomingRecurring.length) alerts.push({ key: `recurring_due:${upcomingRecurring.join("|")}`, severity: "attention", title: "Contas fixas vencendo em breve", message: `Você tem ${upcomingRecurring.length} conta(s) fixa(s) vencendo nos próximos ${alertThresholds.upcomingDueDays} dias.` });
  const upcomingDebts = input.debts.flatMap((debt) => { const dueDay = debt.due_day; if (debt.status !== "active" || debt.installment_amount === null || dueDay === null) return []; return upcomingDates.filter((date) => Number(date.slice(8, 10)) === Math.min(dueDay, new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0).getDate())).map((date) => `${debt.id}:${date}`); });
  if (upcomingDebts.length) alerts.push({ key: `debt_due:${upcomingDebts.join("|")}`, severity: "attention", title: "Dívidas vencendo em breve", message: `Você tem ${upcomingDebts.length} dívida(s) vencendo nos próximos ${alertThresholds.upcomingDueDays} dias.` });
  input.goals.filter((goal) => goal.status === "active").forEach((goal) => { const percentage = calculateSavingsGoalBalance(goal, input.savingsTransactions, currentDate).percentageComplete; if (percentage >= alertThresholds.goalCompletionPercent) alerts.push({ key: `goal_completion:${goal.id}:${month}`, severity: "info", title: "Meta perto de conclusão", message: `Sua meta ${goal.name} está ${percentage.toFixed(0)}% concluída.` }); });
  const projection = calculateMonthlyProjection({ startMonth: month, months: 1, incomeSources: input.incomeSources, recurringExpenses: input.recurringExpenses, invoices: input.invoices, debts: input.debts, transactions: input.transactions, currentDate })[0];
  if (projection.expectedIncome > 0 && (projection.committed / projection.expectedIncome) * 100 >= alertThresholds.incomeCommittedPercent) { const percentage = (projection.committed / projection.expectedIncome) * 100; alerts.push({ key: `income_committed:${month}`, severity: "attention", title: "Renda comprometida alta", message: `${percentage.toFixed(0)}% da sua renda deste mês já está comprometida.` }); }
  return alerts;
}