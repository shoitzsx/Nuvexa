import { ArrowDownRight, ArrowUpRight, Edit3, PiggyBank, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useSavingsGoals } from "../hooks/useSavingsGoals";
import { calculateSavingsGoalBalance } from "../lib/savingsGoalBalance";
import { formatCurrency, formatDate, parseAmount, toInputDate } from "../lib/formatters";
import type { SavingsGoal, SavingsGoalMutation, SavingsTransactionType } from "../types/savingsGoals";

interface GoalForm { name: string; description: string; target_amount: string; target_date: string; status: "active" | "completed" | "cancelled"; }
const emptyGoalForm: GoalForm = { name: "", description: "", target_amount: "", target_date: "", status: "active" };
function formFromGoal(goal: SavingsGoal): GoalForm { return { name: goal.name, description: goal.description ?? "", target_amount: String(goal.target_amount).replace(".", ","), target_date: goal.target_date ?? "", status: goal.status }; }

export function SavingsGoalsPage() {
  const { goals, savingsTransactions, loading, createSavingsGoal, updateSavingsGoal, deleteSavingsGoal, createSavingsTransaction, deleteSavingsTransaction } = useSavingsGoals();
  const [values, setValues] = useState<GoalForm>(emptyGoalForm);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [selected, setSelected] = useState<SavingsGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [entryType, setEntryType] = useState<SavingsTransactionType | null>(null);
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDate, setEntryDate] = useState(toInputDate(new Date()));
  const [entrySource, setEntrySource] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateForm = (next: Partial<GoalForm>) => setValues((current) => ({ ...current, ...next }));
  const resetForm = () => { setEditing(null); setValues(emptyGoalForm); };
  const resetEntry = () => { setEntryType(null); setEntryAmount(""); setEntryDate(toInputDate(new Date())); setEntrySource(""); setEntryNote(""); };

  function validateGoal(): SavingsGoalMutation | null {
    const targetAmount = parseAmount(values.target_amount);
    const today = toInputDate(new Date());
    if (!values.name.trim()) { toast.error("Informe o nome da meta.", { id: "goal-validation" }); return null; }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) { toast.error("O valor necessário deve ser maior que zero.", { id: "goal-validation" }); return null; }
    if (!editing && values.target_date && values.target_date < today) { toast.error("A data desejada não pode ser anterior a hoje.", { id: "goal-validation" }); return null; }
    return { name: values.name.trim(), description: values.description.trim() || null, target_amount: targetAmount, target_date: values.target_date || null, status: values.status };
  }

  async function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const goal = validateGoal();
    if (!goal) return;
    setSubmitting(true);
    try {
      if (editing) { await updateSavingsGoal(editing.id, goal); toast.success("Meta atualizada!", { id: "goal-updated" }); }
      else { await createSavingsGoal(goal); toast.success("Meta criada!", { id: "goal-created" }); }
      resetForm();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar a meta.", { id: "goal-save-error" }); }
    finally { setSubmitting(false); }
  }

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !entryType) return;
    const amount = parseAmount(entryAmount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Informe um valor maior que zero.", { id: "savings-entry-validation" }); return; }
    const balance = calculateSavingsGoalBalance(selected, savingsTransactions);
    if (entryType === "withdrawal" && balance.savedAmount - amount < 0 && !window.confirm("Esta retirada deixará o valor guardado abaixo de zero. Deseja continuar?")) return;
    try {
      await createSavingsTransaction({ goal_id: selected.id, type: entryType, amount, date: entryDate, source: entrySource.trim() || null, note: entryNote.trim() || null });
      const reachesTarget = entryType === "deposit" && balance.savedAmount + amount >= selected.target_amount;
      toast.success(reachesTarget ? "Depósito registrado. A meta foi atingida; marque-a como concluída quando desejar." : entryType === "deposit" ? "Dinheiro guardado com sucesso!" : "Retirada registrada no histórico.", { id: "savings-entry-created" });
      resetEntry();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível registrar a movimentação.", { id: "savings-entry-error" }); }
  }

  async function removeGoal() {
    if (!goalToDelete) return;
    try { await deleteSavingsGoal(goalToDelete.id); toast.success("Meta e histórico excluídos permanentemente.", { id: "goal-deleted" }); if (selected?.id === goalToDelete.id) setSelected(null); setGoalToDelete(null); }
    catch { toast.error("Não foi possível excluir a meta.", { id: "goal-delete-error" }); }
  }

  async function removeEntry() {
    if (!transactionToDelete) return;
    try { await deleteSavingsTransaction(transactionToDelete); toast.success("Movimentação excluída. O valor guardado foi recalculado.", { id: "savings-entry-deleted" }); setTransactionToDelete(null); }
    catch { toast.error("Não foi possível excluir a movimentação.", { id: "savings-entry-delete-error" }); }
  }

  const groups = { active: goals.filter((goal) => goal.status === "active"), completed: goals.filter((goal) => goal.status === "completed"), cancelled: goals.filter((goal) => goal.status === "cancelled") };
  const selectedTransactions = selected ? savingsTransactions.filter((transaction) => transaction.goal_id === selected.id).sort((left, right) => right.date.localeCompare(left.date) || right.created_at.localeCompare(left.created_at)) : [];
  function renderGroup(title: string, items: SavingsGoal[]) {
    return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>{items.length === 0 ? <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Nenhuma meta nesta situação.</p> : <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{items.map((goal) => { const balance = calculateSavingsGoalBalance(goal, savingsTransactions); return <article className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between" key={goal.id}><button className="min-w-0 text-left" onClick={() => { setSelected(goal); resetEntry(); }} type="button"><h3 className="font-semibold text-slate-950 dark:text-white">{goal.name}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatCurrency(balance.savedAmount)} de {formatCurrency(goal.target_amount)} · faltam {formatCurrency(balance.remainingAmount)}</p><div className="mt-2 h-2 w-full max-w-sm overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-positive-600" style={{ width: `${balance.percentageComplete}%` }} /></div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{balance.percentageComplete.toFixed(0)}% concluída · {formatCurrency(balance.savedThisMonth)} guardados neste mês{goal.target_date ? ` · data desejada: ${formatDate(goal.target_date)}` : ""}</p></button><div className="flex gap-2"><Button className="min-h-10 px-3" icon={<Edit3 aria-hidden="true" size={16} />} onClick={() => { setEditing(goal); setValues(formFromGoal(goal)); }} variant="secondary">Editar</Button><Button className="min-h-10 px-3" icon={<Trash2 aria-hidden="true" size={16} />} onClick={() => setGoalToDelete(goal)} variant="danger">Excluir</Button></div></article>; })}</div>}</section>;
  }

  return <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]"><section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><Plus aria-hidden="true" size={20} /><h1 className="text-lg font-semibold text-slate-950 dark:text-white">{editing ? "Editar meta" : "Nova meta"}</h1></div><form className="mt-5 grid gap-4" onSubmit={submitGoal}><label className="grid gap-2 text-sm font-medium">Nome<input className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => updateForm({ name: event.target.value })} value={values.name} /></label><label className="grid gap-2 text-sm font-medium">Descrição <span className="font-normal text-slate-500">(opcional)</span><textarea className="min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => updateForm({ description: event.target.value })} value={values.description} /></label><label className="grid gap-2 text-sm font-medium">Valor necessário<input className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" inputMode="decimal" onChange={(event) => updateForm({ target_amount: event.target.value })} value={values.target_amount} /></label><label className="grid gap-2 text-sm font-medium">Data desejada <span className="font-normal text-slate-500">(opcional)</span><input className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => updateForm({ target_date: event.target.value })} type="date" value={values.target_date} /></label><label className="grid gap-2 text-sm font-medium">Status<select className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => updateForm({ status: event.target.value as GoalForm["status"] })} value={values.status}><option value="active">Ativa</option><option value="completed">Concluída</option><option value="cancelled">Cancelada</option></select></label><div className="flex gap-3"><Button isLoading={submitting} type="submit">{editing ? "Salvar" : "Criar meta"}</Button>{editing ? <Button onClick={resetForm} variant="secondary">Cancelar</Button> : null}</div></form></section><div className="grid gap-6"><section><h1 className="text-2xl font-bold text-slate-950 dark:text-white">Metas de economia</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Acompanhe o dinheiro separado para cada objetivo, sem afetar seus gastos gerais.</p></section>{loading ? <div className="h-28 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" /> : goals.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">Crie sua primeira meta para acompanhar seu progresso.</div> : <>{renderGroup("Ativas", groups.active)}{renderGroup("Concluídas", groups.completed)}{renderGroup("Canceladas", groups.cancelled)}</>}{selected ? <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><PiggyBank aria-hidden="true" size={20} /><h2 className="text-lg font-semibold text-slate-950 dark:text-white">{selected.name}</h2></div><div className="flex gap-2"><Button icon={<ArrowUpRight aria-hidden="true" size={16} />} onClick={() => setEntryType("deposit")}>Guardar dinheiro</Button><Button icon={<ArrowDownRight aria-hidden="true" size={16} />} onClick={() => setEntryType("withdrawal")} variant="secondary">Retirar dinheiro</Button></div></div>{entryType ? <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitEntry}><input className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" inputMode="decimal" onChange={(event) => setEntryAmount(event.target.value)} placeholder="Valor" value={entryAmount} /><input className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => setEntryDate(event.target.value)} type="date" value={entryDate} /><input className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => setEntrySource(event.target.value)} placeholder="Origem opcional" value={entrySource} /><input className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => setEntryNote(event.target.value)} placeholder="Observação opcional" value={entryNote} /><div className="flex gap-3"><Button type="submit">Confirmar {entryType === "deposit" ? "depósito" : "retirada"}</Button><Button onClick={resetEntry} variant="secondary">Cancelar</Button></div></form> : null}<div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">{selectedTransactions.length === 0 ? <p className="py-3 text-sm text-slate-500">Nenhuma movimentação registrada.</p> : selectedTransactions.map((transaction) => <div className="flex items-center justify-between gap-4 py-3" key={transaction.id}><span><span className={`flex items-center gap-1 font-medium ${transaction.type === "deposit" ? "text-positive-600 dark:text-positive-100" : "text-negative-600 dark:text-negative-100"}`}>{transaction.type === "deposit" ? <ArrowUpRight aria-hidden="true" size={16} /> : <ArrowDownRight aria-hidden="true" size={16} />}{transaction.type === "deposit" ? "Depósito" : "Retirada"} · {formatCurrency(transaction.amount)}</span><span className="text-sm text-slate-500">{formatDate(transaction.date)}{transaction.source ? ` · ${transaction.source}` : ""}{transaction.note ? ` · ${transaction.note}` : ""}</span></span><Button className="min-h-10 px-3" icon={<Trash2 aria-hidden="true" size={16} />} onClick={() => setTransactionToDelete(transaction.id)} variant="danger">Excluir</Button></div>)}</div></section> : null}</div><ConfirmDialog confirmLabel="Excluir meta e histórico" description="Esta ação apagará permanentemente a meta e todo o histórico de depósitos e retiradas associado a ela." isOpen={Boolean(goalToDelete)} onCancel={() => setGoalToDelete(null)} onConfirm={removeGoal} title="Excluir meta permanentemente?" /><ConfirmDialog confirmLabel="Excluir movimentação" description="O valor guardado e o progresso da meta serão recalculados imediatamente." isOpen={Boolean(transactionToDelete)} onCancel={() => setTransactionToDelete(null)} onConfirm={removeEntry} title="Excluir movimentação?" /></div>;
}