import { balancesByAccount } from "./balance";
import { computeInvoiceBalances } from "./cardLimit";
import { addDays, assertIsoDate, endOfMonth, type IsoDate } from "./dates";
import type { Cents } from "./money";
import { summarizeReserves } from "./reserves";
import type { LedgerData, Transaction } from "./types";
import { assertValidLedger } from "./validation";

/**
 * Horizonte do "disponível": a véspera da próxima receita prevista (depois de hoje);
 * sem receita prevista, o fim do mês. Nunca é anterior a hoje.
 */
export function availabilityHorizon(today: IsoDate, transactions: readonly Transaction[]): IsoDate {
  assertIsoDate(today, "hoje");
  let next: IsoDate | null = null;
  for (const t of transactions) {
    if (t.kind !== "income" || t.status !== "planned" || t.expectedDate === null) continue;
    if (t.expectedDate > today && (next === null || t.expectedDate < next)) next = t.expectedDate;
  }
  return next === null ? endOfMonth(today) : addDays(next, -1);
}

export interface AvailableResult {
  horizon: IsoDate;
  /** Soma dos saldos das contas incluídas no disponível. */
  cashCents: Cents;
  reserveEffectiveCents: Cents;
  reserveShortfallCents: Cents;
  /** Despesas planejadas (inclusive atrasadas) com vencimento até o horizonte. */
  plannedExpensesCents: Cents;
  /** Transferências planejadas de conta incluída para conta fora do disponível. */
  plannedTransfersOutCents: Cents;
  /** Dívida efetiva das faturas com vencimento até o horizonte (inclui vencidas). */
  invoiceObligationsCents: Cents;
  availableCents: Cents;
  /** Receitas planejadas ainda não recebidas até o horizonte (ex.: atrasadas). Nunca somam ao disponível. */
  plannedIncomeCents: Cents;
  availableIfIncomeReceivedCents: Cents;
}

/**
 * disponível = saldos das contas incluídas
 *            − reservas efetivas (em contas incluídas)
 *            − despesas planejadas até o horizonte
 *            − transferências planejadas para fora do conjunto
 *            − saldo em aberto das faturas com vencimento até o horizonte
 *
 * Compras e parcelas de cartão entram SÓ pelo saldo da fatura, nunca individualmente.
 */
export function computeAvailable(today: IsoDate, data: LedgerData): AvailableResult {
  assertIsoDate(today, "hoje");
  assertValidLedger(data);

  const horizon = availabilityHorizon(today, data.transactions);
  const includedIds = new Set(data.accounts.filter((a) => a.includeInAvailable).map((a) => a.id));
  const balances = balancesByAccount(data.accounts, data, today);

  let cashCents = 0;
  for (const id of includedIds) cashCents += balances.get(id) ?? 0;

  const reserves = summarizeReserves(data.accounts, balances, data.contributions);

  let plannedExpensesCents = 0;
  let plannedIncomeCents = 0;
  for (const t of data.transactions) {
    if (t.status !== "planned" || t.accountId === null || !includedIds.has(t.accountId)) continue;
    if (t.expectedDate === null || t.expectedDate > horizon) continue;
    if (t.kind === "expense") plannedExpensesCents += t.amountCents;
    else plannedIncomeCents += t.amountCents;
  }

  let plannedTransfersOutCents = 0;
  for (const t of data.transfers) {
    if (t.status !== "planned" || t.expectedDate === null || t.expectedDate > horizon) continue;
    if (includedIds.has(t.fromAccountId) && !includedIds.has(t.toAccountId)) plannedTransfersOutCents += t.amountCents;
  }

  const invoiceObligationsCents = computeInvoiceBalances({
    invoices: data.invoices,
    items: data.transactions,
    payments: data.payments,
    today,
  })
    .filter((b) => b.dueDate <= horizon)
    .reduce((sum, b) => sum + b.effectiveDebtCents, 0);

  const availableCents =
    cashCents - reserves.effectiveIncludedCents - plannedExpensesCents - plannedTransfersOutCents - invoiceObligationsCents;

  return {
    horizon,
    cashCents,
    reserveEffectiveCents: reserves.effectiveIncludedCents,
    reserveShortfallCents: reserves.shortfallCents,
    plannedExpensesCents,
    plannedTransfersOutCents,
    invoiceObligationsCents,
    availableCents,
    plannedIncomeCents,
    availableIfIncomeReceivedCents: availableCents + plannedIncomeCents,
  };
}
