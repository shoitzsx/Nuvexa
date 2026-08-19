export type ReportExpenseCategory = "debt" | "card" | "fixed" | "sporadic";

export interface MonthlyReportPoint {
  month: string;
  income: number;
  expenses: number;
  committedPercent: number | null;
  savingsBalance: number;
}

export interface ReportsSummary {
  income: number;
  expenses: number;
  expensesByReportCategory: Record<ReportExpenseCategory, number>;
  expensesByCategory: { name: string; total: number }[];
  expensesByCard: { name: string; total: number }[];
  monthly: MonthlyReportPoint[];
}