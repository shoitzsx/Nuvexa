import type { SavingsGoal, SavingsGoalBalance, SavingsTransaction } from "../types/savingsGoals";

function monthPrefix(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function calculateSavingsGoalBalance(
  goal: SavingsGoal,
  transactions: SavingsTransaction[],
  currentDate = new Date(),
): SavingsGoalBalance {
  const goalTransactions = transactions.filter((transaction) => transaction.goal_id === goal.id);
  const signedAmount = (transaction: SavingsTransaction) => transaction.type === "deposit" ? transaction.amount : -transaction.amount;
  const savedAmount = goalTransactions.reduce((total, transaction) => total + signedAmount(transaction), 0);
  const currentMonth = monthPrefix(currentDate);
  const savedThisMonth = goalTransactions
    .filter((transaction) => transaction.date.startsWith(currentMonth))
    .reduce((total, transaction) => total + signedAmount(transaction), 0);

  return {
    savedAmount,
    savedThisMonth,
    remainingAmount: Math.max(0, goal.target_amount - savedAmount),
    percentageComplete: Math.max(0, Math.min(100, (savedAmount / goal.target_amount) * 100)),
    transactionsCount: goalTransactions.length,
  };
}