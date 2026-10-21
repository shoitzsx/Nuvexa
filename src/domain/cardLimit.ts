import { assertIsoDate, type IsoDate } from "./dates";
import { DomainError } from "./errors";
import { assertCents, assertPositiveCents, type Cents } from "./money";
import type { Invoice, InvoicePayment, Transaction } from "./types";
import { assertUniqueIds } from "./validation";

export interface InvoiceBalance {
  invoiceId: string;
  cardId: string;
  referenceMonth: IsoDate;
  closingDate: IsoDate;
  dueDate: IsoDate;
  /** Despesas menos estornos postados na fatura. */
  netCents: Cents;
  paidCents: Cents;
  /** net - paid; negativo = crédito na fatura. */
  balanceCents: Cents;
  /** Crédito vindo das faturas anteriores do mesmo cartão. */
  carryInCents: Cents;
  /** O que realmente falta pagar nesta fatura, depois de aplicar o crédito carregado. */
  effectiveDebtCents: Cents;
  /** Crédito que sobra para as faturas seguintes. */
  carryOutCents: Cents;
  /** Fechada: já passou o dia do fechamento (compra no dia do fechamento ainda entra nela). */
  closed: boolean;
}

export interface InvoiceBalancesInput {
  invoices: readonly Invoice[];
  /** Pode conter lançamentos de conta; só os que têm fatura são considerados. */
  items: readonly Transaction[];
  payments: readonly InvoicePayment[];
  today: IsoDate;
}

/**
 * Saldo de cada fatura. O crédito (estorno maior que a dívida da fatura) é carregado
 * somente para as faturas SEGUINTES do mesmo cartão, nunca para as anteriores.
 */
export function computeInvoiceBalances(input: InvoiceBalancesInput): InvoiceBalance[] {
  const { invoices, items, payments, today } = input;
  assertIsoDate(today, "hoje");
  assertUniqueIds(invoices, "faturas");
  assertUniqueIds(items, "itens");
  assertUniqueIds(payments, "pagamentos");

  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const net = new Map<string, number>();
  const paid = new Map<string, number>();

  for (const item of items) {
    if (item.invoiceId === null || item.status === "canceled") continue;
    const invoice = invoiceById.get(item.invoiceId);
    if (!invoice) {
      throw new DomainError("UNKNOWN_REFERENCE", `fatura inexistente: "${item.invoiceId}"`);
    }
    if (item.cardId !== invoice.cardId) {
      throw new DomainError("INVALID_ENTRY", `item ${item.id}: a fatura pertence a outro cartão`);
    }
    if (item.kind === "income") {
      throw new DomainError("INVALID_ENTRY", `item ${item.id}: receita não pode estar em fatura`);
    }
    if (item.status !== "posted") {
      throw new DomainError("INVALID_ENTRY", `item ${item.id}: item de cartão deve estar realizado`);
    }
    assertPositiveCents(item.amountCents, `item ${item.id}: valor`);
    net.set(invoice.id, (net.get(invoice.id) ?? 0) + (item.kind === "expense" ? item.amountCents : -item.amountCents));
  }

  for (const payment of payments) {
    if (!invoiceById.has(payment.invoiceId)) {
      throw new DomainError("UNKNOWN_REFERENCE", `fatura inexistente: "${payment.invoiceId}"`);
    }
    assertPositiveCents(payment.amountCents, `pagamento ${payment.id}: valor`);
    paid.set(payment.invoiceId, (paid.get(payment.invoiceId) ?? 0) + payment.amountCents);
  }

  const ordered = [...invoices].sort((a, b) =>
    a.cardId === b.cardId ? a.referenceMonth.localeCompare(b.referenceMonth) : a.cardId.localeCompare(b.cardId),
  );

  const result: InvoiceBalance[] = [];
  let currentCard: string | null = null;
  let carry = 0;
  for (const invoice of ordered) {
    if (invoice.cardId !== currentCard) {
      currentCard = invoice.cardId;
      carry = 0;
    }
    const netCents = net.get(invoice.id) ?? 0;
    const paidCents = paid.get(invoice.id) ?? 0;
    const balanceCents = netCents - paidCents;
    const afterCredit = balanceCents - carry;
    result.push({
      invoiceId: invoice.id,
      cardId: invoice.cardId,
      referenceMonth: invoice.referenceMonth,
      closingDate: invoice.closingDate,
      dueDate: invoice.dueDate,
      netCents,
      paidCents,
      balanceCents,
      carryInCents: carry,
      effectiveDebtCents: Math.max(afterCredit, 0),
      carryOutCents: Math.max(-afterCredit, 0),
      closed: today > invoice.closingDate,
    });
    carry = Math.max(-afterCredit, 0);
  }
  return result;
}

export interface CardLimitSummary {
  limitCents: Cents;
  /** Dívida de faturas já fechadas. */
  debtBilledCents: Cents;
  /** Dívida da fatura aberta e das futuras (inclui parcelas ainda não faturadas). */
  debtUnbilledCents: Cents;
  /** Dívida pendente total (faturada + a faturar), já com o crédito aplicado. */
  debtCents: Cents;
  limitUsedCents: Cents;
  /** Nunca maior que o limite contratado. */
  limitAvailableCents: Cents;
  limitExceededByCents: Cents;
  /** Crédito a favor do cliente ainda não consumido. Não soma ao limite disponível. */
  creditCents: Cents;
}

/** `balances` deve conter as faturas de UM cartão. */
export function summarizeCardLimit(limitCents: Cents, balances: readonly InvoiceBalance[]): CardLimitSummary {
  assertCents(limitCents, "limite");
  if (limitCents < 0) {
    throw new DomainError("INVALID_AMOUNT", "limite não pode ser negativo");
  }
  const ordered = [...balances].sort((a, b) => a.referenceMonth.localeCompare(b.referenceMonth));
  const debtBilledCents = ordered.filter((b) => b.closed).reduce((sum, b) => sum + b.effectiveDebtCents, 0);
  const debtUnbilledCents = ordered.filter((b) => !b.closed).reduce((sum, b) => sum + b.effectiveDebtCents, 0);
  const debtCents = debtBilledCents + debtUnbilledCents;

  return {
    limitCents,
    debtBilledCents,
    debtUnbilledCents,
    debtCents,
    limitUsedCents: debtCents,
    limitAvailableCents: Math.max(limitCents - debtCents, 0),
    limitExceededByCents: Math.max(debtCents - limitCents, 0),
    creditCents: ordered.length > 0 ? ordered[ordered.length - 1].carryOutCents : 0,
  };
}

/** O pagamento não pode passar da dívida efetiva da fatura. */
export function assertPaymentWithinDebt(balances: readonly InvoiceBalance[], invoiceId: string, amountCents: Cents): void {
  assertPositiveCents(amountCents, "valor do pagamento");
  const balance = balances.find((b) => b.invoiceId === invoiceId);
  if (!balance) {
    throw new DomainError("UNKNOWN_REFERENCE", `fatura inexistente: "${invoiceId}"`);
  }
  if (amountCents > balance.effectiveDebtCents) {
    throw new DomainError("OVERPAYMENT", "o pagamento excede o valor em aberto da fatura");
  }
}
