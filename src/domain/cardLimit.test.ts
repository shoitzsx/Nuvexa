import { describe, expect, it } from "vitest";
import {
  assertPaymentWithinDebt,
  computeInvoiceBalances,
  summarizeCardLimit,
} from "./cardLimit";
import { DomainError } from "./errors";
import { cardItem, invoice, payment, tx } from "./testing/builders";
import type { Invoice, InvoicePayment, Transaction } from "./types";

const LIMIT = 400_000;
const today = "2026-10-20";

const sep = invoice("sep", "2026-09-01", "2026-09-05", "2026-09-12");
const oct = invoice("oct", "2026-10-01", "2026-10-05", "2026-10-12");
const nov = invoice("nov", "2026-11-01", "2026-11-05", "2026-11-12");
const dec = invoice("dec", "2026-12-01", "2026-12-05", "2026-12-12");

function summary(invoices: Invoice[], items: Transaction[], payments: InvoicePayment[], limit = LIMIT, when = today) {
  const balances = computeInvoiceBalances({ invoices, items, payments, today: when });
  return { balances, ...summarizeCardLimit(limit, balances) };
}

const refund = (inv: Invoice, cents: number, original: string) =>
  cardItem(inv, cents, { kind: "refund", refundOfId: original, postedDate: "2026-10-20" });

describe("limite do cartão: dívida, limite usado, disponível e crédito", () => {
  it("L1: compra consome limite integral", () => {
    const s = summary([sep], [cardItem(sep, 20_000)], []);
    expect(s).toMatchObject({ debtCents: 20_000, limitUsedCents: 20_000, limitAvailableCents: 380_000, creditCents: 0 });
  });

  it("L2: pagamento integral libera o limite", () => {
    const s = summary([sep], [cardItem(sep, 20_000)], [payment("sep", "chk", 20_000, "2026-09-12")]);
    expect(s).toMatchObject({ debtCents: 0, limitUsedCents: 0, limitAvailableCents: 400_000, creditCents: 0 });
  });

  it("L3: estorno depois de pagar NÃO passa o limite disponível do contratado; vira crédito a favor", () => {
    const original = cardItem(sep, 20_000, { id: "orig" });
    const s = summary(
      [sep, nov],
      [original, refund(nov, 20_000, "orig")],
      [payment("sep", "chk", 20_000, "2026-09-12")],
    );
    expect(s.debtCents).toBe(0);
    expect(s.limitUsedCents).toBe(0);
    expect(s.limitAvailableCents).toBe(400_000); // e não 420.000
    expect(s.creditCents).toBe(20_000);
  });

  it("L4: nova compra consome primeiro o crédito a favor", () => {
    const original = cardItem(sep, 20_000, { id: "orig" });
    const s = summary(
      [sep, nov, dec],
      [original, refund(nov, 20_000, "orig"), cardItem(dec, 15_000)],
      [payment("sep", "chk", 20_000, "2026-09-12")],
    );
    expect(s).toMatchObject({ debtCents: 0, limitUsedCents: 0, limitAvailableCents: 400_000, creditCents: 5_000 });
  });

  it("L5: compra maior que o crédito consome só a diferença do limite", () => {
    const original = cardItem(sep, 20_000, { id: "orig" });
    const s = summary(
      [sep, nov, dec],
      [original, refund(nov, 20_000, "orig"), cardItem(dec, 55_000)],
      [payment("sep", "chk", 20_000, "2026-09-12")],
    );
    expect(s).toMatchObject({ debtCents: 35_000, limitUsedCents: 35_000, limitAvailableCents: 365_000, creditCents: 0 });
  });

  it("L6: crédito numa fatura nova não abate dívida de fatura anterior", () => {
    const aug = invoice("aug", "2026-08-01", "2026-08-05", "2026-08-12");
    const original = cardItem(aug, 40_000, { id: "orig" });
    const s = summary(
      [aug, sep],
      [original, cardItem(aug, 10_000), refund(sep, 30_000, "orig")],
      [],
      LIMIT,
      "2026-09-20",
    );
    const augBalance = s.balances.find((b) => b.invoiceId === "aug")!;
    expect(augBalance.effectiveDebtCents).toBe(50_000);
    expect(s.debtCents).toBe(50_000);
    expect(s.limitAvailableCents).toBe(350_000);
    expect(s.creditCents).toBe(30_000);
  });

  it("L7: crédito grande é carregado para as faturas seguintes (parcelas)", () => {
    const aug = invoice("aug", "2026-08-01", "2026-08-05", "2026-08-12");
    const original = cardItem(aug, 40_000, { id: "orig" });
    const s = summary(
      [aug, sep, oct, nov],
      [original, refund(sep, 30_000, "orig"), cardItem(oct, 20_000), cardItem(nov, 20_000)],
      [payment("aug", "chk", 40_000, "2026-08-12")],
      LIMIT,
      "2026-09-20",
    );
    const byId = Object.fromEntries(s.balances.map((b) => [b.invoiceId, b]));
    expect(byId.sep).toMatchObject({ effectiveDebtCents: 0, carryOutCents: 30_000 });
    expect(byId.oct).toMatchObject({ effectiveDebtCents: 0, carryInCents: 30_000, carryOutCents: 10_000 });
    expect(byId.nov).toMatchObject({ effectiveDebtCents: 10_000, carryOutCents: 0 });
    expect(s).toMatchObject({ debtCents: 10_000, limitAvailableCents: 390_000, creditCents: 0 });
  });

  it("L8: dívida acima do limite zera o disponível e informa o excedente", () => {
    const s = summary([sep], [cardItem(sep, 120_000)], [], 100_000);
    expect(s).toMatchObject({ limitUsedCents: 120_000, limitAvailableCents: 0, limitExceededByCents: 20_000 });
  });

  it("pagamento parcial reduz só o valor pago; o restante continua consumindo limite", () => {
    const s = summary([oct], [cardItem(oct, 20_000)], [payment("oct", "chk", 12_000, "2026-10-12")]);
    expect(s.balances[0]).toMatchObject({ balanceCents: 8_000, effectiveDebtCents: 8_000 });
    expect(s).toMatchObject({ debtCents: 8_000, limitAvailableCents: 392_000 });
  });

  it("compra de R$ 1.200 em 6x consome R$ 1.200 do limite de uma vez; cada pagamento libera só o pago", () => {
    const aug = invoice("aug", "2026-08-01", "2026-08-05", "2026-08-12");
    const invs = [aug, sep, oct, nov, dec, invoice("jan", "2027-01-01", "2027-01-05", "2027-01-12"), invoice("feb", "2027-02-01", "2027-02-05", "2027-02-12")];
    const parcels = [sep, oct, nov, dec, invs[5], invs[6]].map((inv) => cardItem(inv, 20_000, { competenceDate: "2026-08-10" }));
    const augItems = [cardItem(aug, 90_000)];

    // 0: antes (fatura de agosto com 900)
    expect(summary([aug], augItems, [], LIMIT, "2026-08-10")).toMatchObject({ limitUsedCents: 90_000, limitAvailableCents: 310_000 });
    // 1: compra de 1.200 em 6x
    expect(summary(invs, [...augItems, ...parcels], [], LIMIT, "2026-08-10")).toMatchObject({
      limitUsedCents: 210_000, limitAvailableCents: 190_000,
    });
    // 2: paga agosto
    const p2 = [payment("aug", "chk", 90_000, "2026-08-12")];
    expect(summary(invs, [...augItems, ...parcels], p2, LIMIT, "2026-08-12")).toMatchObject({ limitUsedCents: 120_000, limitAvailableCents: 280_000 });
    // 3: paga a parcela 1
    const p3 = [...p2, payment("sep", "chk", 20_000, "2026-09-12")];
    expect(summary(invs, [...augItems, ...parcels], p3, LIMIT, "2026-09-12")).toMatchObject({ limitUsedCents: 100_000, limitAvailableCents: 300_000 });
    // 4: paga 120 dos 200 da parcela 2
    const p4 = [...p3, payment("oct", "chk", 12_000, "2026-10-12")];
    expect(summary(invs, [...augItems, ...parcels], p4, LIMIT, "2026-10-12")).toMatchObject({ limitUsedCents: 88_000, limitAvailableCents: 312_000 });
    // 5: estorno de 200 da parcela 1, creditado na fatura de novembro
    const items5 = [...augItems, ...parcels, refund(nov, 20_000, parcels[0].id)];
    expect(summary(invs, items5, p4, LIMIT, "2026-10-20")).toMatchObject({ limitUsedCents: 68_000, limitAvailableCents: 332_000, creditCents: 0 });
  });

  it("propriedade: o limite disponível nunca passa do contratado e crédito/dívida nunca são negativos", () => {
    const original = cardItem(sep, 10_000, { id: "orig" });
    for (const refundCents of [1, 5_000, 10_000]) {
      for (const paid of [0, 4_000, 10_000]) {
        const s = summary(
          [sep, oct],
          [original, refund(oct, refundCents, "orig")],
          paid > 0 ? [payment("sep", "chk", paid, "2026-09-12")] : [],
        );
        expect(s.limitAvailableCents).toBeLessThanOrEqual(LIMIT);
        expect(s.limitAvailableCents).toBeGreaterThanOrEqual(0);
        expect(s.debtCents).toBeGreaterThanOrEqual(0);
        expect(s.creditCents).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("fatura fechada depois do dia do fechamento (fechamento inclusivo)", () => {
    const items = [cardItem(sep, 10_000), cardItem(oct, 5_000)];
    const a = summary([sep, oct], items, [], LIMIT, "2026-10-05");
    expect(a.balances.map((b) => b.closed)).toEqual([true, false]); // dia do fechamento ainda é fatura aberta
    expect(a).toMatchObject({ debtBilledCents: 10_000, debtUnbilledCents: 5_000, debtCents: 15_000 });
    expect(summary([sep, oct], items, [], LIMIT, "2026-10-06").balances.map((b) => b.closed)).toEqual([true, true]);
  });

  it("itens cancelados não contam", () => {
    const canceled = cardItem(sep, 99_999, { status: "canceled" });
    expect(summary([sep], [cardItem(sep, 1_000), canceled], []).debtCents).toBe(1_000);
  });

  it("sem faturas: tudo zerado e limite integral", () => {
    expect(summary([], [], [])).toMatchObject({ debtCents: 0, limitAvailableCents: LIMIT, creditCents: 0 });
  });
});

describe("pagamento acima da dívida", () => {
  it("L9: rejeita pagamento maior que a dívida efetiva e aceita até o valor exato", () => {
    const balances = computeInvoiceBalances({
      invoices: [sep], items: [cardItem(sep, 20_000)], payments: [payment("sep", "chk", 5_000, "2026-09-10")], today,
    });
    expect(() => assertPaymentWithinDebt(balances, "sep", 15_000)).not.toThrow();
    expect(() => assertPaymentWithinDebt(balances, "sep", 15_001)).toThrow(DomainError);
    expect(() => assertPaymentWithinDebt(balances, "sep", 0)).toThrow(DomainError);
    expect(() => assertPaymentWithinDebt(balances, "nope", 1)).toThrow(DomainError);
  });

  it("não deixa pagar fatura que só tem crédito", () => {
    const original = cardItem(sep, 10_000, { id: "orig" });
    const balances = computeInvoiceBalances({
      invoices: [sep, oct], items: [original, refund(oct, 5_000, "orig")], payments: [payment("sep", "chk", 10_000, "2026-09-12")], today,
    });
    expect(() => assertPaymentWithinDebt(balances, "oct", 1)).toThrow(DomainError);
  });
});

describe("entradas inválidas", () => {
  it("item em fatura inexistente, em fatura de outro cartão, planejado ou receita", () => {
    expect(() => computeInvoiceBalances({ invoices: [sep], items: [cardItem(oct, 100)], payments: [], today })).toThrow(DomainError);
    expect(() => computeInvoiceBalances({ invoices: [sep], items: [cardItem(sep, 100, { cardId: "outro" })], payments: [], today })).toThrow(DomainError);
    expect(() =>
      computeInvoiceBalances({ invoices: [sep], items: [cardItem(sep, 100, { status: "planned", postedDate: null, expectedDate: "2026-09-01" })], payments: [], today }),
    ).toThrow(DomainError);
    expect(() => computeInvoiceBalances({ invoices: [sep], items: [cardItem(sep, 100, { kind: "income" })], payments: [], today })).toThrow(DomainError);
  });

  it("pagamento em fatura inexistente, valor inválido e ids duplicados", () => {
    expect(() => computeInvoiceBalances({ invoices: [sep], items: [], payments: [payment("zzz", "chk", 100, "2026-09-12")], today })).toThrow(DomainError);
    expect(() => computeInvoiceBalances({ invoices: [sep], items: [], payments: [payment("sep", "chk", 0, "2026-09-12")], today })).toThrow(DomainError);
    const dup = tx({ id: "dup", accountId: null, cardId: "cc", invoiceId: "sep", amountCents: 100 });
    expect(() => computeInvoiceBalances({ invoices: [sep], items: [dup, { ...dup }], payments: [], today })).toThrow(DomainError);
  });

  it("limite contratado inválido", () => {
    expect(() => summarizeCardLimit(-1, [])).toThrow(DomainError);
    expect(() => summarizeCardLimit(10.5, [])).toThrow(DomainError);
  });
});
