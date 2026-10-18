import { describe, expect, it } from "vitest";
import { DomainError } from "./errors";
import { MAX_INSTALLMENTS, planCardPurchase } from "./installments";

const card = { closingDay: 5, dueDay: 12 };
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("planCardPurchase", () => {
  it("R$ 1.200 em 6x, comprado em 10/ago: seis parcelas de R$ 200 de set a fev", () => {
    const plan = planCardPurchase({ card, totalCents: 120_000, installments: 6, purchaseDate: "2026-08-10" });

    expect(plan.totalCents).toBe(120_000);
    expect(plan.installmentCount).toBe(6);
    expect(plan.purchaseDate).toBe("2026-08-10");
    expect(plan.items.map((i) => i.amountCents)).toEqual(Array(6).fill(20_000));
    expect(plan.items.map((i) => i.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(plan.items.map((i) => i.competenceDate)).toEqual([
      "2026-08-10", "2026-09-10", "2026-10-10", "2026-11-10", "2026-12-10", "2027-01-10",
    ]);
    expect(plan.items.map((i) => i.invoice.referenceMonth)).toEqual([
      "2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01",
    ]);
    expect(plan.items.map((i) => i.invoice.dueDate)).toEqual([
      "2026-09-12", "2026-10-12", "2026-11-12", "2026-12-12", "2027-01-12", "2027-02-12",
    ]);
  });

  it("R$ 100,00 em 3x: 33,34 / 33,33 / 33,33", () => {
    const plan = planCardPurchase({ card, totalCents: 10_000, installments: 3, purchaseDate: "2026-08-10" });
    expect(plan.items.map((i) => i.amountCents)).toEqual([3334, 3333, 3333]);
  });

  it("compra à vista é um plano de uma parcela, na fatura do ciclo", () => {
    const plan = planCardPurchase({ card, totalCents: 5000, installments: 1, purchaseDate: "2026-08-05" });
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].invoice.referenceMonth).toBe("2026-08-01");
    expect(plan.items[0].competenceDate).toBe("2026-08-05");
  });

  it("competência parte sempre da data original (31/jan em 3x: 31/jan, 28/fev, 31/mar)", () => {
    const plan = planCardPurchase({ card, totalCents: 9000, installments: 3, purchaseDate: "2026-01-31" });
    expect(plan.items.map((i) => i.competenceDate)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(plan.items.map((i) => i.invoice.referenceMonth)).toEqual(["2026-02-01", "2026-03-01", "2026-04-01"]);
  });

  it("parcelas que atravessam o fim do ano e o ano bissexto", () => {
    const plan = planCardPurchase({ card, totalCents: 12_000, installments: 12, purchaseDate: "2027-12-20" });
    expect(plan.items[0].invoice.referenceMonth).toBe("2028-01-01");
    expect(plan.items[1].invoice.closingDate).toBe("2028-02-05");
    expect(plan.items[11].invoice.referenceMonth).toBe("2028-12-01");
  });

  it("ajuste manual desloca todas as parcelas uma fatura adiante", () => {
    const plan = planCardPurchase({
      card, totalCents: 4000, installments: 2, purchaseDate: "2026-08-05", firstInvoiceOffset: 1,
    });
    expect(plan.items.map((i) => i.invoice.referenceMonth)).toEqual(["2026-09-01", "2026-10-01"]);
    // a competência (consumo) não muda com o ajuste da fatura
    expect(plan.items[0].competenceDate).toBe("2026-08-05");
  });

  it("a soma das parcelas é sempre exatamente o total", () => {
    for (const total of [48, 49, 100, 9_999, 123_457, 99_999_999_999]) {
      for (const count of [1, 2, 3, 7, 12, 48]) {
        if (total < count) continue;
        const plan = planCardPurchase({ card, totalCents: total, installments: count, purchaseDate: "2026-08-10" });
        expect(sum(plan.items.map((i) => i.amountCents))).toBe(total);
        expect(plan.items.every((i) => i.amountCents >= 1)).toBe(true);
      }
    }
  });

  it("faturas consecutivas, sem pular nem repetir mês", () => {
    const plan = planCardPurchase({ card, totalCents: 48_000, installments: MAX_INSTALLMENTS, purchaseDate: "2026-03-17" });
    const months = plan.items.map((i) => i.invoice.referenceMonth);
    expect(new Set(months).size).toBe(MAX_INSTALLMENTS);
    expect(months[0]).toBe("2026-04-01");
    expect(months[47]).toBe("2030-03-01");
  });
});

describe("planCardPurchase: entradas inválidas", () => {
  const base = { card, totalCents: 10_000, installments: 3, purchaseDate: "2026-08-10" };

  it.each([
    ["total zero", { totalCents: 0 }],
    ["total negativo", { totalCents: -100 }],
    ["total decimal", { totalCents: 10.5 }],
    ["total acima do teto", { totalCents: 100_000_000_001 }],
    ["zero parcelas", { installments: 0 }],
    ["parcelas decimais", { installments: 2.5 }],
    [`mais que ${MAX_INSTALLMENTS} parcelas`, { installments: MAX_INSTALLMENTS + 1 }],
    ["total menor que o número de parcelas", { totalCents: 2, installments: 3 }],
    ["data inválida", { purchaseDate: "2026-02-30" }],
    ["cartão inválido", { card: { closingDay: 0, dueDay: 12 } }],
  ])("rejeita %s", (_name, override) => {
    expect(() => planCardPurchase({ ...base, ...override })).toThrow(DomainError);
  });
});
