import { addMonthsClamped, assertIsoDate, clampDay, formatIsoDate, monthStart, parseIsoDate, type IsoDate } from "./dates";
import { DomainError } from "./errors";

export interface CardCycle {
  /** Dia do fechamento (1-31). Compras até esse dia (inclusive) entram na fatura que fecha nele. */
  closingDay: number;
  /** Dia do vencimento (1-31). */
  dueDay: number;
}

export interface InvoiceDates {
  /** Primeiro dia do mês do fechamento. */
  referenceMonth: IsoDate;
  closingDate: IsoDate;
  dueDate: IsoDate;
}

function assertDay(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 31) {
    throw new DomainError("INVALID_ARGUMENT", `${label} deve ser um inteiro entre 1 e 31`);
  }
}

/** Datas da fatura cujo fechamento cai no mês de `referenceMonth`. */
export function invoiceDatesForMonth(card: CardCycle, referenceMonth: IsoDate): InvoiceDates {
  assertDay(card.closingDay, "dia de fechamento");
  assertDay(card.dueDay, "dia de vencimento");
  const { year, month } = parseIsoDate(referenceMonth);

  const closingDate = formatIsoDate(year, month, clampDay(year, month, card.closingDay));
  // Vencimento no mesmo mês só quando o dia de vencimento é maior que o de fechamento.
  const dueBase = card.dueDay > card.closingDay ? monthStart(referenceMonth) : addMonthsClamped(monthStart(referenceMonth), 1);
  const due = parseIsoDate(dueBase);
  const dueDate = formatIsoDate(due.year, due.month, clampDay(due.year, due.month, card.dueDay));

  return { referenceMonth: monthStart(referenceMonth), closingDate, dueDate };
}

/**
 * Fatura que recebe uma compra feita em `purchaseDate` (fechamento inclusivo).
 * `monthOffset` = 1 aplica o ajuste manual de uma fatura adiante.
 */
export function invoiceForPurchase(card: CardCycle, purchaseDate: IsoDate, monthOffset: 0 | 1 = 0): InvoiceDates {
  assertIsoDate(purchaseDate, "data da compra");
  if (monthOffset !== 0 && monthOffset !== 1) {
    throw new DomainError("INVALID_ARGUMENT", "ajuste de fatura deve ser 0 ou 1");
  }
  const { year, month } = parseIsoDate(purchaseDate);
  const sameMonth = invoiceDatesForMonth(card, formatIsoDate(year, month, 1));
  const reference = purchaseDate <= sameMonth.closingDate ? sameMonth.referenceMonth : addMonthsClamped(sameMonth.referenceMonth, 1);
  return invoiceDatesForMonth(card, addMonthsClamped(reference, monthOffset));
}
