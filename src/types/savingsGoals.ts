export type SavingsGoalStatus = "active" | "completed" | "cancelled";
export type SavingsTransactionType = "deposit" | "withdrawal";

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  target_date: string | null;
  status: SavingsGoalStatus;
  created_at: string;
}

export interface SavingsGoalMutation {
  name: string;
  description: string | null;
  target_amount: number;
  target_date: string | null;
  status: SavingsGoalStatus;
}

export interface SavingsTransaction {
  id: string;
  user_id: string;
  goal_id: string;
  type: SavingsTransactionType;
  amount: number;
  date: string;
  source: string | null;
  note: string | null;
  created_at: string;
}

export interface SavingsTransactionMutation {
  goal_id: string;
  type: SavingsTransactionType;
  amount: number;
  date: string;
  source: string | null;
  note: string | null;
}

export interface SavingsGoalBalance {
  savedAmount: number;
  savedThisMonth: number;
  remainingAmount: number;
  percentageComplete: number;
  transactionsCount: number;
}