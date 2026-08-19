import type { CreditCard, Invoice } from "../types/creditCards";
import type { Debt } from "../types/debts";
import type { RecurringExpense } from "../types/recurringExpenses";
import type { SavingsGoal } from "../types/savingsGoals";
import type { Transaction } from "../types/transactions";

export type CalendarEventType = "income" | "recurring_expense" | "invoice_closing" | "invoice_due" | "debt_due" | "goal_target";
export interface CalendarEvent { id: string; date: string; type: CalendarEventType; title: string; detail: string; }

const intervalByFrequency = { monthly: 1, bimonthly: 2, quarterly: 3, semiannual: 6, annual: 12 } as const;
function monthDifference(startMonth: string, endMonth: string): number { const [startYear, startMonthNumber] = startMonth.split("-").map(Number); const [endYear, endMonthNumber] = endMonth.split("-").map(Number); return (endYear - startYear) * 12 + endMonthNumber - startMonthNumber; }
function monthLastDay(month: string): number { return new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate(); }

export function isRecurringExpenseDueOn(expense: RecurringExpense, date: string): boolean {
  if (expense.status !== "active") return false;
  const month = date.slice(0, 7);
  const offset = monthDifference(expense.start_date.slice(0, 7), month);
  if (offset < 0 || offset % intervalByFrequency[expense.frequency] !== 0) return false;
  const occurrenceNumber = offset / intervalByFrequency[expense.frequency] + 1;
  const occurrenceDate = `${month}-${String(Math.min(expense.due_day, monthLastDay(month))).padStart(2, "0")}`;
  return occurrenceDate === date && occurrenceDate >= expense.start_date && (!expense.end_date || occurrenceDate <= expense.end_date) && (expense.total_occurrences === null || occurrenceNumber <= expense.total_occurrences);
}

export interface CalendarInput { month: string; transactions: Transaction[]; recurringExpenses: RecurringExpense[]; invoices: Invoice[]; creditCards: CreditCard[]; debts: Debt[]; goals: SavingsGoal[]; }

export function getCalendarEvents(input: CalendarInput): CalendarEvent[] {
  const [year, monthNumber] = input.month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const cardName = (id: string | null) => input.creditCards.find((card) => card.id === id)?.name ?? "Cartão";
  const events: CalendarEvent[] = input.transactions.filter((transaction) => transaction.type === "income" && transaction.date.startsWith(input.month)).map((transaction) => ({ id: `income:${transaction.id}`, date: transaction.date, type: "income" as const, title: transaction.income_source_id ? "Recebimento recorrente" : "Recebimento", detail: transaction.description }));
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${input.month}-${String(day).padStart(2, "0")}`;
    input.recurringExpenses.filter((expense) => isRecurringExpenseDueOn(expense, date)).forEach((expense) => events.push({ id: `recurring:${expense.id}:${date}`, date, type: "recurring_expense", title: "Vencimento de despesa fixa", detail: expense.name }));
    input.debts.filter((debt) => debt.status === "active" && debt.installment_amount !== null && debt.due_day !== null && Math.min(debt.due_day, daysInMonth) === day).forEach((debt) => events.push({ id: `debt:${debt.id}:${input.month}`, date, type: "debt_due", title: "Vencimento de dívida", detail: debt.name }));
  }
  input.invoices.filter((invoice) => invoice.closing_date.startsWith(input.month)).forEach((invoice) => events.push({ id: `invoice-closing:${invoice.id}`, date: invoice.closing_date, type: "invoice_closing", title: "Fechamento de fatura", detail: cardName(invoice.credit_card_id) }));
  input.invoices.filter((invoice) => invoice.due_date.startsWith(input.month)).forEach((invoice) => events.push({ id: `invoice-due:${invoice.id}`, date: invoice.due_date, type: "invoice_due", title: "Vencimento de fatura", detail: cardName(invoice.credit_card_id) }));
  input.goals.filter((goal) => goal.status === "active" && goal.target_date?.startsWith(input.month)).forEach((goal) => events.push({ id: `goal:${goal.id}`, date: goal.target_date as string, type: "goal_target", title: "Data desejada da meta", detail: goal.name }));
  return events.sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title));
}