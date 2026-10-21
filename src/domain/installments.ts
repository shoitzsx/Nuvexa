import { addMonthsClamped, assertIsoDate, type IsoDate } from "./dates";
import { DomainError } from "./errors";
import { invoiceDatesForMonth, invoiceForPurchase, type CardCycle, type InvoiceDates } from "./invoiceCycle";
import { assertPositiveCents, splitEvenly, sumCents, type Cents } from "./money";

export const MAX_INSTALLMENTS = 48;

export interface CardPurchaseInput {
  card: CardCycle;
  totalCents: Cents;
  /** 1 = compra à vista no cartão. */
  installments: number;
  purchaseDate: IsoDate;
  /** Ajuste manual: leva toda a compra uma fatura adiante (não altera a competência). */
  firstInvoiceOffset?: 0 | 1;
}

export interface PlannedInstallment {
  number: number;
  amountCents: Cents;
  /** Mês de contabilização do consumo: data da compra + (k-1) meses. */
  competenceDate: IsoDate;
  invoice: InvoiceDates;
}

export interface CardPurchasePlan {
  /** Valor integral da compra (rastreável mesmo contabilizando por parcela). */
  totalCents: Cents;
  installmentCount: number;
  purchaseDate: IsoDate;
  items: PlannedInstallment[];
}

export function planCardPurchase(input: CardPurchaseInput): CardPurchasePlan {
  assertPositiveCents(input.totalCents, "valor da compra");
  assertIsoDate(input.purchaseDate, "data da compra");
  const { installments } = input;
  if (!Number.isInteger(installments) || installments < 1 || installments > MAX_INSTALLMENTS) {
    throw new DomainError("INVALID_ARGUMENT", `número de parcelas deve estar entre 1 e ${MAX_INSTALLMENTS}`);
  }
  if (input.totalCents < installments) {
    throw new DomainError("INVALID_ARGUMENT", "o valor total não pode ser menor que o número de parcelas (mínimo de 1 centavo por parcela)");
  }

  const first = invoiceForPurchase(input.card, input.purchaseDate, input.firstInvoiceOffset ?? 0);
  const amounts = splitEvenly(input.totalCents, installments);

  const items = amounts.map((amountCents, index): PlannedInstallment => ({
    number: index + 1,
    amountCents,
    competenceDate: addMonthsClamped(input.purchaseDate, index),
    invoice: invoiceDatesForMonth(input.card, addMonthsClamped(first.referenceMonth, index)),
  }));

  if (sumCents(items.map((item) => item.amountCents)) !== input.totalCents) {
    throw new DomainError("INVALID_AMOUNT", "a soma das parcelas difere do total");
  }
  return { totalCents: input.totalCents, installmentCount: installments, purchaseDate: input.purchaseDate, items };
}
