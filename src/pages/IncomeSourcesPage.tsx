import { Edit3, Plus, Power, Trash2, WalletCards } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useIncomeSources } from "../hooks/useIncomeSources";
import { formatCurrency } from "../lib/formatters";
import {
  type IncomeSourceFormErrors,
  type IncomeSourceFormValues,
  validateIncomeSourceForm,
} from "../lib/incomeSourceValidation";
import {
  incomeSourceCategories,
  type IncomeSource,
} from "../types/incomeSources";

const emptyForm: IncomeSourceFormValues = {
  name: "",
  recurrence_type: "recurring",
  category: "",
  expected_amount: "",
  status: "active",
};

function formFromSource(source: IncomeSource): IncomeSourceFormValues {
  return {
    name: source.name,
    recurrence_type: source.recurrence_type,
    category: source.category,
    expected_amount: source.expected_amount ? String(source.expected_amount).replace(".", ",") : "",
    status: source.status,
  };
}

function errorFor(errors: IncomeSourceFormErrors, field: keyof IncomeSourceFormValues) {
  return errors[field] ? (
    <p className="text-sm font-medium text-negative-600 dark:text-negative-100">{errors[field]}</p>
  ) : null;
}

export function IncomeSourcesPage() {
  const { incomeSources, loading, createIncomeSource, updateIncomeSource, deleteIncomeSource } =
    useIncomeSources();
  const [values, setValues] = useState<IncomeSourceFormValues>(emptyForm);
  const [errors, setErrors] = useState<IncomeSourceFormErrors>({});
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<IncomeSource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function updateValues(nextValues: Partial<IncomeSourceFormValues>) {
    setValues((currentValues) => Object.assign({}, currentValues, nextValues));
  }

  function startEditing(source: IncomeSource) {
    setEditingSource(source);
    setValues(formFromSource(source));
    setErrors({});
  }

  function cancelEditing() {
    setEditingSource(null);
    setValues(emptyForm);
    setErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateIncomeSourceForm(values);
    setErrors(result.errors);

    if (!result.data) {
      toast.error("Revise os campos da fonte de renda.", { id: "income-source-validation" });
      return;
    }

    setSubmitting(true);
    try {
      if (editingSource) {
        await updateIncomeSource(editingSource.id, result.data);
        toast.success("Fonte de renda atualizada!", { id: "income-source-updated" });
      } else {
        await createIncomeSource(result.data);
        toast.success("Fonte de renda adicionada!", { id: "income-source-created" });
      }
      cancelEditing();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar a fonte de renda.",
        { id: "income-source-save-error" },
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleSourceStatus(source: IncomeSource) {
    try {
      const status = source.status === "active" ? "inactive" : "active";
      await updateIncomeSource(source.id, { ...source, status });
      toast.success(status === "active" ? "Fonte ativada!" : "Fonte desativada!", {
        id: "income-source-status",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a fonte.", {
        id: "income-source-status-error",
      });
    }
  }

  async function handleDelete() {
    if (!sourceToDelete) {
      return;
    }

    setDeleting(true);
    try {
      await deleteIncomeSource(sourceToDelete.id);
      toast.success("Fonte de renda excluída. As receitas foram preservadas.", {
        id: "income-source-deleted",
      });
      setSourceToDelete(null);
      if (editingSource?.id === sourceToDelete.id) {
        cancelEditing();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir a fonte.", {
        id: "income-source-delete-error",
      });
    } finally {
      setDeleting(false);
    }
  }

  const recurringSources = incomeSources.filter((source) => source.recurrence_type === "recurring");
  const eventualSources = incomeSources.filter((source) => source.recurrence_type === "eventual");

  function sourceList(title: string, sources: IncomeSource[]) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
        {sources.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Nenhuma fonte nesta categoria.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {sources.map((source) => (
              <article className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between" key={source.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-950 dark:text-white">{source.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${source.status === "active" ? "bg-positive-50 text-positive-600 dark:bg-positive-600/15 dark:text-positive-100" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {source.status === "active" ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {source.category}{source.expected_amount ? ` · Esperado: ${formatCurrency(source.expected_amount)}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button className="min-h-10 px-3" icon={<Edit3 aria-hidden="true" size={16} />} onClick={() => startEditing(source)} variant="secondary">Editar</Button>
                  <Button className="min-h-10 px-3" icon={<Power aria-hidden="true" size={16} />} onClick={() => toggleSourceStatus(source)} variant="secondary">{source.status === "active" ? "Desativar" : "Ativar"}</Button>
                  <Button aria-label={`Excluir ${source.name}`} className="min-h-10 px-3" icon={<Trash2 aria-hidden="true" size={16} />} onClick={() => setSourceToDelete(source)} variant="danger">Excluir</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-slate-950 dark:text-white">
          <Plus aria-hidden="true" size={20} />
          <h1 className="text-lg font-semibold">{editingSource ? "Editar fonte de renda" : "Nova fonte de renda"}</h1>
        </div>
        <form className="mt-5 grid gap-4" noValidate onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">Nome<input className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={(event) => updateValues({ name: event.target.value })} placeholder="Salário - Empresa X" value={values.name} />{errorFor(errors, "name")}</label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">Recorrência<select className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={(event) => updateValues({ recurrence_type: event.target.value as IncomeSourceFormValues["recurrence_type"], expected_amount: event.target.value === "eventual" ? "" : values.expected_amount })} value={values.recurrence_type}><option value="recurring">Recorrente</option><option value="eventual">Eventual</option></select>{errorFor(errors, "recurrence_type")}</label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">Categoria/origem<select className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={(event) => updateValues({ category: event.target.value as IncomeSourceFormValues["category"] })} value={values.category}><option value="">Selecione</option>{incomeSourceCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>{errorFor(errors, "category")}</label>
          {values.recurrence_type === "recurring" ? <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">Valor esperado <span className="font-normal text-slate-500 dark:text-slate-400">(opcional)</span><input className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" inputMode="decimal" onChange={(event) => updateValues({ expected_amount: event.target.value })} placeholder="5.000,00" value={values.expected_amount} />{errorFor(errors, "expected_amount")}</label> : null}
          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">Status<select className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" onChange={(event) => updateValues({ status: event.target.value as IncomeSourceFormValues["status"] })} value={values.status}><option value="active">Ativa</option><option value="inactive">Inativa</option></select></label>
          <div className="flex gap-3"><Button icon={<WalletCards aria-hidden="true" size={18} />} isLoading={submitting} type="submit">{editingSource ? "Salvar alterações" : "Cadastrar fonte"}</Button>{editingSource ? <Button disabled={submitting} onClick={cancelEditing} variant="secondary">Cancelar</Button> : null}</div>
        </form>
      </section>

      <div className="grid gap-6">
        <section><h1 className="text-2xl font-bold text-slate-950 dark:text-white">Fontes de renda</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Organize a origem das suas receitas sem alterar o histórico financeiro.</p></section>
        {loading ? <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="h-5 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" /><div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" /></div> : incomeSources.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">Nenhuma fonte de renda cadastrada ainda.</div> : <><>{sourceList("Recorrentes", recurringSources)}</>{sourceList("Eventuais", eventualSources)}</>}
      </div>

      <ConfirmDialog confirmLabel="Excluir fonte" description="As receitas associadas continuarão existindo, apenas perderão esta referência." isLoading={deleting} isOpen={Boolean(sourceToDelete)} onCancel={() => setSourceToDelete(null)} onConfirm={handleDelete} title="Excluir fonte de renda?" />
    </div>
  );
}