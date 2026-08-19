import {
  calculateInvoiceCycle,
  calculateInvoiceCycleForReferenceMonth,
} from "./invoiceCycle";
import type { CreditCard, InvoiceCycle } from "../types/creditCards";
import type { InstallmentPlanItem } from "../types/installments";

function nextReferenceMonth(referenceMonth: string): string {
  const [year, month] = referenceMonth.split("-").map(Number);
  const next = new Date(year, month, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

export function splitInstallmentAmounts(
  totalAmount: number,
  installmentsCount: number,
): number[] {
  const cents = Math.round(totalAmount * 100);
  const base = Math.floor(cents / installmentsCount);
  const remainder = cents - base * installmentsCount;

  return Array.from(
    { length: installmentsCount },
    (_, index) =>
      (base + (index === installmentsCount - 1 ? remainder : 0)) / 100,
  );
}

export function calculateInstallmentSchedule(
  purchaseDate: string,
  totalAmount: number,
  installmentsCount: number,
  card: Pick<CreditCard, "closing_day" | "due_day">,
): InstallmentPlanItem[] {
  const firstCycle = calculateInvoiceCycle(
    purchaseDate,
    card.closing_day,
    card.due_day,
  );
  const amounts = splitInstallmentAmounts(totalAmount, installmentsCount);
  let cycle: InvoiceCycle = firstCycle;

  return amounts.map((amount, index) => {
    if (index > 0) {
      cycle = calculateInvoiceCycleForReferenceMonth(
        nextReferenceMonth(cycle.referenceMonth),
        card.closing_day,
        card.due_day,
      );
    }

    return { installmentNumber: index + 1, amount, cycle };
  });
}
