import { useCallback, useEffect, useState } from "react";
import { calculateInstallmentSchedule } from "../lib/installmentSchedule";
import { supabase } from "../lib/supabase";
import type { CreditCard } from "../types/creditCards";
import type { InstallmentPurchase, InstallmentPurchaseMutation } from "../types/installments";
import { useAuth } from "./useAuth";
import { useCreditCards } from "./useCreditCards";

function normalizePurchase(purchase: InstallmentPurchase): InstallmentPurchase {
  return { ...purchase, total_amount: Number(purchase.total_amount) };
}

export function useInstallmentPurchases() {
  const { user } = useAuth();
  const { ensureInvoice } = useCreditCards();
  const [installmentPurchases, setInstallmentPurchases] = useState<InstallmentPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInstallmentPurchases = useCallback(async () => {
    if (!user) { setInstallmentPurchases([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("installment_purchases").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLoading(false);
    if (error) throw new Error("Não foi possível carregar os parcelamentos.");
    setInstallmentPurchases((data ?? []).map(normalizePurchase));
  }, [user]);

  useEffect(() => { fetchInstallmentPurchases().catch(() => undefined); }, [fetchInstallmentPurchases]);

  const createInstallmentPurchase = useCallback(async (purchase: InstallmentPurchaseMutation, card: CreditCard) => {
    if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
    const { data: createdPurchase, error: purchaseError } = await supabase.from("installment_purchases").insert({ ...purchase, user_id: user.id }).select().single();
    if (purchaseError || !createdPurchase) throw new Error("Não foi possível criar a compra parcelada.");

    try {
      const schedule = calculateInstallmentSchedule(purchase.purchase_date, purchase.total_amount, purchase.installments_count, card);
      const invoiceIds = await Promise.all(schedule.map(async (item) => (await ensureInvoice(card, item.cycle.closingDate)).id));
      const { error: transactionsError } = await supabase.from("transactions").insert(schedule.map((item, index) => ({
        user_id: user.id,
        description: purchase.description,
        amount: item.amount,
        type: "expense" as const,
        category: purchase.category,
        date: item.cycle.closingDate,
        observation: null,
        income_source_id: null,
        recurring_expense_id: null,
        credit_card_id: card.id,
        invoice_id: invoiceIds[index],
        installment_purchase_id: createdPurchase.id,
        installment_number: item.installmentNumber,
        installments_count: purchase.installments_count,
      })));
      if (transactionsError) throw new Error("Não foi possível gerar as parcelas.");
    } catch (error) {
      await supabase.from("installment_purchases").delete().eq("id", createdPurchase.id).eq("user_id", user.id);
      throw error;
    }

    await fetchInstallmentPurchases();
  }, [ensureInvoice, fetchInstallmentPurchases, user]);

  const deleteInstallmentPurchase = useCallback(async (id: string) => {
    const { error } = await supabase.from("installment_purchases").delete().eq("id", id).eq("user_id", user?.id ?? "");
    if (error) throw new Error("Não foi possível excluir o parcelamento.");
    await fetchInstallmentPurchases();
  }, [fetchInstallmentPurchases, user]);

  return { installmentPurchases, loading, createInstallmentPurchase, deleteInstallmentPurchase, refetchInstallmentPurchases: fetchInstallmentPurchases };
}