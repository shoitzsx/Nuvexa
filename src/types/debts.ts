export type DebtStatus = "active" | "paid_off" | "renegotiated";

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  creditor: string;
  original_amount: number;
  interest_rate: number | null;
  installment_amount: number | null;
  total_installments: number | null;
  due_day: number | null;
  status: DebtStatus;
  notes: string | null;
  created_at: string;
}

export interface DebtMutation {
  name: string;
  creditor: string;
  original_amount: number;
  interest_rate: number | null;
  installment_amount: number | null;
  total_installments: number | null;
  due_day: number | null;
  status: DebtStatus;
  notes: string | null;
}

export interface DebtBalance {
  totalPaid: number;
  remaining: number;
  percentagePaid: number;
  paymentsCount: number;
  estimatedMonthsRemaining: number | null;
}