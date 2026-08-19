import { useCallback, useEffect, useState } from "react";
import { calculateInvoiceCycle } from "../lib/invoiceCycle";
import { supabase } from "../lib/supabase";
import type { CreditCard, CreditCardMutation, Invoice, InvoiceCycle } from "../types/creditCards";
import { useAuth } from "./useAuth";

function normalizeCard(card: CreditCard): CreditCard { return { ...card, credit_limit: Number(card.credit_limit) }; }

export function useCreditCards() {
  const { user } = useAuth();
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchCreditCards = useCallback(async () => {
    if (!user) { setCreditCards([]); setInvoices([]); setLoading(false); return; }
    setLoading(true);
    const [cardsResult, invoicesResult] = await Promise.all([supabase.from("credit_cards").select("*").eq("user_id", user.id).order("created_at", { ascending: false }), supabase.from("invoices").select("*").eq("user_id", user.id).order("reference_month", { ascending: false })]);
    setLoading(false);
    if (cardsResult.error || invoicesResult.error) throw new Error("Não foi possível carregar os cartões.");
    setCreditCards((cardsResult.data ?? []).map(normalizeCard)); setInvoices(invoicesResult.data ?? []);
  }, [user]);
  useEffect(() => { fetchCreditCards().catch(() => undefined); }, [fetchCreditCards]);
  const createCreditCard = useCallback(async (card: CreditCardMutation) => { if (!user) throw new Error("Sua sessão expirou. Entre novamente."); const { error } = await supabase.from("credit_cards").insert({ ...card, user_id: user.id }); if (error) throw new Error("Não foi possível salvar o cartão."); await fetchCreditCards(); }, [fetchCreditCards, user]);
  const updateCreditCard = useCallback(async (id: string, card: CreditCardMutation) => { const { error } = await supabase.from("credit_cards").update(card).eq("id", id).eq("user_id", user?.id ?? ""); if (error) throw new Error("Não foi possível atualizar o cartão."); await fetchCreditCards(); }, [fetchCreditCards, user]);
  const deleteCreditCard = useCallback(async (id: string) => { const { error } = await supabase.from("credit_cards").delete().eq("id", id).eq("user_id", user?.id ?? ""); if (error) throw new Error("Não foi possível excluir o cartão."); await fetchCreditCards(); }, [fetchCreditCards, user]);
  const ensureInvoice = useCallback(async (card: CreditCard, purchaseDate: string) => {
    if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
    const cycle = calculateInvoiceCycle(purchaseDate, card.closing_day, card.due_day);
    const { data: existing, error: readError } = await supabase.from("invoices").select("*").eq("credit_card_id", card.id).eq("reference_month", cycle.referenceMonth).maybeSingle();
    if (readError) throw new Error("Não foi possível localizar a fatura.");
    if (existing) return existing;
    const { data, error } = await supabase.from("invoices").insert({ user_id: user.id, credit_card_id: card.id, reference_month: cycle.referenceMonth, closing_date: cycle.closingDate, due_date: cycle.dueDate, status: "open", paid_at: null }).select().single();
    if (!error && data) { await fetchCreditCards(); return data; }
    const { data: concurrent, error: concurrentError } = await supabase.from("invoices").select("*").eq("credit_card_id", card.id).eq("reference_month", cycle.referenceMonth).single();
    if (concurrentError || !concurrent) throw new Error("Não foi possível criar a fatura.");
    return concurrent;
  }, [fetchCreditCards, user]);
  const markInvoicePaid = useCallback(async (invoiceId: string, paidAt: string) => { const { error } = await supabase.from("invoices").update({ status: "paid", paid_at: paidAt }).eq("id", invoiceId).eq("user_id", user?.id ?? ""); if (error) throw new Error("Não foi possível marcar a fatura como paga."); await fetchCreditCards(); }, [fetchCreditCards, user]);
  return { creditCards, invoices, loading, createCreditCard, updateCreditCard, deleteCreditCard, ensureInvoice, markInvoicePaid, refetchCreditCards: fetchCreditCards };
}