export const incomeSourceCategories = [
  "Salário",
  "Comissão",
  "Freelance",
  "Trabalho avulso",
  "Venda",
  "Rendimento",
  "Aluguel recebido",
  "Presente",
  "Reembolso",
  "Renda extra",
  "Outros",
] as const;

export type IncomeSourceCategory = (typeof incomeSourceCategories)[number];
export type IncomeSourceRecurrenceType = "recurring" | "eventual";
export type IncomeSourceStatus = "active" | "inactive";

export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  recurrence_type: IncomeSourceRecurrenceType;
  category: IncomeSourceCategory;
  expected_amount: number | null;
  status: IncomeSourceStatus;
  created_at: string;
}

export interface IncomeSourceMutation {
  name: string;
  recurrence_type: IncomeSourceRecurrenceType;
  category: IncomeSourceCategory;
  expected_amount: number | null;
  status: IncomeSourceStatus;
}