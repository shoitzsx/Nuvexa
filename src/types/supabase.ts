import type { TransactionCategory, TransactionType } from "./transactions";
import type {
  IncomeSourceCategory,
  IncomeSourceRecurrenceType,
  IncomeSourceStatus,
} from "./incomeSources";
import type {
  PaymentMethod,
  RecurringExpenseFrequency,
  RecurringExpenseStatus,
} from "./recurringExpenses";
import type { CreditCardStatus, InvoiceStatus } from "./creditCards";
import type { DebtStatus } from "./debts";
import type { SavingsGoalStatus, SavingsTransactionType } from "./savingsGoals";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id: string;
          description: string;
          amount: number;
          type: TransactionType;
          category: TransactionCategory;
          date: string;
          observation?: string | null;
          income_source_id?: string | null;
          recurring_expense_id?: string | null;
          credit_card_id?: string | null;
          invoice_id?: string | null;
          installment_purchase_id?: string | null;
          installment_number?: number | null;
          installments_count?: number | null;
          debt_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          description?: string;
          amount?: number;
          type?: TransactionType;
          category?: TransactionCategory;
          date?: string;
          observation?: string | null;
          income_source_id?: string | null;
          recurring_expense_id?: string | null;
          credit_card_id?: string | null;
          invoice_id?: string | null;
          installment_purchase_id?: string | null;
          installment_number?: number | null;
          installments_count?: number | null;
          debt_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      income_sources: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          recurrence_type: IncomeSourceRecurrenceType;
          category: IncomeSourceCategory;
          expected_amount: number | null;
          status: IncomeSourceStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          recurrence_type: IncomeSourceRecurrenceType;
          category: IncomeSourceCategory;
          expected_amount?: number | null;
          status?: IncomeSourceStatus;
          created_at?: string;
        };
        Update: {
          name?: string;
          recurrence_type?: IncomeSourceRecurrenceType;
          category?: IncomeSourceCategory;
          expected_amount?: number | null;
          status?: IncomeSourceStatus;
        };
        Relationships: [];
      };
      recurring_expenses: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category: TransactionCategory;
          amount: number;
          due_day: number;
          frequency: RecurringExpenseFrequency;
          start_date: string;
          end_date?: string | null;
          total_occurrences?: number | null;
          payment_method: PaymentMethod;
          status?: RecurringExpenseStatus;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          category?: TransactionCategory;
          amount?: number;
          due_day?: number;
          frequency?: RecurringExpenseFrequency;
          start_date?: string;
          end_date?: string | null;
          total_occurrences?: number | null;
          payment_method?: PaymentMethod;
          status?: RecurringExpenseStatus;
          notes?: string | null;
        };
        Relationships: [];
      };
      credit_cards: {
        Row: { id: string; user_id: string; name: string; institution: string; brand: string; last_four_digits: string | null; credit_limit: number; closing_day: number; due_day: number; color: string; status: CreditCardStatus; created_at: string; };
        Insert: { id?: string; user_id: string; name: string; institution: string; brand: string; last_four_digits?: string | null; credit_limit: number; closing_day: number; due_day: number; color?: string; status?: CreditCardStatus; created_at?: string; };
        Update: { name?: string; institution?: string; brand?: string; last_four_digits?: string | null; credit_limit?: number; closing_day?: number; due_day?: number; color?: string; status?: CreditCardStatus; };
        Relationships: [];
      };
      invoices: {
        Row: { id: string; user_id: string; credit_card_id: string | null; reference_month: string; closing_date: string; due_date: string; status: InvoiceStatus; paid_at: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; credit_card_id: string; reference_month: string; closing_date: string; due_date: string; status?: InvoiceStatus; paid_at?: string | null; created_at?: string; };
        Update: { status?: InvoiceStatus; paid_at?: string | null; };
        Relationships: [];
      };
      installment_purchases: {
        Row: {
          id: string;
          user_id: string;
          description: string;
          category: TransactionCategory;
          credit_card_id: string | null;
          purchase_date: string;
          total_amount: number;
          installments_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          description: string;
          category: TransactionCategory;
          credit_card_id: string;
          purchase_date: string;
          total_amount: number;
          installments_count: number;
          created_at?: string;
        };
        Update: {
          description?: string;
          category?: TransactionCategory;
          credit_card_id?: string;
          purchase_date?: string;
          total_amount?: number;
          installments_count?: number;
        };
        Relationships: [];
      };
      debts: {
        Row: { id: string; user_id: string; name: string; creditor: string; original_amount: number; interest_rate: number | null; installment_amount: number | null; total_installments: number | null; due_day: number | null; status: DebtStatus; notes: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; name: string; creditor: string; original_amount: number; interest_rate?: number | null; installment_amount?: number | null; total_installments?: number | null; due_day?: number | null; status?: DebtStatus; notes?: string | null; created_at?: string; };
        Update: { name?: string; creditor?: string; original_amount?: number; interest_rate?: number | null; installment_amount?: number | null; total_installments?: number | null; due_day?: number | null; status?: DebtStatus; notes?: string | null; };
        Relationships: [];
      };
      savings_goals: {
        Row: { id: string; user_id: string; name: string; description: string | null; target_amount: number; target_date: string | null; status: SavingsGoalStatus; created_at: string; };
        Insert: { id?: string; user_id: string; name: string; description?: string | null; target_amount: number; target_date?: string | null; status?: SavingsGoalStatus; created_at?: string; };
        Update: { name?: string; description?: string | null; target_amount?: number; target_date?: string | null; status?: SavingsGoalStatus; };
        Relationships: [];
      };
      savings_transactions: {
        Row: { id: string; user_id: string; goal_id: string; type: SavingsTransactionType; amount: number; date: string; source: string | null; note: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; goal_id: string; type: SavingsTransactionType; amount: number; date: string; source?: string | null; note?: string | null; created_at?: string; };
        Update: { goal_id?: string; type?: SavingsTransactionType; amount?: number; date?: string; source?: string | null; note?: string | null; };
        Relationships: [];
      };
      alert_dismissals: {
        Row: { id: string; user_id: string; alert_key: string; dismissed_at: string; };
        Insert: { id?: string; user_id: string; alert_key: string; dismissed_at?: string; };
        Update: { alert_key?: string; dismissed_at?: string; };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_current_user: {
        Args: Record<string, never>;
        Returns: null;
      };
      generate_current_recurring_expenses: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
