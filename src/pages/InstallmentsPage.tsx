import { ChevronDown, CreditCard, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useCreditCards } from "../hooks/useCreditCards";
import { useInstallmentPurchases } from "../hooks/useInstallmentPurchases";
import { useTransactions } from "../hooks/useTransactions";
import { formatCurrency, formatDate } from "../lib/formatters";
import type { InstallmentPurchase } from "../types/installments";

type SortOption = "ending" | "remaining" | "highest" | "lowest" | "monthly" | "card" | "due";

export function InstallmentsPage() {
  const { installmentPurchases, loading, deleteInstallmentPurchase } = useInstallmentPurchases();
  const { creditCards, invoices } = useCreditCards();
  const { transactions } = useTransactions();
  const [sort, setSort] = useState<SortOption>("ending");
  const [selected, setSelected] = useState<InstallmentPurchase | null>(null);
  const [toDelete, setToDelete] = useState<InstallmentPurchase | null>(null);
  const [deleting, setDeleting] = useState(false);
  const activePurchases = installmentPurchases.filter((purchase) => transactions.some((transaction) => transaction.installment_purchase_id === purchase.id && (!transaction.invoice_id || invoices.find((invoice) => invoice.id === transaction.invoice_id)?.status !== "paid")));
  const details = activePurchases.map((purchase) => {
    const installments = transactions.filter((transaction) => transaction.installment_purchase_id === purchase.id).sort((left, right) => (left.installment_number ?? 0) - (right.installment_number ?? 0));
    const paid = installments.filter((transaction) => transaction.invoice_id && invoices.find((invoice) => invoice.id === transaction.invoice_id)?.status === "paid").length;
    const remaining = purchase.installments_count - paid;
    const next = installments.find((transaction) => !transaction.invoice_id || invoices.find((invoice) => invoice.id === transaction.invoice_id)?.status !== "paid");
    const card = creditCards.find((item) => item.id === purchase.credit_card_id);
    return { purchase, installments, paid, remaining, next, card };
  }).sort((left, right) => {
    if (sort === "remaining" || sort === "ending") return sort === "ending" ? left.remaining - right.remaining : right.remaining - left.remaining;
    if (sort === "highest") return right.purchase.total_amount - left.purchase.total_amount;
    if (sort === "lowest") return left.purchase.total_amount - right.purchase.total_amount;
    if (sort === "monthly") return (right.next?.amount ?? 0) - (left.next?.amount ?? 0);
    if (sort === "card") return (left.card?.name ?? "").localeCompare(right.card?.name ?? "");
    return (left.next?.date ?? "").localeCompare(right.next?.date ?? "");
  });
  async function remove() { if (!toDelete) return; setDeleting(true); try { await deleteInstallmentPurchase(toDelete.id); toast.success("Parcelamento e todas as parcelas foram excluídos.", { id: "installment-deleted" }); setToDelete(null); setSelected(null); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível excluir o parcelamento.", { id: "installment-delete-error" }); } finally { setDeleting(false); } }
  return <div className="grid gap-6"><section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold text-slate-950 dark:text-white">Parcelamentos</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Compras no cartão com parcelas já distribuídas pelas faturas futuras.</p></div><label className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">Ordenar por<select className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={(event) => setSort(event.target.value as SortOption)} value={sort}><option value="ending">Terminando primeiro</option><option value="remaining">Mais parcelas restantes</option><option value="highest">Maior valor total</option><option value="lowest">Menor valor total</option><option value="monthly">Maior parcela mensal</option><option value="card">Cartão</option><option value="due">Próximo vencimento</option></select></label></section>{loading ? <div className="h-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" /> : details.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">Nenhum parcelamento em andamento.</div> : <div className="grid gap-4">{details.map(({ purchase, installments, paid, remaining, next, card }) => <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" key={purchase.id}><button className="flex w-full items-start justify-between gap-4 text-left" onClick={() => setSelected(purchase)} type="button"><div><h2 className="font-semibold text-slate-950 dark:text-white">{purchase.description}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{card?.name ?? "Cartão removido"} · {paid}/{purchase.installments_count} pagas · {remaining} restantes</p><p className="mt-2 font-semibold text-negative-600 dark:text-negative-100">{formatCurrency(next?.amount ?? 0)} por parcela</p></div><ChevronDown aria-hidden="true" className="text-slate-400" size={20} /></button><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-brand-600" style={{ width: `${(paid / purchase.installments_count) * 100}%` }} /></div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Próxima parcela: {next ? formatDate(next.date) : "Nenhuma"}</p><Button className="mt-4 min-h-10 px-3" icon={<Trash2 aria-hidden="true" size={16} />} onClick={() => setToDelete(purchase)} variant="danger">Cancelar parcelamento</Button></article>)}</div>}{selected ? <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><CreditCard aria-hidden="true" size={20} /><h2 className="text-lg font-semibold text-slate-950 dark:text-white">Parcelas de {selected.description}</h2></div><div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{transactions.filter((transaction) => transaction.installment_purchase_id === selected.id).sort((left, right) => (left.installment_number ?? 0) - (right.installment_number ?? 0)).map((transaction) => { const invoice = invoices.find((item) => item.id === transaction.invoice_id); return <div className="flex items-center justify-between gap-4 py-3" key={transaction.id}><span><span className="block font-medium text-slate-950 dark:text-white">Parcela {transaction.installment_number}/{transaction.installments_count}</span><span className="text-sm text-slate-500 dark:text-slate-400">Fatura {invoice?.reference_month ?? "removida"} · vence {invoice ? formatDate(invoice.due_date) : "-"}</span></span><span className="font-semibold text-negative-600 dark:text-negative-100">{formatCurrency(transaction.amount)}</span></div>; })}</div></section> : null}<ConfirmDialog confirmLabel="Excluir todas as parcelas" description="Esta ação remove a compra parcelada e todas as suas parcelas, inclusive as que já pertencem a faturas pagas ou fechadas." isLoading={deleting} isOpen={Boolean(toDelete)} onCancel={() => setToDelete(null)} onConfirm={remove} title="Cancelar parcelamento?" /></div>;
}