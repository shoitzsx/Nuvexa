import { calculateDebtBalance } from "./debtBalance";
import type { CreditCard, Invoice } from "../types/creditCards";
import type { Debt } from "../types/debts";
import type { IncomeSource } from "../types/incomeSources";
import type { RecurringExpense } from "../types/recurringExpenses";
import type { Transaction } from "../types/transactions";
import type { MonthlyProjection } from "../types/projection";

const intervalByFrequency = { monthly: 1, bimonthly: 2, quarterly: 3, semiannual: 6, annual: 12 } as const;

function monthFromDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function dateFromMonth(month: string): Date { return new Date(`${month}-01T12:00:00`); }
function addMonths(month: string, amount: number): string { const date = dateFromMonth(month); date.setMonth(date.getMonth() + amount); return monthFromDate(date); }
function monthDifference(startMonth: string, endMonth: string): number { const start = dateFromMonth(startMonth); const end = dateFromMonth(endMonth); return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth(); }
function sumAmounts(transactions: Transaction[]): number { return transactions.reduce((total, transaction) => total + transaction.amount, 0); }

function recurringExpenseOccursInMonth(expense: RecurringExpense, month: string): boolean {
  if (expense.status !== "active") return false;
  const startMonth = expense.start_date.slice(0, 7);
  const offset = monthDifference(startMonth, month);
  if (offset < 0 || offset % intervalByFrequency[expense.frequency] !== 0) return false;
  const occurrenceNumber = offset / intervalByFrequency[expense.frequency] + 1;
  if (expense.total_occurrences !== null && occurrenceNumber > expense.total_occurrences) return false;
  const occurrenceDate = `${month}-${String(Math.min(expense.due_day, new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate())).padStart(2, "0")}`;
  return occurrenceDate >= expense.start_date && (!expense.end_date || occurrenceDate <= expense.end_date);
}

export interface ProjectionInput {
  startMonth: string;
  months: number;
  incomeSources: IncomeSource[];
  recurringExpenses: RecurringExpense[];
  invoices: Invoice[];
  debts: Debt[];
  transactions: Transaction[];
  currentDate?: Date;
}

/** Recurring income sources are assumed to repeat once every month because they have no frequency field. */
export function calculateMonthlyProjection(input: ProjectionInput): MonthlyProjection[] {
  const currentMonth = monthFromDate(input.currentDate ?? new Date());
  const recurringIncome = input.incomeSources.filter((source) => source.status === "active" && source.recurrence_type === "recurring").reduce((total, source) => total + (source.expected_amount ?? 0), 0);
  const debtRemaining = new Map(input.debts.filter((debt) => debt.status === "active" && debt.installment_amount !== null).map((debt) => [debt.id, calculateDebtBalance(debt, input.transactions).remaining]));

  return Array.from({ length: input.months }, (_, index) => {
    const month = addMonths(input.startMonth, index);
    const recurringExpenses = input.recurringExpenses.reduce((total, expense) => {
      if (!recurringExpenseOccursInMonth(expense, month)) return total;
      const realCurrentMonthTransactions = month === currentMonth ? input.transactions.filter((transaction) => transaction.type === "expense" && transaction.recurring_expense_id === expense.id && transaction.date.slice(0, 7) === month) : [];
      return total + (realCurrentMonthTransactions.length ? sumAmounts(realCurrentMonthTransactions) : expense.amount);
    }, 0);
    const cardExpenses = sumAmounts(input.transactions.filter((transaction) => transaction.type === "expense" && transaction.invoice_id !== null && input.invoices.some((invoice) => invoice.id === transaction.invoice_id && invoice.due_date.slice(0, 7) === month && invoice.status !== "paid")));
    const debtExpenses = input.debts.reduce((total, debt) => {
      const remaining = debtRemaining.get(debt.id) ?? 0;
      const installmentAmount = debt.installment_amount ?? 0;
      const projectedPayment = Math.min(remaining, installmentAmount);
      debtRemaining.set(debt.id, remaining - projectedPayment);
      return total + projectedPayment;
    }, 0);
    const expectedExpenses = recurringExpenses + cardExpenses + debtExpenses;
    return { month, expectedIncome: recurringIncome, recurringExpenses, cardExpenses, debtExpenses, expectedExpenses, committed: expectedExpenses, projectedBalance: recurringIncome - expectedExpenses };
  });
}