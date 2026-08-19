import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Debt, DebtMutation } from "../types/debts";
import { useAuth } from "./useAuth";

function normalizeDebt(debt: Debt): Debt {
  return { ...debt, original_amount: Number(debt.original_amount), interest_rate: debt.interest_rate === null ? null : Number(debt.interest_rate), installment_amount: debt.installment_amount === null ? null : Number(debt.installment_amount) };
}

export function useDebts() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchDebts = useCallback(async () => {
    if (!user) { setDebts([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("debts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLoading(false);
    if (error) throw new Error("Não foi possível carregar as dívidas.");
    setDebts((data ?? []).map(normalizeDebt));
  }, [user]);
  useEffect(() => { fetchDebts().catch(() => undefined); }, [fetchDebts]);
  const createDebt = useCallback(async (debt: DebtMutation) => { if (!user) throw new Error("Sua sessão expirou. Entre novamente."); const { error } = await supabase.from("debts").insert({ ...debt, user_id: user.id }); if (error) throw new Error("Não foi possível salvar a dívida."); await fetchDebts(); }, [fetchDebts, user]);
  const updateDebt = useCallback(async (id: string, debt: DebtMutation) => { const { error } = await supabase.from("debts").update(debt).eq("id", id).eq("user_id", user?.id ?? ""); if (error) throw new Error("Não foi possível atualizar a dívida."); await fetchDebts(); }, [fetchDebts, user]);
  const deleteDebt = useCallback(async (id: string) => { const { error } = await supabase.from("debts").delete().eq("id", id).eq("user_id", user?.id ?? ""); if (error) throw new Error("Não foi possível excluir a dívida."); await fetchDebts(); }, [fetchDebts, user]);
  return { debts, loading, createDebt, updateDebt, deleteDebt, refetchDebts: fetchDebts };
}