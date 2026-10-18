// Executa os vetores JSON compartilháveis (tests/vectors) contra a implementação em TypeScript.
// A futura implementação SQL deve rodar exatamente os mesmos arquivos e obter os mesmos resultados.
import { describe, expect, it } from "vitest";
import available from "../../tests/vectors/available.json";
import cardLimit from "../../tests/vectors/card-limit.json";
import datesAddMonths from "../../tests/vectors/dates-add-months.json";
import installments from "../../tests/vectors/installments.json";
import invoiceCycle from "../../tests/vectors/invoice-cycle.json";
import moneySplit from "../../tests/vectors/money-split.json";
import projection from "../../tests/vectors/projection.json";
import { computeAvailable } from "./available";
import { computeInvoiceBalances, summarizeCardLimit } from "./cardLimit";
import { addMonthsClamped } from "./dates";
import { planCardPurchase } from "./installments";
import { invoiceForPurchase } from "./invoiceCycle";
import { splitEvenly } from "./money";
import { projectBalances } from "./projection";
import type { Invoice, InvoicePayment, LedgerData, RecurrenceRule, Transaction } from "./types";

interface SpecInvoice { id: string; card?: string; ref: string; close: string; due: string }
interface SpecItem {
  id: string; invoice?: string; kind: Transaction["kind"]; status?: Transaction["status"]; amountCents: number;
  accountId?: string; expectedDate?: string; postedDate?: string; refundOf?: string; recurrenceId?: string; recurrenceKey?: string;
}
interface SpecPayment { invoice: string; accountId?: string; amountCents: number; paidDate?: string }
interface LedgerSpec {
  name: string; today: string; months?: 3 | 6 | 12;
  accounts?: { id: string; openingCents: number; included: boolean }[];
  invoices: SpecInvoice[]; transactions?: SpecItem[]; items?: SpecItem[]; payments: SpecPayment[];
  contributions?: { goalId: string; accountId: string; kind: "deposit" | "withdrawal"; amountCents: number }[];
  rules?: RecurrenceRule[];
  expected: Record<string, unknown>;
}

const toInvoices = (list: SpecInvoice[]): Invoice[] =>
  list.map((i) => ({ id: i.id, cardId: i.card ?? "cc", referenceMonth: i.ref, closingDate: i.close, dueDate: i.due }));

const toTransactions = (list: SpecItem[]): Transaction[] =>
  list.map((t) => ({
    id: t.id,
    kind: t.kind,
    status: t.status ?? "posted",
    amountCents: t.amountCents,
    accountId: t.accountId ?? null,
    cardId: t.invoice ? "cc" : null,
    invoiceId: t.invoice ?? null,
    categoryId: null,
    competenceDate: t.postedDate ?? t.expectedDate ?? "2026-07-01",
    expectedDate: t.expectedDate ?? null,
    postedDate: t.postedDate ?? null,
    isAdjustment: false,
    planId: null,
    recurrenceId: t.recurrenceId ?? null,
    recurrenceKey: t.recurrenceKey ?? null,
    refundOfId: t.refundOf ?? null,
  }));

const toPayments = (list: SpecPayment[]): InvoicePayment[] =>
  list.map((p, index) => ({ id: `pay-${index}`, invoiceId: p.invoice, accountId: p.accountId ?? "chk", amountCents: p.amountCents, paidDate: p.paidDate ?? "2026-08-01" }));

function toLedger(spec: LedgerSpec): LedgerData {
  return {
    accounts: (spec.accounts ?? []).map((a) => ({
      id: a.id, openingBalanceCents: a.openingCents, openingDate: "2026-01-01", includeInAvailable: a.included, allowNegative: false,
    })),
    transactions: toTransactions(spec.transactions ?? []),
    transfers: [],
    payments: toPayments(spec.payments),
    contributions: (spec.contributions ?? []).map((c, index) => ({
      id: `ctb-${index}`, goalId: c.goalId, accountId: c.accountId, kind: c.kind, amountCents: c.amountCents,
      status: "posted" as const, expectedDate: null, postedDate: "2026-08-01",
    })),
    invoices: toInvoices(spec.invoices),
  };
}

describe("vetores: divisão em centavos", () => {
  for (const c of moneySplit.cases) {
    it(c.name, () => expect(splitEvenly(c.totalCents, c.parts)).toEqual(c.expected));
  }
});

describe("vetores: soma de meses", () => {
  for (const c of datesAddMonths.cases) {
    it(`${c.date} + ${c.months}`, () => expect(addMonthsClamped(c.date, c.months)).toBe(c.expected));
  }
});

describe("vetores: ciclo da fatura", () => {
  for (const c of invoiceCycle.cases) {
    it(c.name, () => {
      expect(invoiceForPurchase({ closingDay: c.closingDay, dueDay: c.dueDay }, c.purchaseDate)).toEqual(c.expected);
    });
  }
});

describe("vetores: parcelamento", () => {
  for (const c of installments.cases) {
    it(c.name, () => {
      const plan = planCardPurchase({
        card: { closingDay: c.closingDay, dueDay: c.dueDay },
        totalCents: c.totalCents,
        installments: c.installments,
        purchaseDate: c.purchaseDate,
        firstInvoiceOffset: c.firstInvoiceOffset as 0 | 1,
      });
      const flat = plan.items.map((i) => ({
        number: i.number,
        amountCents: i.amountCents,
        competenceDate: i.competenceDate,
        referenceMonth: i.invoice.referenceMonth,
        closingDate: i.invoice.closingDate,
        dueDate: i.invoice.dueDate,
      }));
      expect(flat).toEqual(c.expected);
      expect(flat.reduce((sum, i) => sum + i.amountCents, 0)).toBe(c.totalCents);
    });
  }
});

describe("vetores: limite do cartão", () => {
  for (const c of cardLimit.cases as unknown as (LedgerSpec & { limitCents: number })[]) {
    it(c.name, () => {
      const items = toTransactions(c.items ?? []);
      const balances = computeInvoiceBalances({
        invoices: toInvoices(c.invoices), items, payments: toPayments(c.payments), today: c.today,
      });
      expect(summarizeCardLimit(c.limitCents, balances)).toMatchObject(c.expected);
    });
  }
});

describe("vetores: dinheiro disponível", () => {
  for (const c of available.cases as unknown as LedgerSpec[]) {
    it(c.name, () => {
      expect(computeAvailable(c.today, toLedger(c))).toMatchObject(c.expected);
    });
  }
});

describe("vetores: projeção", () => {
  for (const c of projection.cases as unknown as LedgerSpec[]) {
    it(c.name, () => {
      const result = projectBalances({ today: c.today, months: c.months ?? 3, data: toLedger(c), rules: c.rules ?? [] });
      const expected = c.expected as { startCents: number; endCents: number[] };
      expect(result[0].startCents).toBe(expected.startCents);
      expect(result.map((m) => m.endCents)).toEqual(expected.endCents);
    });
  }
});
