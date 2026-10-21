import type { IsoDate } from "./dates";
import type { Cents } from "./money";

export type EntryStatus = "planned" | "posted" | "canceled";
export type TransactionKind = "income" | "expense" | "refund";

export interface Account {
  id: string;
  /** Saldo no início de `openingDate`. Lançamentos anteriores a essa data são ignorados. */
  openingBalanceCents: Cents;
  openingDate: IsoDate;
  includeInAvailable: boolean;
  allowNegative: boolean;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  status: EntryStatus;
  amountCents: Cents;
  /** Exatamente um entre accountId e cardId. */
  accountId: string | null;
  cardId: string | null;
  invoiceId: string | null;
  categoryId: string | null;
  /** Mês de contabilização do consumo. */
  competenceDate: IsoDate;
  /** Data esperada (obrigatória enquanto planejado). */
  expectedDate: IsoDate | null;
  /** Data efetiva (obrigatória quando realizado). */
  postedDate: IsoDate | null;
  /** Lançamento de conciliação: conta no saldo, mas fora de consumo e receita. */
  isAdjustment: boolean;
  planId: string | null;
  recurrenceId: string | null;
  recurrenceKey: IsoDate | null;
  refundOfId: string | null;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: Cents;
  status: EntryStatus;
  expectedDate: IsoDate | null;
  postedDate: IsoDate | null;
}

export interface Invoice {
  id: string;
  cardId: string;
  /** Primeiro dia do mês do fechamento. */
  referenceMonth: IsoDate;
  closingDate: IsoDate;
  dueDate: IsoDate;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  accountId: string;
  amountCents: Cents;
  paidDate: IsoDate;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  /** Conta onde o dinheiro está fisicamente. O saldo dela não muda. */
  accountId: string;
  kind: "deposit" | "withdrawal";
  amountCents: Cents;
  status: EntryStatus;
  expectedDate: IsoDate | null;
  postedDate: IsoDate | null;
}

export interface RecurrenceRule {
  id: string;
  kind: "income" | "expense";
  amountCents: Cents;
  accountId: string;
  dayOfMonth: number;
  startDate: IsoDate;
  endDate: IsoDate | null;
  active: boolean;
}

export interface LedgerData {
  accounts: Account[];
  transactions: Transaction[];
  transfers: Transfer[];
  payments: InvoicePayment[];
  contributions: GoalContribution[];
  invoices: Invoice[];
}
