import { describe, expect, it } from "vitest";
import { calculateReportsSummary, categorizeExpenseForReports } from "./reportsEngine";
import type { Transaction } from "../types/transactions";

const transaction = (id: string, amount: number, links: Partial<Transaction>): Transaction => ({ id, user_id: "user", description: id, amount, type: "expense", category: "Outros", date: "2026-08-10", observation: null, income_source_id: null, recurring_expense_id: null, credit_card_id: null, invoice_id: null, installment_purchase_id: null, installment_number: null, installments_count: null, debt_id: null, created_at: "2026-08-10T00:00:00Z", ...links });

describe("report expense categorization", () => {
  it("uses precedence and keeps category totals exactly equal to total expenses", () => {
    const transactions = [transaction("debt", 100, { debt_id: "debt", credit_card_id: "card", recurring_expense_id: "fixed" }), transaction("card", 200, { credit_card_id: "card", recurring_expense_id: "fixed" }), transaction("fixed", 300, { recurring_expense_id: "fixed" }), transaction("sporadic", 400, {})];
    const summary = calculateReportsSummary(transactions, [], [], "2026-08-01", "2026-08-31");
    expect(transactions.map(categorizeExpenseForReports)).toEqual(["debt", "card", "fixed", "sporadic"]);
    expect(Object.values(summary.expensesByReportCategory).reduce((total, value) => total + value, 0)).toBe(summary.expenses);
    expect(summary.expenses).toBe(1000);
  });
});