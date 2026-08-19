import type { InvoiceCycle } from "../types/creditCards";

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

export function calculateInvoiceCycleForReferenceMonth(
  referenceMonth: string,
  closingDay: number,
  dueDay: number,
): InvoiceCycle {
  const [year, month] = referenceMonth.split("-").map(Number);
  const closing = dateInMonth(year, month - 1, closingDay);
  const due = dateInMonth(
    closing.getFullYear(),
    closing.getMonth() + (dueDay < closingDay ? 1 : 0),
    dueDay,
  );

  return {
    referenceMonth,
    closingDate: formatDate(closing),
    dueDate: formatDate(due),
  };
}

export function calculateInvoiceCycle(
  purchaseDate: string,
  closingDay: number,
  dueDay: number,
): InvoiceCycle {
  const purchase = parseDate(purchaseDate);
  const currentClosing = dateInMonth(
    purchase.getFullYear(),
    purchase.getMonth(),
    closingDay,
  );
  const closing = purchase <= currentClosing
    ? currentClosing
    : dateInMonth(purchase.getFullYear(), purchase.getMonth() + 1, closingDay);
  return calculateInvoiceCycleForReferenceMonth(
    formatDate(closing).slice(0, 7),
    closingDay,
    dueDay,
  );
}