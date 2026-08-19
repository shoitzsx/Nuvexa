import { parseAmount } from "./formatters";
import {
  incomeSourceCategories,
  type IncomeSourceCategory,
  type IncomeSourceMutation,
  type IncomeSourceRecurrenceType,
  type IncomeSourceStatus,
} from "../types/incomeSources";

export interface IncomeSourceFormValues {
  name: string;
  recurrence_type: IncomeSourceRecurrenceType | "";
  category: IncomeSourceCategory | "";
  expected_amount: string;
  status: IncomeSourceStatus;
}

export type IncomeSourceFormErrors = Partial<
  Record<keyof IncomeSourceFormValues, string>
>;

export function validateIncomeSourceForm(values: IncomeSourceFormValues): {
  errors: IncomeSourceFormErrors;
  data: IncomeSourceMutation | null;
} {
  const errors: IncomeSourceFormErrors = {};
  const expectedAmount = values.recurrence_type === "recurring" && values.expected_amount.trim()
    ? parseAmount(values.expected_amount)
    : null;

  if (!values.name.trim()) {
    errors.name = "Informe o nome da fonte de renda.";
  }

  if (values.recurrence_type !== "recurring" && values.recurrence_type !== "eventual") {
    errors.recurrence_type = "Escolha o tipo de recorrência.";
  }

  if (!incomeSourceCategories.includes(values.category as IncomeSourceCategory)) {
    errors.category = "Escolha uma categoria de origem.";
  }

  if (values.recurrence_type === "recurring" && expectedAmount !== null && (!Number.isFinite(expectedAmount) || expectedAmount <= 0)) {
    errors.expected_amount = "Informe um valor esperado maior que zero.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, data: null };
  }

  return {
    errors,
    data: {
      name: values.name.trim(),
      recurrence_type: values.recurrence_type as IncomeSourceRecurrenceType,
      category: values.category as IncomeSourceCategory,
      expected_amount: expectedAmount,
      status: values.status,
    },
  };
}