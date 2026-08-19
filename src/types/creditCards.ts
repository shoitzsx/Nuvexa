export type CreditCardStatus = "active" | "inactive";
export type InvoiceStatus = "open" | "closed" | "paid";

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  institution: string;
  brand: string;
  last_four_digits: string | null;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  color: string;
  status: CreditCardStatus;
  created_at: string;
}

export interface CreditCardMutation {
  name: string;
  institution: string;
  brand: string;
  last_four_digits: string | null;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  color: string;
  status: CreditCardStatus;
}

export interface Invoice {
  id: string;
  user_id: string;
  credit_card_id: string | null;
  reference_month: string;
  closing_date: string;
  due_date: string;
  status: InvoiceStatus;
  paid_at: string | null;
  created_at: string;
}

export interface InvoiceCycle {
  referenceMonth: string;
  closingDate: string;
  dueDate: string;
}