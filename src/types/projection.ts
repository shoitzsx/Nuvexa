export interface MonthlyProjection {
  month: string;
  expectedIncome: number;
  recurringExpenses: number;
  cardExpenses: number;
  debtExpenses: number;
  expectedExpenses: number;
  committed: number;
  projectedBalance: number;
}