// Fábricas de dados FICTÍCIOS usadas somente nos testes.
import type { IsoDate } from "../dates";
import type {
  Account,
  GoalContribution,
  Invoice,
  InvoicePayment,
  LedgerData,
  Transaction,
  Transfer,
} from "../types";

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

export function account(over: Partial<Account> = {}): Account {
  return {
    id: nextId("acc"),
    openingBalanceCents: 0,
    openingDate: "2026-01-01",
    includeInAvailable: true,
    allowNegative: false,
    ...over,
  };
}

export function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: nextId("tx"),
    kind: "expense",
    status: "posted",
    amountCents: 100,
    accountId: "acc",
    cardId: null,
    invoiceId: null,
    categoryId: null,
    competenceDate: "2026-08-01",
    expectedDate: null,
    postedDate: "2026-08-01",
    isAdjustment: false,
    planId: null,
    recurrenceId: null,
    recurrenceKey: null,
    refundOfId: null,
    ...over,
  };
}

export function posted(
  kind: "income" | "expense",
  accountId: string,
  amountCents: number,
  date: IsoDate,
  over: Partial<Transaction> = {},
): Transaction {
  return tx({ kind, accountId, amountCents, competenceDate: date, postedDate: date, ...over });
}

export function planned(
  kind: "income" | "expense",
  accountId: string,
  amountCents: number,
  expectedDate: IsoDate,
  over: Partial<Transaction> = {},
): Transaction {
  return tx({
    kind,
    accountId,
    amountCents,
    status: "planned",
    competenceDate: expectedDate,
    expectedDate,
    postedDate: null,
    ...over,
  });
}

export function cardItem(
  invoice: Invoice,
  amountCents: number,
  over: Partial<Transaction> = {},
): Transaction {
  return tx({
    kind: "expense",
    accountId: null,
    cardId: invoice.cardId,
    invoiceId: invoice.id,
    amountCents,
    competenceDate: "2026-07-01",
    postedDate: "2026-07-01",
    ...over,
  });
}

export function invoice(
  id: string,
  referenceMonth: IsoDate,
  closingDate: IsoDate,
  dueDate: IsoDate,
  cardId = "cc",
): Invoice {
  return { id, cardId, referenceMonth, closingDate, dueDate };
}

export function payment(
  invoiceId: string,
  accountId: string,
  amountCents: number,
  paidDate: IsoDate,
): InvoicePayment {
  return { id: nextId("pay"), invoiceId, accountId, amountCents, paidDate };
}

export function transfer(
  fromAccountId: string,
  toAccountId: string,
  amountCents: number,
  over: Partial<Transfer> = {},
): Transfer {
  return {
    id: nextId("trf"),
    fromAccountId,
    toAccountId,
    amountCents,
    status: "posted",
    expectedDate: null,
    postedDate: "2026-08-01",
    ...over,
  };
}

export function contribution(
  accountId: string,
  amountCents: number,
  over: Partial<GoalContribution> = {},
): GoalContribution {
  return {
    id: nextId("ctb"),
    goalId: "goal",
    accountId,
    kind: "deposit",
    amountCents,
    status: "posted",
    expectedDate: null,
    postedDate: "2026-08-01",
    ...over,
  };
}

export function ledger(over: Partial<LedgerData> = {}): LedgerData {
  return {
    accounts: [],
    transactions: [],
    transfers: [],
    payments: [],
    contributions: [],
    invoices: [],
    ...over,
  };
}
