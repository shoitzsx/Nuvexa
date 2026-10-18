import { describe, expect, it } from "vitest";
import { DomainError } from "./errors";
import { invoiceDatesForMonth, invoiceForPurchase } from "./invoiceCycle";

const card = { closingDay: 5, dueDay: 12 };

describe("invoiceDatesForMonth", () => {
  it("vencimento no mesmo mês quando o dia de vencimento é maior que o de fechamento", () => {
    expect(invoiceDatesForMonth(card, "2026-09-01")).toEqual({
      referenceMonth: "2026-09-01",
      closingDate: "2026-09-05",
      dueDate: "2026-09-12",
    });
  });

  it("vencimento no mês seguinte quando o dia de vencimento é menor", () => {
    expect(invoiceDatesForMonth({ closingDay: 25, dueDay: 5 }, "2026-08-01")).toEqual({
      referenceMonth: "2026-08-01",
      closingDate: "2026-08-25",
      dueDate: "2026-09-05",
    });
  });

  it("dia de vencimento igual ao de fechamento vai para o mês seguinte", () => {
    expect(invoiceDatesForMonth({ closingDay: 5, dueDay: 5 }, "2026-08-01").dueDate).toBe("2026-09-05");
  });

  it("vencimento de dezembro cai em janeiro do ano seguinte", () => {
    expect(invoiceDatesForMonth({ closingDay: 25, dueDay: 5 }, "2026-12-01").dueDate).toBe("2027-01-05");
  });

  it("meses curtos: dia 31 vira o último dia", () => {
    expect(invoiceDatesForMonth({ closingDay: 31, dueDay: 10 }, "2026-02-01")).toMatchObject({
      closingDate: "2026-02-28",
      dueDate: "2026-03-10",
    });
    expect(invoiceDatesForMonth({ closingDay: 31, dueDay: 10 }, "2028-02-01").closingDate).toBe("2028-02-29");
    expect(invoiceDatesForMonth({ closingDay: 28, dueDay: 31 }, "2026-02-01").dueDate).toBe("2026-02-28");
  });

  it("aceita qualquer dia do mês como referência e normaliza para o dia 1", () => {
    expect(invoiceDatesForMonth(card, "2026-09-17").referenceMonth).toBe("2026-09-01");
  });
});

describe("invoiceForPurchase (fechamento inclusivo)", () => {
  it("compra no dia do fechamento ainda entra na fatura que fecha naquele dia", () => {
    expect(invoiceForPurchase(card, "2026-08-05").referenceMonth).toBe("2026-08-01");
    expect(invoiceForPurchase(card, "2026-08-04").referenceMonth).toBe("2026-08-01");
    expect(invoiceForPurchase(card, "2026-08-01").referenceMonth).toBe("2026-08-01");
  });

  it("compra depois do fechamento vai para a fatura seguinte (como na landing)", () => {
    expect(invoiceForPurchase(card, "2026-08-06")).toEqual({
      referenceMonth: "2026-09-01",
      closingDate: "2026-09-05",
      dueDate: "2026-09-12",
    });
  });

  it("compra no último dia do ano cai em janeiro", () => {
    expect(invoiceForPurchase(card, "2026-12-31")).toMatchObject({
      referenceMonth: "2027-01-01",
      closingDate: "2027-01-05",
      dueDate: "2027-01-12",
    });
  });

  it("fechamento dia 31 em mês curto", () => {
    const c = { closingDay: 31, dueDay: 10 };
    expect(invoiceForPurchase(c, "2026-04-30")).toMatchObject({ referenceMonth: "2026-04-01", closingDate: "2026-04-30" });
    expect(invoiceForPurchase(c, "2027-02-28")).toMatchObject({ referenceMonth: "2027-02-01", closingDate: "2027-02-28" });
    expect(invoiceForPurchase(c, "2028-02-29")).toMatchObject({ referenceMonth: "2028-02-01", closingDate: "2028-02-29" });
  });

  it("ajuste manual: desloca uma fatura adiante", () => {
    expect(invoiceForPurchase(card, "2026-08-05", 1).referenceMonth).toBe("2026-09-01");
    expect(invoiceForPurchase(card, "2026-08-05", 0).referenceMonth).toBe("2026-08-01");
  });
});

describe("validações", () => {
  it.each([0, 32, 1.5, -1, NaN])("rejeita dia de fechamento %s", (closingDay) => {
    expect(() => invoiceDatesForMonth({ closingDay, dueDay: 10 }, "2026-08-01")).toThrow(DomainError);
  });
  it.each([0, 32, 2.5])("rejeita dia de vencimento %s", (dueDay) => {
    expect(() => invoiceDatesForMonth({ closingDay: 5, dueDay }, "2026-08-01")).toThrow(DomainError);
  });
  it("rejeita data de compra inválida e deslocamento inválido", () => {
    expect(() => invoiceForPurchase(card, "2026-02-30")).toThrow(DomainError);
    // @ts-expect-error valor fora do contrato
    expect(() => invoiceForPurchase(card, "2026-08-05", 2)).toThrow(DomainError);
  });
});
