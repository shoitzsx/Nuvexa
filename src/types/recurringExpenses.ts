import type { TransactionCategory } from "./transactions";

export const recurringExpenseFrequencies = [
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "annual",
] as const;
export const paymentMethods = ["Pix", "Boleto", "Dinheiro", "Débito", "Cartão", "Transferência", "Outra"] as const;

export type RecurringExpenseFrequency = (typeof recurringExpenseFrequencies)[number];
export type RecurringExpenseStatus = "active" | "paused" | "ended";
export type PaymentMethod = (typeof paymentMethods)[number];

export interface RecurringExpense {
  id: string;
  user_id: string;
  name: string;
  category: TransactionCategory;
  amount: number;
  due_day: number;
  frequency: RecurringExpenseFrequency;
  start_date: string;
  end_date: string | null;
  total_occurrences: number | null;
  payment_method: PaymentMethod;
  status: RecurringExpenseStatus;
  notes: string | null;
  created_at: string;
}

export interface RecurringExpenseMutation {
  name: string;
  category: TransactionCategory;
  amount: number;
  due_day: number;
  frequency: RecurringExpenseFrequency;
  start_date: string;
  end_date: string | null;
  total_occurrences: number | null;
  payment_method: PaymentMethod;
  status: RecurringExpenseStatus;
  notes: string | null;
}