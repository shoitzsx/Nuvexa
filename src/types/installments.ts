import type { CreditCard, InvoiceCycle } from "./creditCards";
import type { TransactionCategory } from "./transactions";

export interface InstallmentPurchase {
  id: string;
  user_id: string;
  description: string;
  category: TransactionCategory;
  credit_card_id: string | null;
  purchase_date: string;
  total_amount: number;
  installments_count: number;
  created_at: string;
}

export interface InstallmentPurchaseMutation {
  description: string;
  category: TransactionCategory;
  credit_card_id: string;
  purchase_date: string;
  total_amount: number;
  installments_count: number;
}

export interface InstallmentPlanItem {
  installmentNumber: number;
  amount: number;
  cycle: InvoiceCycle;
}

export interface InstallmentPlan {
  card: CreditCard;
  items: InstallmentPlanItem[];
}
