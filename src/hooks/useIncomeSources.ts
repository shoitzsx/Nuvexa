import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "../lib/supabase";
import type { IncomeSource, IncomeSourceMutation } from "../types/incomeSources";

function normalizeIncomeSource(row: IncomeSource): IncomeSource {
  return {
    ...row,
    expected_amount:
      row.expected_amount === null ? null : Number(row.expected_amount),
  };
}

export function useIncomeSources() {
  const { user } = useAuth();
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncomeSources = useCallback(async () => {
    if (!user) {
      setIncomeSources([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setLoading(false);
      throw new Error("Não foi possível carregar as fontes de renda.");
    }

    setIncomeSources((data ?? []).map(normalizeIncomeSource));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchIncomeSources().catch(() => undefined);
  }, [fetchIncomeSources]);

  const createIncomeSource = useCallback(
    async (source: IncomeSourceMutation) => {
      if (!user) {
        throw new Error("Sua sessão expirou. Entre novamente.");
      }

      const { error } = await supabase.from("income_sources").insert({
        ...source,
        user_id: user.id,
      });

      if (error) {
        throw new Error("Não foi possível salvar a fonte de renda.");
      }

      await fetchIncomeSources();
    },
    [fetchIncomeSources, user],
  );

  const updateIncomeSource = useCallback(
    async (id: string, source: IncomeSourceMutation) => {
      const { error } = await supabase
        .from("income_sources")
        .update(source)
        .eq("id", id)
        .eq("user_id", user?.id ?? "");

      if (error) {
        throw new Error("Não foi possível atualizar a fonte de renda.");
      }

      await fetchIncomeSources();
    },
    [fetchIncomeSources, user],
  );

  const deleteIncomeSource = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("income_sources")
        .delete()
        .eq("id", id)
        .eq("user_id", user?.id ?? "");

      if (error) {
        throw new Error("Não foi possível excluir a fonte de renda.");
      }

      await fetchIncomeSources();
    },
    [fetchIncomeSources, user],
  );

  return {
    incomeSources,
    loading,
    createIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
  };
}