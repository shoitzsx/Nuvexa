import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { SavingsGoal, SavingsGoalMutation, SavingsTransaction, SavingsTransactionMutation } from "../types/savingsGoals";
import { useAuth } from "./useAuth";

function normalizeGoal(goal: SavingsGoal): SavingsGoal {
  return { ...goal, target_amount: Number(goal.target_amount) };
}

function normalizeTransaction(transaction: SavingsTransaction): SavingsTransaction {
  return { ...transaction, amount: Number(transaction.amount) };
}

export function useSavingsGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [savingsTransactions, setSavingsTransactions] = useState<SavingsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refetchSavingsGoals = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setSavingsTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [goalsResponse, transactionsResponse] = await Promise.all([
      supabase.from("savings_goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("savings_transactions").select("*").eq("user_id", user.id).order("date", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    setLoading(false);
    if (goalsResponse.error || transactionsResponse.error) throw new Error("Não foi possível carregar as metas de economia.");
    setGoals((goalsResponse.data ?? []).map(normalizeGoal));
    setSavingsTransactions((transactionsResponse.data ?? []).map(normalizeTransaction));
  }, [user]);

  useEffect(() => { refetchSavingsGoals().catch(() => undefined); }, [refetchSavingsGoals]);

  const createSavingsGoal = useCallback(async (goal: SavingsGoalMutation) => {
    if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
    const { error } = await supabase.from("savings_goals").insert({ ...goal, user_id: user.id });
    if (error) throw new Error("Não foi possível salvar a meta.");
    await refetchSavingsGoals();
  }, [refetchSavingsGoals, user]);

  const updateSavingsGoal = useCallback(async (id: string, goal: SavingsGoalMutation) => {
    const { error } = await supabase.from("savings_goals").update(goal).eq("id", id).eq("user_id", user?.id ?? "");
    if (error) throw new Error("Não foi possível atualizar a meta.");
    await refetchSavingsGoals();
  }, [refetchSavingsGoals, user]);

  const deleteSavingsGoal = useCallback(async (id: string) => {
    const { error } = await supabase.from("savings_goals").delete().eq("id", id).eq("user_id", user?.id ?? "");
    if (error) throw new Error("Não foi possível excluir a meta.");
    await refetchSavingsGoals();
  }, [refetchSavingsGoals, user]);

  const createSavingsTransaction = useCallback(async (transaction: SavingsTransactionMutation) => {
    if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
    const { error } = await supabase.from("savings_transactions").insert({ ...transaction, user_id: user.id });
    if (error) throw new Error("Não foi possível registrar a movimentação da meta.");
    await refetchSavingsGoals();
  }, [refetchSavingsGoals, user]);

  const deleteSavingsTransaction = useCallback(async (id: string) => {
    const { error } = await supabase.from("savings_transactions").delete().eq("id", id).eq("user_id", user?.id ?? "");
    if (error) throw new Error("Não foi possível excluir a movimentação da meta.");
    await refetchSavingsGoals();
  }, [refetchSavingsGoals, user]);

  return { goals, savingsTransactions, loading, createSavingsGoal, updateSavingsGoal, deleteSavingsGoal, createSavingsTransaction, deleteSavingsTransaction, refetchSavingsGoals };
}