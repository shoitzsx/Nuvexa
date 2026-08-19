import { useCallback, useEffect, useState } from "react";
import { emptyTransactionFilters } from "../constants/transactions";
import { supabase } from "../lib/supabase";
import { toInputDate } from "../lib/formatters";
import {
  exampleDataErrorMessage,
  sessionExpiredMessage,
  transactionDeleteErrorMessage,
  transactionLoadErrorMessage,
  transactionSaveErrorMessage,
} from "../lib/userMessages";
import { useAuth } from "./useAuth";
import type { Database } from "../types/supabase";
import type {
  Transaction,
  TransactionFilters,
  TransactionMutation,
} from "../types/transactions";

type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];

function normalizeTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    user_id: row.user_id,
    description: row.description,
    amount: Number(row.amount),
    type: row.type,
    category: row.category,
    date: row.date,
    observation: row.observation,
    income_source_id: row.income_source_id,
    recurring_expense_id: row.recurring_expense_id,
    credit_card_id: row.credit_card_id,
    invoice_id: row.invoice_id,
    installment_purchase_id: row.installment_purchase_id,
    installment_number: row.installment_number,
    installments_count: row.installments_count,
    debt_id: row.debt_id,
    created_at: row.created_at,
  };
}

function offsetDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return toInputDate(date);
}

export function useTransactions(
  filters: TransactionFilters = emptyTransactionFilters,
) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let query = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    const search = filters.search.trim();

    if (search.length > 0) {
      query = query.ilike("description", `%${search}%`);
    }

    if (filters.type !== "all") {
      query = query.eq("type", filters.type);
    }

    if (filters.category !== "all") {
      query = query.eq("category", filters.category);
    }

    if (filters.startDate.length > 0) {
      query = query.gte("date", filters.startDate);
    }

    if (filters.endDate.length > 0) {
      query = query.lte("date", filters.endDate);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      setError(transactionLoadErrorMessage);
      setTransactions([]);
      setLoading(false);
      return;
    }

    setTransactions((data ?? []).map(normalizeTransaction));
    setLoading(false);
  }, [
    filters.category,
    filters.endDate,
    filters.search,
    filters.startDate,
    filters.type,
    user,
  ]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const createTransaction = useCallback(
    async (transaction: TransactionMutation) => {
      if (!user) {
        throw new Error(sessionExpiredMessage);
      }

      const { error: insertError } = await supabase.from("transactions").insert({
        user_id: user.id,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        date: transaction.date,
        observation: transaction.observation,
        income_source_id: transaction.income_source_id,
        recurring_expense_id: transaction.recurring_expense_id,
        credit_card_id: transaction.credit_card_id,
        invoice_id: transaction.invoice_id,
        installment_purchase_id: transaction.installment_purchase_id,
        installment_number: transaction.installment_number,
        installments_count: transaction.installments_count,
        debt_id: transaction.debt_id,
      });

      if (insertError) {
        throw new Error(transactionSaveErrorMessage);
      }

      await fetchTransactions();
    },
    [fetchTransactions, user],
  );

  const updateTransaction = useCallback(
    async (id: string, transaction: TransactionMutation) => {
      if (!user) {
        throw new Error(sessionExpiredMessage);
      }

      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          category: transaction.category,
          date: transaction.date,
          observation: transaction.observation,
          income_source_id: transaction.income_source_id,
          recurring_expense_id: transaction.recurring_expense_id,
          credit_card_id: transaction.credit_card_id,
          invoice_id: transaction.invoice_id,
          installment_purchase_id: transaction.installment_purchase_id,
          installment_number: transaction.installment_number,
          installments_count: transaction.installments_count,
          debt_id: transaction.debt_id,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(transactionSaveErrorMessage);
      }

      await fetchTransactions();
    },
    [fetchTransactions, user],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!user) {
        throw new Error(sessionExpiredMessage);
      }

      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) {
        throw new Error(transactionDeleteErrorMessage);
      }

      await fetchTransactions();
    },
    [fetchTransactions, user],
  );

  const loadExampleData = useCallback(async () => {
    if (!user) {
      throw new Error(sessionExpiredMessage);
    }
    const today = new Date();
    const currentMonth = toInputDate(today).slice(0, 7);
    const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonth = toInputDate(nextMonthDate).slice(0, 7);
    const monthlyStart = `${currentMonth}-01`;
    const nextMonthDueDate = `${nextMonth}-20`;

    try {
      const { data: incomeSource, error: incomeSourceError } = await supabase.from("income_sources").insert({ user_id: user.id, name: "Salário principal", recurrence_type: "recurring", category: "Salário", expected_amount: 5000, status: "active" }).select().single();
      if (incomeSourceError || !incomeSource) throw new Error(exampleDataErrorMessage);
      const { data: recurringExpense, error: recurringExpenseError } = await supabase.from("recurring_expenses").insert({ user_id: user.id, name: "Aluguel", category: "Moradia", amount: 1500, due_day: 10, frequency: "monthly", start_date: monthlyStart, end_date: null, total_occurrences: null, payment_method: "Transferência", status: "active", notes: "Dado de demonstração" }).select().single();
      if (recurringExpenseError || !recurringExpense) throw new Error(exampleDataErrorMessage);
      const { data: card, error: cardError } = await supabase.from("credit_cards").insert({ user_id: user.id, name: "Cartão principal", institution: "Banco Exemplo", brand: "Visa", last_four_digits: "1234", credit_limit: 3000, closing_day: 12, due_day: 20, color: "#2563eb", status: "active" }).select().single();
      if (cardError || !card) throw new Error(exampleDataErrorMessage);
      const { data: currentInvoice, error: currentInvoiceError } = await supabase.from("invoices").insert({ user_id: user.id, credit_card_id: card.id, reference_month: currentMonth, closing_date: offsetDate(-4), due_date: offsetDate(2), status: "open", paid_at: null }).select().single();
      if (currentInvoiceError || !currentInvoice) throw new Error(exampleDataErrorMessage);
      const { data: nextInvoice, error: nextInvoiceError } = await supabase.from("invoices").insert({ user_id: user.id, credit_card_id: card.id, reference_month: nextMonth, closing_date: `${nextMonth}-12`, due_date: nextMonthDueDate, status: "open", paid_at: null }).select().single();
      if (nextInvoiceError || !nextInvoice) throw new Error(exampleDataErrorMessage);
      const { data: purchase, error: purchaseError } = await supabase.from("installment_purchases").insert({ user_id: user.id, description: "Notebook", category: "Educação", credit_card_id: card.id, purchase_date: offsetDate(-20), total_amount: 1200, installments_count: 3 }).select().single();
      if (purchaseError || !purchase) throw new Error(exampleDataErrorMessage);
      const { data: debt, error: debtError } = await supabase.from("debts").insert({ user_id: user.id, name: "Empréstimo pessoal", creditor: "Banco Exemplo", original_amount: 900, interest_rate: null, installment_amount: 300, total_installments: 3, due_day: today.getDate() + 4 > 28 ? 28 : today.getDate() + 4, status: "active", notes: "Dado de demonstração" }).select().single();
      if (debtError || !debt) throw new Error(exampleDataErrorMessage);
      const { data: goal, error: goalError } = await supabase.from("savings_goals").insert({ user_id: user.id, name: "Reserva de emergência", description: "Dado de demonstração", target_amount: 5000, target_date: offsetDate(30), status: "active" }).select().single();
      if (goalError || !goal) throw new Error(exampleDataErrorMessage);
      const { error: savingsError } = await supabase.from("savings_transactions").insert([{ user_id: user.id, goal_id: goal.id, type: "deposit", amount: 1800, date: offsetDate(-25), source: "Sobra do salário", note: "Dado de demonstração" }, { user_id: user.id, goal_id: goal.id, type: "withdrawal", amount: 200, date: offsetDate(-12), source: null, note: "Dado de demonstração" }, { user_id: user.id, goal_id: goal.id, type: "deposit", amount: 600, date: offsetDate(-2), source: "Freelance", note: "Dado de demonstração" }]);
      if (savingsError) throw new Error(exampleDataErrorMessage);
      const rows: Database["public"]["Tables"]["transactions"]["Insert"][] = [
        { user_id: user.id, description: "Salário", amount: 5000, type: "income", category: "Salário", date: offsetDate(-8), observation: "Dado de demonstração", income_source_id: incomeSource.id, recurring_expense_id: null, credit_card_id: null, invoice_id: null, installment_purchase_id: null, installment_number: null, installments_count: null, debt_id: null },
        { user_id: user.id, description: "Aluguel", amount: 1500, type: "expense", category: "Moradia", date: `${currentMonth}-10`, observation: "Dado de demonstração", income_source_id: null, recurring_expense_id: recurringExpense.id, credit_card_id: null, invoice_id: null, installment_purchase_id: null, installment_number: null, installments_count: null, debt_id: null },
        { user_id: user.id, description: "Supermercado", amount: 450.9, type: "expense", category: "Alimentação", date: offsetDate(-6), observation: "Dado de demonstração", income_source_id: null, recurring_expense_id: null, credit_card_id: null, invoice_id: null, installment_purchase_id: null, installment_number: null, installments_count: null, debt_id: null },
        { user_id: user.id, description: "Notebook", amount: 400, type: "expense", category: "Educação", date: offsetDate(-4), observation: "Dado de demonstração", income_source_id: null, recurring_expense_id: null, credit_card_id: card.id, invoice_id: currentInvoice.id, installment_purchase_id: purchase.id, installment_number: 2, installments_count: 3, debt_id: null },
        { user_id: user.id, description: "Notebook", amount: 400, type: "expense", category: "Educação", date: `${nextMonth}-12`, observation: "Dado de demonstração", income_source_id: null, recurring_expense_id: null, credit_card_id: card.id, invoice_id: nextInvoice.id, installment_purchase_id: purchase.id, installment_number: 3, installments_count: 3, debt_id: null },
        { user_id: user.id, description: "Pagamento: Empréstimo pessoal", amount: 300, type: "expense", category: "Dívidas", date: offsetDate(-10), observation: "Pix · Dado de demonstração", income_source_id: null, recurring_expense_id: null, credit_card_id: null, invoice_id: null, installment_purchase_id: null, installment_number: null, installments_count: null, debt_id: debt.id },
      ];
      const { error: insertError } = await supabase.from("transactions").insert(rows);
      if (insertError) throw new Error(exampleDataErrorMessage);
      await fetchTransactions();
    } catch (error) {
      throw error instanceof Error ? error : new Error(exampleDataErrorMessage);
    }
  }, [fetchTransactions, user]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    loadExampleData,
  };
}
