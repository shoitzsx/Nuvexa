import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import type { RecurringExpense, RecurringExpenseMutation } from "../types/recurringExpenses";

function normalizeExpense(expense: RecurringExpense): RecurringExpense {
  return { ...expense, amount: Number(expense.amount) };
}

export function useRecurringExpenses() {
  const { user } = useAuth();
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecurringExpenses = useCallback(async () => {
    if (!user) { setRecurringExpenses([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("recurring_expenses").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLoading(false);
    if (error) throw new Error("Não foi possível carregar as despesas fixas.");
    setRecurringExpenses((data ?? []).map(normalizeExpense));
  }, [user]);

  useEffect(() => { fetchRecurringExpenses().catch(() => undefined); }, [fetchRecurringExpenses]);

  const createRecurringExpense = useCallback(async (expense: RecurringExpenseMutation) => {
    if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
    const { error } = await supabase.from("recurring_expenses").insert({ ...expense, user_id: user.id });
    if (error) throw new Error("Não foi possível salvar a despesa fixa.");
    await fetchRecurringExpenses();
  }, [fetchRecurringExpenses, user]);

  const updateRecurringExpense = useCallback(async (id: string, expense: RecurringExpenseMutation) => {
    const { error } = await supabase.from("recurring_expenses").update(expense).eq("id", id).eq("user_id", user?.id ?? "");
    if (error) throw new Error("Não foi possível atualizar a despesa fixa.");
    await fetchRecurringExpenses();
  }, [fetchRecurringExpenses, user]);

  const deleteRecurringExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from("recurring_expenses").delete().eq("id", id).eq("user_id", user?.id ?? "");
    if (error) throw new Error("Não foi possível excluir a despesa fixa.");
    await fetchRecurringExpenses();
  }, [fetchRecurringExpenses, user]);

  const generateCurrentOccurrences = useCallback(async () => {
    if (!user) return 0;
    const { data, error } = await supabase.rpc("generate_current_recurring_expenses");
    if (error) throw new Error("Não foi possível gerar as despesas recorrentes deste mês.");
    await fetchRecurringExpenses();
    return data ?? 0;
  }, [fetchRecurringExpenses, user]);

  return { recurringExpenses, loading, createRecurringExpense, updateRecurringExpense, deleteRecurringExpense, generateCurrentOccurrences };
}