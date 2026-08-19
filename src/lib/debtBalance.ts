import type { Debt, DebtBalance } from "../types/debts";
import type { Transaction } from "../types/transactions";

export function calculateDebtBalance(debt: Debt, transactions: Transaction[]): DebtBalance {
  const totalPaid = transactions
    .filter((transaction) => transaction.debt_id === debt.id && transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const remaining = Math.max(0, debt.original_amount - totalPaid);
  const percentagePaid = Math.min(100, (totalPaid / debt.original_amount) * 100);

  return {
    totalPaid,
    remaining,
    percentagePaid,
    paymentsCount: transactions.filter((transaction) => transaction.debt_id === debt.id).length,
    estimatedMonthsRemaining: debt.installment_amount && remaining > 0
      ? Math.ceil(remaining / debt.installment_amount)
      : null,
  };
}