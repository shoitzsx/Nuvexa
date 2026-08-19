import { getTransactionCategories } from "../constants/transactions";
import { parseAmount } from "./formatters";
import {
  paymentMethods,
  recurringExpenseFrequencies,
  type PaymentMethod,
  type RecurringExpenseFrequency,
  type RecurringExpenseMutation,
  type RecurringExpenseStatus,
} from "../types/recurringExpenses";
import type { TransactionCategory } from "../types/transactions";

export interface RecurringExpenseFormValues {
  name: string;
  category: TransactionCategory | "";
  amount: string;
  due_day: string;
  frequency: RecurringExpenseFrequency | "";
  start_date: string;
  end_date: string;
  total_occurrences: string;
  payment_method: PaymentMethod | "";
  status: RecurringExpenseStatus;
  notes: string;
}

export type RecurringExpenseFormErrors = Partial<Record<keyof RecurringExpenseFormValues, string>>;

export function validateRecurringExpenseForm(values: RecurringExpenseFormValues) {
  const errors: RecurringExpenseFormErrors = {};
  const amount = parseAmount(values.amount);
  const dueDay = Number(values.due_day);
  const totalOccurrences = values.total_occurrences ? Number(values.total_occurrences) : null;

  if (!values.name.trim()) errors.name = "Informe o nome da despesa.";
  if (!getTransactionCategories().includes(values.category as TransactionCategory)) errors.category = "Escolha uma categoria válida.";
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = "Informe um valor maior que zero.";
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) errors.due_day = "Informe um dia entre 1 e 31.";
  if (!recurringExpenseFrequencies.includes(values.frequency as RecurringExpenseFrequency)) errors.frequency = "Escolha uma frequência.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.start_date)) errors.start_date = "Informe a data de início.";
  if (values.end_date && values.end_date < values.start_date) errors.end_date = "A data de término não pode ser anterior ao início.";
  if (values.end_date && values.total_occurrences) errors.total_occurrences = "Use data de término ou quantidade de ocorrências, não ambos.";
  if (totalOccurrences !== null && (!Number.isInteger(totalOccurrences) || totalOccurrences <= 0)) errors.total_occurrences = "Informe uma quantidade inteira maior que zero.";
  if (!paymentMethods.includes(values.payment_method as PaymentMethod)) errors.payment_method = "Escolha uma forma de pagamento.";

  if (Object.keys(errors).length) return { errors, data: null };

  return {
    errors,
    data: {
      name: values.name.trim(), category: values.category as TransactionCategory, amount, due_day: dueDay,
      frequency: values.frequency as RecurringExpenseFrequency, start_date: values.start_date,
      end_date: values.end_date || null, total_occurrences: totalOccurrences,
      payment_method: values.payment_method as PaymentMethod, status: values.status,
      notes: values.notes.trim() || null,
    } satisfies RecurringExpenseMutation,
  };
}