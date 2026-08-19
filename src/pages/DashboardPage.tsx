import { Database, PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/Button";
import { ChartsPanel } from "../components/ChartsPanel";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  type FeedbackMessage,
  InlineFeedback,
} from "../components/InlineFeedback";
import { SummaryCards } from "../components/SummaryCards";
import { TransactionFilters } from "../components/TransactionFilters";
import { TransactionForm } from "../components/TransactionForm";
import { TransactionTable } from "../components/TransactionTable";
import { IncomeSourcesSummary } from "../components/IncomeSourcesSummary";
import { RecurringExpensesSummary } from "../components/RecurringExpensesSummary";
import { CreditCardsSummary } from "../components/CreditCardsSummary";
import { DebtsSummary } from "../components/DebtsSummary";
import { SavingsGoalsSummary } from "../components/SavingsGoalsSummary";
import { emptyTransactionFilters } from "../constants/transactions";
import { useTransactions } from "../hooks/useTransactions";
import { useIncomeSources } from "../hooks/useIncomeSources";
import { useRecurringExpenses } from "../hooks/useRecurringExpenses";
import { useCreditCards } from "../hooks/useCreditCards";
import { useInstallmentPurchases } from "../hooks/useInstallmentPurchases";
import { useDebts } from "../hooks/useDebts";
import { useSavingsGoals } from "../hooks/useSavingsGoals";
import {
  exampleDataErrorMessage,
  sessionExpiredMessage,
  transactionDeleteErrorMessage,
  transactionSaveErrorMessage,
} from "../lib/userMessages";
import type {
  Transaction,
  TransactionFilters as TransactionFiltersType,
  TransactionMutation,
} from "../types/transactions";

const safeMessages = new Set([
  exampleDataErrorMessage,
  sessionExpiredMessage,
  transactionDeleteErrorMessage,
  transactionSaveErrorMessage,
]);

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && safeMessages.has(error.message)) {
    return error.message;
  }

  return fallback;
}

export function DashboardPage() {
  const [filters, setFilters] =
    useState<TransactionFiltersType>(emptyTransactionFilters);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(
    null,
  );
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);

  const {
    createTransaction,
    deleteTransaction,
    error,
    loadExampleData,
    loading,
    refetch,
    transactions,
    updateTransaction,
  } = useTransactions(filters);
  const { incomeSources } = useIncomeSources();
  const { generateCurrentOccurrences } = useRecurringExpenses();
  const { creditCards, invoices, ensureInvoice, refetchCreditCards } = useCreditCards();
  const { createInstallmentPurchase } = useInstallmentPurchases();
  const { debts } = useDebts();
  const { goals, savingsTransactions } = useSavingsGoals();

  useEffect(() => {
    async function generateOccurrences() {
      try {
        const generated = await generateCurrentOccurrences();
        if (generated > 0) {
          await refetch();
          toast.success(
            generated === 1
              ? "1 despesa recorrente foi adicionada ao mês atual."
              : `${generated} despesas recorrentes foram adicionadas ao mês atual.`,
            { id: "recurring-expenses-generated" },
          );
        }
      } catch (generationError) {
        toast.error(
          generationError instanceof Error
            ? generationError.message
            : "Não foi possível gerar as despesas recorrentes deste mês.",
          { id: "recurring-expenses-generation-error" },
        );
      }
    }

    generateOccurrences();
  }, [generateCurrentOccurrences, refetch]);

  useEffect(() => {
    if (error) {
      toast.error(error, { id: "transaction-load-error" });
    }
  }, [error]);

  async function handleSubmit(transaction: TransactionMutation, installmentsCount: number | null) {
    setSubmitting(true);
    setFeedback(null);

    try {
      const selectedCard = creditCards.find(
        (card) => card.id === transaction.credit_card_id,
      );
      if (installmentsCount !== null) {
        if (!selectedCard || !Number.isInteger(installmentsCount) || installmentsCount < 2) {
          throw new Error("Escolha um cartão e informe pelo menos 2 parcelas.");
        }
        await createInstallmentPurchase({
          description: transaction.description,
          category: transaction.category,
          credit_card_id: selectedCard.id,
          purchase_date: transaction.date,
          total_amount: transaction.amount,
          installments_count: installmentsCount,
        }, selectedCard);
        await Promise.all([refetch(), refetchCreditCards()]);
        toast.success("Compra parcelada adicionada!", { id: "installment-created" });
        return;
      }
      const transactionWithInvoice = selectedCard
        ? {
            ...transaction,
            invoice_id: (await ensureInvoice(selectedCard, transaction.date)).id,
          }
        : transaction;

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, transactionWithInvoice);
        setEditingTransaction(null);
        toast.success("Transação atualizada!", { id: "transaction-updated" });
        setFeedback({
          type: "success",
          message: "Movimentação atualizada.",
        });
      } else {
        await createTransaction(transactionWithInvoice);
        toast.success("Transação adicionada!", { id: "transaction-created" });
        setFeedback({
          type: "success",
          message: "Movimentação adicionada.",
        });
      }
    } catch (submitError) {
      const message = getSafeErrorMessage(submitError, transactionSaveErrorMessage);
      toast.error(message, { id: "transaction-save-error" });
      setFeedback({
        type: "error",
        message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!transactionToDelete) {
      return;
    }

    setDeleting(true);
    setFeedback(null);

    try {
      await deleteTransaction(transactionToDelete.id);
      setTransactionToDelete(null);
      toast.success("Transação excluída!", { id: "transaction-deleted" });
      setFeedback({
        type: "success",
        message: "Movimentação excluída.",
      });
    } catch (deleteError) {
      const message = getSafeErrorMessage(deleteError, transactionDeleteErrorMessage);
      toast.error(message, { id: "transaction-delete-error" });
      setFeedback({
        type: "error",
        message,
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleLoadExamples() {
    setLoadingExamples(true);
    setFeedback(null);

    try {
      await loadExampleData();
      toast.success("Dados de demonstração carregados.", { id: "example-data-loaded" });
      setFeedback({
        type: "success",
        message: "Dados de demonstração carregados para seu usuário.",
      });
    } catch (sampleError) {
      const message = getSafeErrorMessage(sampleError, exampleDataErrorMessage);
      toast.error(message, { id: "example-data-error" });
      setFeedback({
        type: "error",
        message,
      });
    } finally {
      setLoadingExamples(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-white">
            Dashboard financeiro
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Indicadores calculados com os filtros ativos.
          </p>
        </div>
        <Button
          icon={<Database aria-hidden="true" size={18} />}
          isLoading={loadingExamples}
          onClick={handleLoadExamples}
          variant="secondary"
        >
          Carregar dados de exemplo
        </Button>
      </section>

      <InlineFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

      {error ? (
        <InlineFeedback
          feedback={{
            type: "error",
            message: error,
          }}
        />
      ) : null}

      <TransactionFilters filters={filters} onChange={setFilters} />

      <SummaryCards transactions={transactions} />

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <TransactionForm
          editingTransaction={editingTransaction}
          isSubmitting={submitting}
          onCancelEdit={() => setEditingTransaction(null)}
          onSubmit={handleSubmit}
          incomeSources={incomeSources}
          creditCards={creditCards}
        />

        <section className="grid gap-4">
          <div className="flex items-center gap-2 text-slate-950 dark:text-white">
            <PlusCircle aria-hidden="true" size={20} />
            <h2 className="text-lg font-semibold">Movimentações</h2>
          </div>
          {loading ? (
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="h-5 w-2/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
              <span className="sr-only">Carregando movimentações</span>
            </div>
          ) : (
            <TransactionTable
              onDelete={setTransactionToDelete}
              onEdit={setEditingTransaction}
              transactions={transactions}
            />
          )}
        </section>
      </div>

      <ChartsPanel transactions={transactions} />
      <IncomeSourcesSummary incomeSources={incomeSources} transactions={transactions} />
      <RecurringExpensesSummary transactions={transactions} />
      <CreditCardsSummary creditCards={creditCards} invoices={invoices} transactions={transactions} />
      <DebtsSummary debts={debts} transactions={transactions} />
      <SavingsGoalsSummary goals={goals} savingsTransactions={savingsTransactions} />

      <ConfirmDialog
        confirmLabel="Excluir"
        description="Esta ação remove a movimentação selecionada e atualiza os indicadores do dashboard."
        isLoading={deleting}
        isOpen={Boolean(transactionToDelete)}
        onCancel={() => setTransactionToDelete(null)}
        onConfirm={handleDeleteConfirmed}
        title="Excluir movimentação?"
      />
    </div>
  );
}
