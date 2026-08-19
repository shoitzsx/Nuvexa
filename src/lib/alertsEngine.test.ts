import { describe, expect, it } from "vitest";
import { getFinancialAlerts } from "./alertsEngine";

const card = { id: "card", user_id: "user", name: "Principal", institution: "Banco", brand: "Visa", last_four_digits: null, credit_limit: 1000, closing_day: 10, due_day: 15, color: "#000", status: "active" as const, created_at: "2026-01-01T00:00:00Z" };
const invoice = { id: "invoice", user_id: "user", credit_card_id: "card", reference_month: "2026-08", closing_date: "2026-08-10", due_date: "2026-08-20", status: "open" as const, paid_at: null, created_at: "2026-08-01T00:00:00Z" };
const base = { creditCards: [card], invoices: [invoice], recurringExpenses: [], debts: [], goals: [], savingsTransactions: [], incomeSources: [], transactions: [] };

describe("getFinancialAlerts", () => {
  it("alerts about a due invoice and high card usage with stable keys", () => {
    const transaction = { id: "transaction", user_id: "user", description: "Compra", amount: 850, type: "expense" as const, category: "Outros", date: "2026-08-10", observation: null, income_source_id: null, recurring_expense_id: null, credit_card_id: "card", invoice_id: "invoice", installment_purchase_id: null, installment_number: null, installments_count: null, debt_id: null, created_at: "2026-08-10T00:00:00Z" };
    const keys = getFinancialAlerts({ ...base, transactions: [transaction], currentDate: new Date("2026-08-18T12:00:00") }).map((alert) => alert.key);
    expect(keys).toContain("invoice_due:invoice");
    expect(keys).toContain("card_limit:card:2026-08");
  });

  it("alerts about the final installment in the current invoice month", () => {
    const transaction = { id: "installment", user_id: "user", description: "Notebook", amount: 100, type: "expense" as const, category: "Outros", date: "2026-08-10", observation: null, income_source_id: null, recurring_expense_id: null, credit_card_id: "card", invoice_id: "invoice", installment_purchase_id: "purchase", installment_number: 6, installments_count: 6, debt_id: null, created_at: "2026-08-10T00:00:00Z" };
    expect(getFinancialAlerts({ ...base, transactions: [transaction], currentDate: new Date("2026-08-18T12:00:00") }).some((alert) => alert.key === "last_installment:installment")).toBe(true);
  });

  it("different invoices produce distinct keys that do not cross-dismiss", () => {
    const invoiceA = { ...invoice, id: "invoice-a", due_date: "2026-08-20" };
    const invoiceB = { ...invoice, id: "invoice-b", credit_card_id: "card-b", due_date: "2026-08-21" };
    const cardB = { ...card, id: "card-b", name: "Secundário" };
    const alerts = getFinancialAlerts({ ...base, creditCards: [card, cardB], invoices: [invoiceA, invoiceB], currentDate: new Date("2026-08-18T12:00:00") });
    const keys = alerts.map((a) => a.key);
    expect(keys).toContain("invoice_due:invoice-a");
    expect(keys).toContain("invoice_due:invoice-b");
    // Keys must be distinct so dismissing one does not affect the other
    expect(new Set(keys).size).toBe(keys.length);
  });
});