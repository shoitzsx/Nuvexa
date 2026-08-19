import type { CreditCard } from "../types/creditCards";
import type { SavingsTransaction } from "../types/savingsGoals";
import type { Transaction } from "../types/transactions";
import type { ReportExpenseCategory, ReportsSummary } from "../types/reports";

function monthStart(date: string): string { return date.slice(0, 7); }
function parseMonth(month: string): Date { return new Date(`${month}-01T12:00:00`); }
function addMonth(month: string, amount: number): string { const date = parseMonth(month); date.setMonth(date.getMonth() + amount); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function monthDifference(first: string, last: string): number { const firstDate = parseMonth(first); const lastDate = parseMonth(last); return (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + lastDate.getMonth() - firstDate.getMonth(); }

export function categorizeExpenseForReports(transaction: Transaction): ReportExpenseCategory {
  if (transaction.debt_id) return "debt";
  if (transaction.credit_card_id) return "card";
  if (transaction.recurring_expense_id) return "fixed";
  return "sporadic";
}

export function getMonthsInRange(startDate: string, endDate: string): string[] {
  const startMonth = monthStart(startDate); const endMonth = monthStart(endDate);
  return Array.from({ length: monthDifference(startMonth, endMonth) + 1 }, (_, index) => addMonth(startMonth, index));
}

export function calculateReportsSummary(transactions: Transaction[], savingsTransactions: SavingsTransaction[], creditCards: CreditCard[], startDate: string, endDate: string): ReportsSummary {
  const inRange = transactions.filter((transaction) => transaction.date >= startDate && transaction.date <= endDate);
  const expenses = inRange.filter((transaction) => transaction.type === "expense");
  const income = inRange.filter((transaction) => transaction.type === "income").reduce((total, transaction) => total + transaction.amount, 0);
  const expensesByReportCategory: Record<ReportExpenseCategory, number> = { debt: 0, card: 0, fixed: 0, sporadic: 0 };
  expenses.forEach((transaction) => { expensesByReportCategory[categorizeExpenseForReports(transaction)] += transaction.amount; });
  const totalsByCategory = new Map<string, number>(); expenses.forEach((transaction) => totalsByCategory.set(transaction.category, (totalsByCategory.get(transaction.category) ?? 0) + transaction.amount));
  const totalsByCard = new Map<string, number>(); expenses.filter((transaction) => transaction.credit_card_id).forEach((transaction) => { const name = creditCards.find((card) => card.id === transaction.credit_card_id)?.name ?? "Cartão removido"; totalsByCard.set(name, (totalsByCard.get(name) ?? 0) + transaction.amount); });
  const months = getMonthsInRange(startDate, endDate);
  let savingsBalance = savingsTransactions.filter((transaction) => transaction.date < startDate).reduce((total, transaction) => total + (transaction.type === "deposit" ? transaction.amount : -transaction.amount), 0);
  const monthly = months.map((month) => { const monthTransactions = inRange.filter((transaction) => monthStart(transaction.date) === month); const monthIncome = monthTransactions.filter((transaction) => transaction.type === "income").reduce((total, transaction) => total + transaction.amount, 0); const monthExpenses = monthTransactions.filter((transaction) => transaction.type === "expense").reduce((total, transaction) => total + transaction.amount, 0); savingsBalance += savingsTransactions.filter((transaction) => monthStart(transaction.date) === month).reduce((total, transaction) => total + (transaction.type === "deposit" ? transaction.amount : -transaction.amount), 0); const committedExpenses = monthTransactions.filter((transaction) => transaction.type === "expense" && categorizeExpenseForReports(transaction) !== "sporadic").reduce((total, transaction) => total + transaction.amount, 0); return { month, income: monthIncome, expenses: monthExpenses, committedPercent: monthIncome > 0 ? (committedExpenses / monthIncome) * 100 : null, savingsBalance }; });
  return { income, expenses: expenses.reduce((total, transaction) => total + transaction.amount, 0), expensesByReportCategory, expensesByCategory: Array.from(totalsByCategory, ([name, total]) => ({ name, total })).sort((left, right) => right.total - left.total), expensesByCard: Array.from(totalsByCard, ([name, total]) => ({ name, total })).sort((left, right) => right.total - left.total), monthly };
}