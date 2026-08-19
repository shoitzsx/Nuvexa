import { describe, expect, it } from "vitest";
import { calculateInvoiceCycle } from "./invoiceCycle";

describe("calculateInvoiceCycle", () => {
  it("inclui compra exatamente no fechamento na fatura atual", () => {
    expect(calculateInvoiceCycle("2025-03-20", 20, 27)).toEqual({ referenceMonth: "2025-03", closingDate: "2025-03-20", dueDate: "2025-03-27" });
  });

  it("envia compra após o fechamento para o próximo ciclo", () => {
    expect(calculateInvoiceCycle("2025-03-22", 20, 27)).toEqual({ referenceMonth: "2025-04", closingDate: "2025-04-20", dueDate: "2025-04-27" });
  });

  it("ajusta fechamento dia 31 em meses de 30 dias", () => {
    expect(calculateInvoiceCycle("2025-04-30", 31, 10)).toEqual({ referenceMonth: "2025-04", closingDate: "2025-04-30", dueDate: "2025-05-10" });
  });

  it("ajusta fechamento dia 30 para fevereiro não bissexto", () => {
    expect(calculateInvoiceCycle("2025-02-28", 30, 5)).toEqual({ referenceMonth: "2025-02", closingDate: "2025-02-28", dueDate: "2025-03-05" });
  });

  it("ajusta fechamento dia 31 para fevereiro bissexto", () => {
    expect(calculateInvoiceCycle("2024-02-29", 31, 5)).toEqual({ referenceMonth: "2024-02", closingDate: "2024-02-29", dueDate: "2024-03-05" });
  });

  it("vira o ano quando a compra ocorre após o fechamento de dezembro", () => {
    expect(calculateInvoiceCycle("2025-12-31", 20, 5)).toEqual({ referenceMonth: "2026-01", closingDate: "2026-01-20", dueDate: "2026-02-05" });
  });

  it("calcula vencimento no mês seguinte quando ele é menor que o fechamento", () => {
    expect(calculateInvoiceCycle("2025-03-10", 28, 5)).toEqual({ referenceMonth: "2025-03", closingDate: "2025-03-28", dueDate: "2025-04-05" });
  });
});