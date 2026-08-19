import { describe, expect, it } from "vitest";
import { calculateSavingsGoalBalance } from "./savingsGoalBalance";
import type { SavingsGoal, SavingsTransaction } from "../types/savingsGoals";

const goal: SavingsGoal = { id: "goal-1", user_id: "user-1", name: "Reserva", description: null, target_amount: 1000, target_date: null, status: "active", created_at: "2026-01-01T00:00:00Z" };
const transactions: SavingsTransaction[] = [
  { id: "one", user_id: "user-1", goal_id: "goal-1", type: "deposit", amount: 600, date: "2026-08-01", source: null, note: null, created_at: "2026-08-01T00:00:00Z" },
  { id: "two", user_id: "user-1", goal_id: "goal-1", type: "deposit", amount: 200, date: "2026-07-15", source: null, note: null, created_at: "2026-07-15T00:00:00Z" },
  { id: "three", user_id: "user-1", goal_id: "goal-1", type: "withdrawal", amount: 100, date: "2026-08-12", source: null, note: null, created_at: "2026-08-12T00:00:00Z" },
];

describe("calculateSavingsGoalBalance", () => {
  it("derives saved, monthly and remaining values from contribution events", () => {
    expect(calculateSavingsGoalBalance(goal, transactions, new Date("2026-08-18T12:00:00"))).toMatchObject({ savedAmount: 700, savedThisMonth: 500, remainingAmount: 300, percentageComplete: 70, transactionsCount: 3 });
  });

  it("permits a negative saved balance when withdrawals exceed deposits", () => {
    const result = calculateSavingsGoalBalance(goal, [{ ...transactions[2], amount: 1200 }], new Date("2026-08-18T12:00:00"));
    expect(result).toMatchObject({ savedAmount: -1200, remainingAmount: 2200, percentageComplete: 0 });
  });
});