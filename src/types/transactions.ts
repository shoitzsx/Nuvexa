export type TransactionType = "income" | "expense";

export type TransactionCategory = string;

export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  date: string;
  observation: string | null;
  income_source_id: string | null;
  recurring_expense_id: string | null;
  credit_card_id: string | null;
  invoice_id: string | null;
  installment_purchase_id: string | null;
  installment_number: number | null;
  installments_count: number | null;
  debt_id: string | null;
  created_at: string;
}

export interface TransactionMutation {
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  date: string;
  observation: string | null;
  income_source_id: string | null;
  recurring_expense_id: string | null;
  credit_card_id: string | null;
  invoice_id: string | null;
  installment_purchase_id: string | null;
  installment_number: number | null;
  installments_count: number | null;
  debt_id: string | null;
}

export type TransactionFilterType = TransactionType | "all";
export type TransactionFilterCategory = TransactionCategory | "all";

export interface TransactionFilters {
  search: string;
  type: TransactionFilterType;
  category: TransactionFilterCategory;
  startDate: string;
  endDate: string;
}
