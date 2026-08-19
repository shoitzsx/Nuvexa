import { describe, expect, it } from "vitest";
import { calculateMonthlyProjection } from "./projectionEngine";
import type { ProjectionInput } from "./projectionEngine";

const base: Omit<ProjectionInput, "startMonth" | "months"> = { incomeSources: [], recurringExpenses: [], invoices: [], debts: [], transactions: [], currentDate: new Date("2026-08-18T12:00:00") };
const expense = { id: "expense", user_id: "user", name: "Aluguel", category: "Moradia", amount: 500, due_day: 10, frequency: "monthly" as const, start_date: "2026-01-01", end_date: null, total_occurrences: null, payment_method: "Pix" as const, status: "active" as const, notes: null, created_at: "2026-01-01T00:00:00Z" };
const debt = { id: "debt", user_id: "user", name: "Empréstimo", creditor: "Banco", original_amount: 650, interest_rate: null, installment_amount: 300, total_installments: null, due_day: 10, status: "active" as const, notes: null, created_at: "2026-01-01T00:00:00Z" };

describe("calculateMonthlyProjection", () => {
  it("combines recurring income and a monthly recurring expense", () => {
    const result = calculateMonthlyProjection({ ...base, startMonth: "2026-08", months: 1, incomeSources: [{ id: "income", user_id: "user", name: "Salário", recurrence_type: "recurring", category: "Salário", expected_amount: 2000, status: "active", created_at: "2026-01-01T00:00:00Z" }], recurringExpenses: [expense] });
    expect(result[0]).toMatchObject({ expectedIncome: 2000, recurringExpenses: 500, committed: 500, projectedBalance: 1500 });
  });

  it("stops projecting an expense after its occurrence limit", () => {
    const result = calculateMonthlyProjection({ ...base, startMonth: "2026-08", months: 2, recurringExpenses: [{ ...expense, start_date: "2026-07-01", total_occurrences: 2 }] });
    expect(result.map((month) => month.recurringExpenses)).toEqual([500, 0]);
  });

  it("uses only the remaining debt amount in the final projected month", () => {
    const result = calculateMonthlyProjection({ ...base, startMonth: "2026-08", months: 4, debts: [debt] });
    expect(result.map((month) => month.debtExpenses)).toEqual([300, 300, 50, 0]);
  });

  it("uses the generated current-month transaction instead of the simulated recurring amount", () => {
    const transaction = { id: "transaction", user_id: "user", description: "Aluguel", amount: 625, type: "expense" as const, category: "Moradia", date: "2026-08-10", observation: null, income_source_id: null, recurring_expense_id: "expense", credit_card_id: null, invoice_id: null, installment_purchase_id: null, installment_number: null, installments_count: null, debt_id: null, created_at: "2026-08-10T00:00:00Z" };
    const result = calculateMonthlyProjection({ ...base, startMonth: "2026-08", months: 1, recurringExpenses: [expense], transactions: [transaction] });
    expect(result[0].recurringExpenses).toBe(625);
  });

  it("combines all four data sources and produces the expected residual debt value in the final month", () => {
    // Scenario: income R$5000, recurring R$1200, card R$400/month for 3 months, debt R$800 at R$350/month
    // Debt residual: 800 - 350 - 350 = 100 in month 3, then 0 in month 4
    const income = { id: "income", user_id: "user", name: "Salário", recurrence_type: "recurring" as const, category: "Salário" as const, expected_amount: 5000, status: "active" as const, created_at: "2026-01-01T00:00:00Z" };
    const recurring = { ...expense, amount: 1200 };
    const fullDebt = { ...debt, original_amount: 800, installment_amount: 350 };
    const invoices = [
      { id: "inv-aug", user_id: "user", credit_card_id: "card", reference_month: "2026-08", closing_date: "2026-08-12", due_date: "2026-08-20", status: "open" as const, paid_at: null, created_at: "2026-08-01T00:00:00Z" },
      { id: "inv-sep", user_id: "user", credit_card_id: "card", reference_month: "2026-09", closing_date: "2026-09-12", due_date: "2026-09-20", status: "open" as const, paid_at: null, created_at: "2026-09-01T00:00:00Z" },
      { id: "inv-oct", user_id: "user", credit_card_id: "card", reference_month: "2026-10", closing_date: "2026-10-12", due_date: "2026-10-20", status: "open" as const, paid_at: null, created_at: "2026-10-01T00:00:00Z" },
    ];
    const makeCardTx = (id: string, invoiceId: string, date: string) => ({ id, user_id: "user", description: "Parcela", amount: 400, type: "expense" as const, category: "Outros", date, observation: null, income_source_id: null, recurring_expense_id: null, credit_card_id: "card", invoice_id: invoiceId, installment_purchase_id: "purchase", installment_number: 1, installments_count: 3, debt_id: null, created_at: `${date}T00:00:00Z` });
    const transactions = [makeCardTx("t1", "inv-aug", "2026-08-12"), makeCardTx("t2", "inv-sep", "2026-09-12"), makeCardTx("t3", "inv-oct", "2026-10-12")];
    const result = calculateMonthlyProjection({ ...base, startMonth: "2026-08", months: 4, incomeSources: [income], recurringExpenses: [recurring], invoices, debts: [fullDebt], transactions });
    expect(result.map((m) => m.expectedIncome)).toEqual([5000, 5000, 5000, 5000]);
    expect(result.map((m) => m.recurringExpenses)).toEqual([1200, 1200, 1200, 1200]);
    expect(result.map((m) => m.cardExpenses)).toEqual([400, 400, 400, 0]);
    expect(result.map((m) => m.debtExpenses)).toEqual([350, 350, 100, 0]);
    expect(result.map((m) => m.projectedBalance)).toEqual([3050, 3050, 3300, 3800]);
  });
});