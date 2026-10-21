import { describe, expect, it } from "vitest";
import { accountBalance } from "./balance";
import { availabilityHorizon, computeAvailable } from "./available";
import { DomainError } from "./errors";
import { account, cardItem, contribution, invoice, ledger, payment, planned, posted, transfer } from "./testing/builders";
import type { LedgerData, Transaction } from "./types";

const today = "2026-08-10";

/**
 * Cenário-base (todos os valores fictícios):
 * corrente 6.500, poupança 2.000 (fora do disponível), reserva virtual 500 na corrente,
 * internet planejada de 100 (20/ago), salário previsto em 5/set,
 * fatura de agosto 900 (vence 12/ago) e de setembro 500 (vence 12/set).
 */
function base(over: { salaryDate?: string; extraTx?: Transaction[]; extraData?: Partial<LedgerData> } = {}) {
  const chk = account({ id: "chk", openingBalanceCents: 650_000 });
  const sav = account({ id: "sav", openingBalanceCents: 200_000, includeInAvailable: false });
  const aug = invoice("aug", "2026-08-01", "2026-08-05", "2026-08-12");
  const sep = invoice("sep", "2026-09-01", "2026-09-05", "2026-09-12");
  const augItems = [cardItem(aug, 90_000, { id: "aug-1" })];
  const sepItems = [cardItem(sep, 20_000, { id: "sep-orig" }), cardItem(sep, 30_000, { id: "sep-2" })];
  const data: LedgerData = ledger({
    accounts: [chk, sav],
    invoices: [aug, sep],
    contributions: [contribution("chk", 50_000)],
    transactions: [
      planned("expense", "chk", 10_000, "2026-08-20", { id: "internet" }),
      planned("income", "chk", 500_000, over.salaryDate ?? "2026-09-05", { id: "salary" }),
      ...augItems,
      ...sepItems,
      ...(over.extraTx ?? []),
    ],
    ...over.extraData,
  });
  return { data, chk, sav, aug, sep };
}

describe("availabilityHorizon", () => {
  it("é a véspera da próxima receita prevista", () => {
    expect(availabilityHorizon(today, [planned("income", "chk", 1, "2026-09-05")])).toBe("2026-09-04");
  });
  it("usa a receita prevista mais próxima e ignora atrasadas, canceladas e despesas", () => {
    const txs = [
      planned("income", "chk", 1, "2026-09-20"),
      planned("income", "chk", 1, "2026-08-25"),
      planned("income", "chk", 1, "2026-08-01"), // atrasada: não é "próxima"
      planned("income", "chk", 1, "2026-08-15", { status: "canceled" }),
      planned("expense", "chk", 1, "2026-08-11"),
    ];
    expect(availabilityHorizon(today, txs)).toBe("2026-08-24");
  });
  it("sem receita prevista, vai até o fim do mês", () => {
    expect(availabilityHorizon(today, [])).toBe("2026-08-31");
  });
  it("receita amanhã: o horizonte é hoje (nunca antes de hoje)", () => {
    expect(availabilityHorizon(today, [planned("income", "chk", 1, "2026-08-11")])).toBe("2026-08-10");
  });
});

describe("computeAvailable: cenário-base = R$ 5.000", () => {
  it("6.500 − reserva 500 − internet 100 − fatura de agosto 900", () => {
    const { data } = base();
    const result = computeAvailable(today, data);
    expect(result).toMatchObject({
      horizon: "2026-09-04",
      cashCents: 650_000,
      reserveEffectiveCents: 50_000,
      plannedExpensesCents: 10_000,
      invoiceObligationsCents: 90_000,
      availableCents: 500_000,
    });
  });

  it("a poupança (fora do disponível) e a reserva dentro dela não entram", () => {
    const { data } = base();
    const withSavings = { ...data, contributions: [...data.contributions, contribution("sav", 100_000, { goalId: "reserva" })] };
    expect(computeAvailable(today, withSavings).availableCents).toBe(500_000);
  });

  it("mostra também o cenário 'se a receita esperada chegar' (receitas atrasadas, que não definem o horizonte)", () => {
    const overdue = planned("income", "chk", 30_000, "2026-08-01", { id: "freela" });
    const { data } = base({ extraTx: [overdue] });
    const result = computeAvailable(today, data);
    expect(result.plannedIncomeCents).toBe(30_000);
    expect(result.availableCents).toBe(500_000); // receita não recebida nunca soma ao disponível
    expect(result.availableIfIncomeReceivedCents).toBe(530_000);
  });
});

describe("T5: sem contagem duplicada nem desconto repetido", () => {
  it("T5.1: parcela e demais itens da fatura entram uma só vez, pelo saldo da fatura", () => {
    // receita só em 16/set: horizonte 15/set inclui a fatura de setembro (vence 12/set), com 200 + 300
    const { data } = base({ salaryDate: "2026-09-16" });
    const result = computeAvailable(today, data);
    expect(result.horizon).toBe("2026-09-15");
    expect(result.invoiceObligationsCents).toBe(90_000 + 50_000); // nunca 90.000 + 50.000 + 20.000
    expect(result.availableCents).toBe(450_000);
  });

  it("T5.2: liquidar a internet planejada não altera o disponível", () => {
    const { data } = base();
    const settled: LedgerData = {
      ...data,
      transactions: data.transactions.map((t) =>
        t.id === "internet" ? { ...t, status: "posted", postedDate: "2026-08-10", expectedDate: "2026-08-20" } : t,
      ),
    };
    expect(accountBalance(data.accounts[0], settled, today)).toBe(640_000);
    expect(computeAvailable(today, settled).availableCents).toBe(500_000);
  });

  it("T5.3: pagar parte da fatura só move a obrigação para dentro do saldo", () => {
    const { data } = base();
    const partial = { ...data, payments: [payment("aug", "chk", 40_000, "2026-08-10")] };
    const result = computeAvailable(today, partial);
    expect(result.cashCents).toBe(610_000);
    expect(result.invoiceObligationsCents).toBe(50_000);
    expect(result.availableCents).toBe(500_000);
  });

  it("T5.4: reserva maior que o saldo vira reserva descoberta, sem desconto negativo", () => {
    const chk = account({ id: "chk", openingBalanceCents: 30_000 });
    const data = ledger({ accounts: [chk], contributions: [contribution("chk", 50_000)] });
    const result = computeAvailable(today, data);
    expect(result).toMatchObject({ cashCents: 30_000, reserveEffectiveCents: 30_000, reserveShortfallCents: 20_000, availableCents: 0 });
  });

  it("T5.6: despesa atrasada conta como compromisso; liquidá-la não muda o disponível", () => {
    const rent = planned("expense", "chk", 150_000, "2026-08-03", { id: "rent" });
    const { data } = base({ extraTx: [rent] });
    const before = computeAvailable(today, data);
    expect(before.plannedExpensesCents).toBe(10_000 + 150_000);
    expect(before.availableCents).toBe(350_000);
    const settled = {
      ...data,
      transactions: data.transactions.map((t) => (t.id === "rent" ? { ...t, status: "posted" as const, postedDate: "2026-08-10" } : t)),
    };
    expect(computeAvailable(today, settled).availableCents).toBe(350_000);
  });

  it("T5.7: fatura vencida e não paga entra como obrigação em hoje", () => {
    const { data } = base();
    const result = computeAvailable("2026-08-15", data);
    expect(result.invoiceObligationsCents).toBe(90_000);
  });

  it("transferência para conta fora do disponível reduz o disponível; entre contas incluídas, não", () => {
    const chk = account({ id: "chk", openingBalanceCents: 100_000 });
    const chk2 = account({ id: "chk2", openingBalanceCents: 0 });
    const sav = account({ id: "sav", openingBalanceCents: 0, includeInAvailable: false });
    const plannedOut = transfer("chk", "sav", 30_000, { status: "planned", postedDate: null, expectedDate: "2026-08-20" });
    const plannedInternal = transfer("chk", "chk2", 20_000, { status: "planned", postedDate: null, expectedDate: "2026-08-20" });
    const result = computeAvailable(today, ledger({ accounts: [chk, chk2, sav], transfers: [plannedOut, plannedInternal] }));
    expect(result.plannedTransfersOutCents).toBe(30_000);
    expect(result.availableCents).toBe(70_000);
  });

  it("despesa planejada além do horizonte não é descontada", () => {
    const { data } = base({ extraTx: [planned("expense", "chk", 77_000, "2026-09-10")] });
    expect(computeAvailable(today, data).availableCents).toBe(500_000);
  });
});

describe("T5.9: estorno de cartão não altera o saldo bancário", () => {
  const refundOn = (invoiceId: "aug" | "sep", cents: number, original: string, data: LedgerData) => {
    const inv = data.invoices.find((i) => i.id === invoiceId)!;
    return cardItem(inv, cents, { kind: "refund", refundOfId: original, postedDate: today, competenceDate: today });
  };

  it("T5.9a: fatura que recebe o crédito vence depois do horizonte; disponível e saldo não mudam", () => {
    const { data } = base(); // H = 4/set; a fatura de set vence 12/set
    const withRefund = { ...data, transactions: [...data.transactions, refundOn("sep", 20_000, "sep-orig", data)] };
    expect(accountBalance(data.accounts[0], withRefund, today)).toBe(650_000);
    expect(computeAvailable(today, withRefund).availableCents).toBe(500_000);
  });

  it("T5.9b: se a fatura vence dentro do horizonte, o crédito reduz o desembolso (+200), não o saldo", () => {
    const { data } = base({ salaryDate: "2026-09-16" }); // H = 15/set
    expect(computeAvailable(today, data).availableCents).toBe(450_000);
    const withRefund = { ...data, transactions: [...data.transactions, refundOn("sep", 20_000, "sep-orig", data)] };
    expect(accountBalance(data.accounts[0], withRefund, today)).toBe(650_000);
    expect(computeAvailable(today, withRefund).availableCents).toBe(470_000);
  });

  it("T5.9c: crédito maior que a fatura zera a obrigação e o excedente NÃO vira dinheiro", () => {
    const { data } = base({ salaryDate: "2026-09-16" });
    const oct = invoice("oct", "2026-10-01", "2026-10-05", "2026-10-12");
    const withRefund: LedgerData = {
      ...data,
      invoices: [...data.invoices, oct],
      transactions: [
        ...data.transactions,
        cardItem(oct, 20_000),
        refundOn("sep", 70_000, "aug-1", data),
      ],
    };
    const result = computeAvailable(today, withRefund);
    expect(result.invoiceObligationsCents).toBe(90_000 + 0); // agosto 900; setembro 0
    expect(result.availableCents).toBe(500_000); // e não 520.000
  });

  it("T5.9e: devolução depositada NA CONTA aumenta o saldo e o disponível na hora", () => {
    const { data } = base();
    const original = posted("expense", "chk", 20_000, "2026-08-02", { id: "debit-orig" });
    const refund = posted("income", "chk", 20_000, today, { id: "pix-back" });
    const before = computeAvailable(today, { ...data, transactions: [...data.transactions, original] });
    const after = computeAvailable(today, { ...data, transactions: [...data.transactions, original, refund] });
    expect(after.availableCents - before.availableCents).toBe(20_000);
  });
});

describe("entradas inválidas", () => {
  it("rejeita dados inconsistentes", () => {
    const chk = account({ id: "chk" });
    expect(() => computeAvailable("2026-02-30", ledger({ accounts: [chk] }))).toThrow(DomainError);
    expect(() => computeAvailable(today, ledger({ accounts: [chk], transactions: [posted("income", "zzz", 100, "2026-08-01")] }))).toThrow(DomainError);
    expect(() => computeAvailable(today, ledger({ accounts: [chk], transactions: [posted("income", "chk", 0, "2026-08-01")] }))).toThrow(DomainError);
  });
});
