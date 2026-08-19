import {
  getTransactionCategories,
  transactionTypes,
} from "../constants/transactions";
import { parseAmount } from "./formatters";
import type {
  TransactionCategory,
  TransactionMutation,
  TransactionType,
} from "../types/transactions";

export interface TransactionFormValues {
  description: string;
  amount: string;
  type: TransactionType | "";
  category: TransactionCategory | "";
  date: string;
  observation: string;
  income_source_id: string;
  recurring_expense_id: string;
  credit_card_id: string;
  invoice_id: string;
  installment_purchase_id: string;
  installment_number: string;
  installments_count: string;
  debt_id: string;
}

export type TransactionFormErrors = Partial<
  Record<keyof TransactionFormValues, string>
>;

export interface TransactionValidationResult {
  errors: TransactionFormErrors;
  data: TransactionMutation | null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsedDate.getTime());
}

export function validateTransactionForm(
  values: TransactionFormValues,
): TransactionValidationResult {
  const errors: TransactionFormErrors = {};
  const amount = parseAmount(values.amount);
  const typeIsValid = transactionTypes.includes(values.type as TransactionType);
  const validCategories = getTransactionCategories();
  const categoryIsValid = validCategories.includes(
    values.category as TransactionCategory,
  );

  if (values.description.trim().length === 0) {
    errors.description = "Informe uma descrição.";
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Informe um valor maior que zero.";
  }

  if (!typeIsValid) {
    errors.type = "Escolha receita ou despesa.";
  }

  if (!categoryIsValid) {
    errors.category = "Escolha uma categoria válida.";
  }

  if (!isValidDate(values.date)) {
    errors.date = "Informe uma data válida.";
  }

  if (Object.keys(errors).length > 0 || !typeIsValid || !categoryIsValid) {
    return {
      errors,
      data: null,
    };
  }

  return {
    errors,
    data: {
      description: values.description.trim(),
      amount,
      type: values.type as TransactionType,
      category: values.category as TransactionCategory,
      date: values.date,
      observation:
        values.observation.trim().length > 0
          ? values.observation.trim()
          : null,
      income_source_id:
        values.type === "income" && values.income_source_id
          ? values.income_source_id
          : null,
          recurring_expense_id: values.recurring_expense_id || null,
          credit_card_id: values.type === "expense" && values.credit_card_id ? values.credit_card_id : null,
          invoice_id: values.type === "expense" && values.invoice_id ? values.invoice_id : null,
          installment_purchase_id: null,
          installment_number: null,
          installments_count: null,
          debt_id: null,
    },
  };
}
