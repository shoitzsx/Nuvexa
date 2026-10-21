import { balancesByAccount } from "./balance";
import { computeInvoiceBalances } from "./cardLimit";
import {
  addMonthsClamped,
  assertIsoDate,
  clampDay,
  formatIsoDate,
  monthStart,
  monthsBetween,
  parseIsoDate,
  type IsoDate,
} from "./dates";
import { DomainError } from "./errors";
import { assertPositiveCents, type Cents } from "./money";
import type { LedgerData, RecurrenceRule } from "./types";
import { assertValidLedger } from "./validation";

export type ProjectionHorizon = 3 | 6 | 12;

export interface ProjectionMonth {
  /** Primeiro dia do mês. O mês 0 é o mês atual. */
  month: IsoDate;
  startCents: Cents;
  incomeCents: Cents;
  expensesCents: Cents;
  /** Dívida efetiva das faturas que vencem no mês (inclui vencidas, no mês atual). */
  invoicesCents: Cents;
  /** Transferências planejadas de/para contas fora do conjunto projetado. */
  transfersNetCents: Cents;
  endCents: Cents;
}

export interface ProjectionInput {
  today: IsoDate;
  months: ProjectionHorizon;
  data: LedgerData;
  rules: readonly RecurrenceRule[];
}

/**
 * Saldo projetado ao fim de cada mês, considerando só compromissos CONHECIDOS
 * (planejados, recorrências, saldo em aberto das faturas). Não inclui gastos variáveis futuros.
 *
 * - Parte do mesmo saldo atual usado em toda a aplicação (mesmo conjunto de contas do "disponível").
 * - Itens de cartão entram só pelo saldo da fatura, no mês do vencimento.
 * - Planejados e faturas vencidos caem no mês atual (uma única vez).
 * - Recorrências são expandidas em memória pulando qualquer ocorrência já materializada
 *   (inclusive as canceladas).
 * - Aportes em metas não alteram o saldo projetado.
 */
export function projectBalances(input: ProjectionInput): ProjectionMonth[] {
  const { today, months, data, rules } = input;
  assertIsoDate(today, "hoje");
  if (months !== 3 && months !== 6 && months !== 12) {
    throw new DomainError("INVALID_ARGUMENT", "o horizonte deve ser de 3, 6 ou 12 meses");
  }
  assertValidLedger(data);

  const accountIds = new Set(data.accounts.map((a) => a.id));
  for (const rule of rules) {
    assertPositiveCents(rule.amountCents, `recorrência ${rule.id}: valor`);
    assertIsoDate(rule.startDate, `recorrência ${rule.id}: início`);
    if (rule.endDate !== null) assertIsoDate(rule.endDate, `recorrência ${rule.id}: fim`);
    if (!Number.isInteger(rule.dayOfMonth) || rule.dayOfMonth < 1 || rule.dayOfMonth > 31) {
      throw new DomainError("INVALID_ARGUMENT", `recorrência ${rule.id}: dia do mês inválido`);
    }
    if (!accountIds.has(rule.accountId)) {
      throw new DomainError("UNKNOWN_REFERENCE", `conta inexistente: "${rule.accountId}"`);
    }
  }

  const includedIds = new Set(data.accounts.filter((a) => a.includeInAvailable).map((a) => a.id));
  const balances = balancesByAccount(data.accounts, data, today);
  let startCents = 0;
  for (const id of includedIds) startCents += balances.get(id) ?? 0;

  const currentMonth = monthStart(today);
  const buckets = Array.from({ length: months }, (_, index) => ({
    month: addMonthsClamped(currentMonth, index),
    income: 0,
    expenses: 0,
    invoices: 0,
    transfers: 0,
  }));

  /** Atrasados (antes de hoje) caem no mês atual; além do horizonte, -1. */
  const bucketOf = (date: IsoDate): number => {
    if (date < today) return 0;
    const index = monthsBetween(currentMonth, date);
    return index >= months ? -1 : index;
  };

  for (const t of data.transactions) {
    if (t.status !== "planned" || t.accountId === null || !includedIds.has(t.accountId) || t.expectedDate === null) continue;
    const index = bucketOf(t.expectedDate);
    if (index < 0) continue;
    if (t.kind === "expense") buckets[index].expenses += t.amountCents;
    else buckets[index].income += t.amountCents;
  }

  for (const t of data.transfers) {
    if (t.status !== "planned" || t.expectedDate === null) continue;
    const from = includedIds.has(t.fromAccountId);
    const to = includedIds.has(t.toAccountId);
    if (from === to) continue;
    const index = bucketOf(t.expectedDate);
    if (index < 0) continue;
    buckets[index].transfers += from ? -t.amountCents : t.amountCents;
  }

  for (const b of computeInvoiceBalances({ invoices: data.invoices, items: data.transactions, payments: data.payments, today })) {
    if (b.effectiveDebtCents === 0) continue;
    const index = bucketOf(b.dueDate);
    if (index >= 0) buckets[index].invoices += b.effectiveDebtCents;
  }

  const materialized = new Set(
    data.transactions
      .filter((t) => t.recurrenceId !== null && t.recurrenceKey !== null)
      .map((t) => `${t.recurrenceId}|${t.recurrenceKey}`),
  );
  for (const rule of rules) {
    if (!rule.active || !includedIds.has(rule.accountId)) continue;
    buckets.forEach((bucket, index) => {
      const { year, month } = parseIsoDate(bucket.month);
      const date = formatIsoDate(year, month, clampDay(year, month, rule.dayOfMonth));
      if (date < today || date < rule.startDate) return;
      if (rule.endDate !== null && date > rule.endDate) return;
      if (materialized.has(`${rule.id}|${date}`)) return;
      if (rule.kind === "expense") buckets[index].expenses += rule.amountCents;
      else buckets[index].income += rule.amountCents;
    });
  }

  let running = startCents;
  return buckets.map((bucket): ProjectionMonth => {
    const monthStartCents = running;
    running = running + bucket.income - bucket.expenses - bucket.invoices + bucket.transfers;
    return {
      month: bucket.month,
      startCents: monthStartCents,
      incomeCents: bucket.income,
      expensesCents: bucket.expenses,
      invoicesCents: bucket.invoices,
      transfersNetCents: bucket.transfers,
      endCents: running,
    };
  });
}
