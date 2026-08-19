import { Plus, Save, TrendingDown, TrendingUp, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  addTransactionCategory,
  getTransactionCategories,
  transactionTypeLabels,
} from "../constants/transactions";
import { formatCurrency, parseAmount, toInputDate } from "../lib/formatters";
import {
  type TransactionFormErrors,
  type TransactionFormValues,
  validateTransactionForm,
} from "../lib/validation";
import type { Transaction, TransactionMutation } from "../types/transactions";
import type { IncomeSource } from "../types/incomeSources";
import { calculateInvoiceCycle } from "../lib/invoiceCycle";
import { calculateInstallmentSchedule } from "../lib/installmentSchedule";
import { formatDate } from "../lib/formatters";
import type { CreditCard } from "../types/creditCards";
import { Button } from "./Button";

interface TransactionFormProps {
  editingTransaction: Transaction | null;
  isSubmitting: boolean;
  onCancelEdit: () => void;
  onSubmit: (transaction: TransactionMutation, installmentsCount: number | null) => Promise<void>;
  incomeSources: IncomeSource[];
  creditCards: CreditCard[];
}

const emptyForm: TransactionFormValues = {
  description: "",
  amount: "",
  type: "expense",
  category: "",
  date: toInputDate(new Date()),
  observation: "",
  income_source_id: "",
  recurring_expense_id: "",
  credit_card_id: "",
  invoice_id: "",
  installment_purchase_id: "",
  installment_number: "",
  installments_count: "",
  debt_id: "",
};

function formFromTransaction(transaction: Transaction): TransactionFormValues {
  return {
    description: transaction.description,
    amount: String(transaction.amount).replace(".", ","),
    type: transaction.type,
    category: transaction.category,
    date: transaction.date,
    observation: transaction.observation ?? "",
    income_source_id: transaction.income_source_id ?? "",
    recurring_expense_id: transaction.recurring_expense_id ?? "",
    credit_card_id: transaction.credit_card_id ?? "",
    invoice_id: transaction.invoice_id ?? "",
    installment_purchase_id: transaction.installment_purchase_id ?? "",
    installment_number: transaction.installment_number ? String(transaction.installment_number) : "",
    installments_count: transaction.installments_count ? String(transaction.installments_count) : "",
    debt_id: transaction.debt_id ?? "",
  };
}

function fieldError(errors: TransactionFormErrors, field: keyof TransactionFormValues) {
  return errors[field] ? (
    <p className="text-sm font-medium text-negative-600 dark:text-negative-100">
      {errors[field]}
    </p>
  ) : null;
}

export function TransactionForm({
  editingTransaction,
  isSubmitting,
  onCancelEdit,
  onSubmit,
  incomeSources,
  creditCards,
}: TransactionFormProps) {
  const [values, setValues] = useState<TransactionFormValues>(emptyForm);
  const [errors, setErrors] = useState<TransactionFormErrors>({});
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);
  const availableCategories = getTransactionCategories();
  const selectedCreditCard = creditCards.find((card) => card.id === values.credit_card_id);
  const invoicePreview = selectedCreditCard && values.date
    ? calculateInvoiceCycle(values.date, selectedCreditCard.closing_day, selectedCreditCard.due_day)
    : null;
  const parsedAmount = parseAmount(values.amount);
  const installmentsPreview = selectedCreditCard && values.installments_count && Number(values.installments_count) >= 2 && Number.isFinite(parsedAmount) && parsedAmount > 0
    ? calculateInstallmentSchedule(values.date, parsedAmount, Number(values.installments_count), selectedCreditCard)
    : [];

  useEffect(() => {
    setValues(editingTransaction ? formFromTransaction(editingTransaction) : emptyForm);
    setErrors({});
  }, [editingTransaction]);

  function updateValues(nextValues: Partial<TransactionFormValues>) {
    setValues((currentValues) => Object.assign({}, currentValues, nextValues));
  }

  function handleCreateCategory() {
    const trimmedCategory = newCategoryName.trim();

    try {
      const createdCategory = addTransactionCategory(trimmedCategory);
      updateValues({ category: createdCategory });
      setNewCategoryName("");
      setNewCategoryError(null);
      setIsCreatingCategory(false);
    } catch (error) {
      setNewCategoryError(
        error instanceof Error ? error.message : "Não foi possível criar a categoria.",
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTransactionForm(values);
    setErrors(result.errors);

    if (!result.data) {
      return;
    }

    const installmentsCount = values.credit_card_id && values.installments_count
      ? Number(values.installments_count)
      : null;
    await onSubmit(result.data, installmentsCount);

    if (!editingTransaction) {
      setValues(emptyForm);
    }
  }

  const title = editingTransaction ? "Editar movimentação" : "Nova movimentação";

  return (
    <motion.section
      layout
      aria-labelledby="transaction-form-title"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      transition={{ duration: 0.2 }}
    >
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <AnimatePresence initial={false} mode="wait">
            <motion.h2
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-semibold text-slate-950 dark:text-white"
              exit={{ opacity: 0, y: -4 }}
              id="transaction-form-title"
              initial={{ opacity: 0, y: 4 }}
              key={title}
              transition={{ duration: 0.18 }}
            >
              {title}
            </motion.h2>
          </AnimatePresence>
          {editingTransaction ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {formatCurrency(editingTransaction.amount)}
            </p>
          ) : null}
        </div>
        {editingTransaction ? (
          <Button
            icon={<X aria-hidden="true" size={18} />}
            onClick={onCancelEdit}
            variant="ghost"
          >
            Cancelar edição
          </Button>
        ) : null}
      </div>

      <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Descrição
          <input
            aria-invalid={Boolean(errors.description)}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 transition placeholder:text-slate-400 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            onChange={(event) => updateValues({ description: event.target.value })}
            placeholder="Supermercado"
            value={values.description}
          />
          {fieldError(errors, "description")}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Valor
            <input
              aria-invalid={Boolean(errors.amount)}
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 transition placeholder:text-slate-400 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              inputMode="decimal"
              onChange={(event) => updateValues({ amount: event.target.value })}
              placeholder="1.250,50"
              value={values.amount}
            />
            {fieldError(errors, "amount")}
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Data
            <input
              aria-invalid={Boolean(errors.date)}
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              onChange={(event) => updateValues({ date: event.target.value })}
              type="date"
              value={values.date}
            />
            {fieldError(errors, "date")}
          </label>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Tipo
          </span>
          <div
            aria-label="Tipo da movimentação"
            className="grid gap-2 sm:grid-cols-2"
            role="group"
          >
            <button
              aria-pressed={values.type === "income"}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                values.type === "income"
                  ? "border-positive-600 bg-positive-50 text-positive-600 dark:border-positive-500 dark:bg-positive-600/15 dark:text-positive-100"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
              onClick={() => updateValues({ type: "income", credit_card_id: "", invoice_id: "" })}
              type="button"
            >
              <TrendingUp aria-hidden="true" size={18} />
              {transactionTypeLabels.income}
            </button>
            <button
              aria-pressed={values.type === "expense"}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                values.type === "expense"
                  ? "border-negative-600 bg-negative-50 text-negative-600 dark:border-negative-500 dark:bg-negative-600/15 dark:text-negative-100"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
              onClick={() => updateValues({ type: "expense", income_source_id: "" })}
              type="button"
            >
              <TrendingDown aria-hidden="true" size={18} />
              {transactionTypeLabels.expense}
            </button>
          </div>
          {fieldError(errors, "type")}
        </div>

        {values.type === "income" ? (
          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Fonte de renda <span className="font-normal text-slate-500 dark:text-slate-400">(opcional)</span>
            <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={(event) => updateValues({ income_source_id: event.target.value })} value={values.income_source_id}>
              <option value="">Sem fonte associada</option>
              {incomeSources.filter((source) => source.status === "active" || source.id === values.income_source_id).map((source) => <option key={source.id} value={source.id}>{source.name}{source.status === "inactive" ? " (inativa)" : ""}</option>)}
            </select>
          </label>
        ) : null}

        {values.type === "expense" ? (
          <div className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <label className="grid gap-2">
              Cartão de crédito <span className="font-normal text-slate-500 dark:text-slate-400">(opcional)</span>
              <select className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={(event) => updateValues({ credit_card_id: event.target.value, invoice_id: "" })} value={values.credit_card_id}>
                <option value="">Outra forma de pagamento</option>
                {creditCards.filter((card) => card.status === "active" || card.id === values.credit_card_id).map((card) => <option key={card.id} value={card.id}>{card.name}{card.last_four_digits ? ` • ${card.last_four_digits}` : ""}</option>)}
              </select>
            </label>
            {invoicePreview ? <p className="rounded-md bg-brand-50 p-3 text-sm font-medium text-brand-700 dark:bg-brand-600/15 dark:text-brand-100">Esta compra será incluída na fatura com vencimento em {formatDate(invoicePreview.dueDate)}.</p> : null}
            {selectedCreditCard ? (
              <label className="grid gap-2">
                <span className="flex items-center gap-2"><input checked={Boolean(values.installments_count)} onChange={(event) => updateValues({ installments_count: event.target.checked ? "2" : "" })} type="checkbox" /> Parcelar esta compra</span>
                {values.installments_count ? <input className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" min="2" onChange={(event) => updateValues({ installments_count: event.target.value })} placeholder="Número de parcelas" type="number" value={values.installments_count} /> : null}
              </label>
            ) : null}
            {installmentsPreview.length > 0 ? <div className="rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-600/15 dark:text-brand-100"><p className="font-semibold">Prévia das parcelas</p><div className="mt-2 grid gap-1">{installmentsPreview.map((item) => <p key={item.installmentNumber}>{item.installmentNumber}/{installmentsPreview.length}: {formatCurrency(item.amount)} · fatura {item.cycle.referenceMonth}, vence {formatDate(item.cycle.dueDate)}</p>)}</div></div> : null}
          </div>
        ) : null}

        <div className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <div className="flex items-center justify-between gap-2">
            <span>Categoria</span>
            <button
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              onClick={() => {
                setIsCreatingCategory((currentValue) => !currentValue);
                setNewCategoryError(null);
              }}
              type="button"
            >
              <Plus aria-hidden="true" size={14} />
              Nova categoria
            </button>
          </div>

          <select
            aria-invalid={Boolean(errors.category)}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            onChange={(event) =>
              updateValues({
                category: event.target.value as TransactionFormValues["category"],
              })
            }
            value={values.category}
          >
            <option value="">Selecione</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {isCreatingCategory ? (
            <div className="grid gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
              <input
                className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateCategory();
                  }
                }}
                placeholder="Ex.: Mercado, Viagem"
                value={newCategoryName}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleCreateCategory}
                  type="button"
                  variant="secondary"
                >
                  Salvar categoria
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setIsCreatingCategory(false);
                    setNewCategoryName("");
                    setNewCategoryError(null);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Cancelar
                </Button>
              </div>
              {newCategoryError ? (
                <p className="text-xs font-medium text-negative-600 dark:text-negative-200">
                  {newCategoryError}
                </p>
              ) : null}
            </div>
          ) : null}

          {fieldError(errors, "category")}
        </div>

        <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Observação
          <textarea
            className="min-h-24 resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 transition placeholder:text-slate-400 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            onChange={(event) => updateValues({ observation: event.target.value })}
            placeholder="Opcional"
            value={values.observation}
          />
        </label>

        <Button
          className="w-full sm:w-auto"
          icon={<Save aria-hidden="true" size={18} />}
          isLoading={isSubmitting}
          type="submit"
        >
          {editingTransaction ? "Salvar alterações" : "Adicionar"}
        </Button>
      </form>
    </motion.section>
  );
}
