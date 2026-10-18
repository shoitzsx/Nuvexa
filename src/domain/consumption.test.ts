import { describe, expect, it } from "vitest";
import { accountBalance } from "./balance";
import { monthlyConsumption } from "./consumption";
import { account, cardItem, contribution, invoice, ledger, payment, planned, posted, transfer } from "./testing/builders";

describe("monthlyConsumption", () => {
  it("soma despesas realizadas por competência e categoria", () => {
    const txs = [
      posted("expense", "chk", 150_000, "2026-08-03", { categoryId: "moradia" }),
      posted("expense", "chk", 4_000, "2026-08-10", { categoryId: "mercado" }),
      posted("expense", "chk", 1_000, "2026-08-11", { categoryId: "mercado" }),
      posted("expense", "chk", 9_999, "2026-07-31", { categoryId: "mercado" }),
      posted("expense", "chk", 500, "2026-08-12"),
    ];
    const result = monthlyConsumption(txs, "2026-08-17");
    expect(result.totalCents).toBe(150_000 + 4_000 + 1_000 + 500);
    expect(result.byCategory).toEqual({ moradia: 150_000, mercado: 5_000, uncategorized: 500 });
  });

  it("receitas, planejados, cancelados e ajustes ficam de fora", () => {
    const txs = [
      posted("income", "chk", 500_000, "2026-08-05"),
      planned("expense", "chk", 10_000, "2026-08-20"),
      posted("expense", "chk", 1_234, "2026-08-02", { status: "canceled", postedDate: null }),
      posted("expense", "chk", 7_777, "2026-08-02", { isAdjustment: true }),
    ];
    expect(monthlyConsumption(txs, "2026-08-01").totalCents).toBe(0);
  });

  it("pode incluir planejados quando pedido (ex.: orçamento)", () => {
    const txs = [posted("expense", "chk", 100, "2026-08-02"), planned("expense", "chk", 10_000, "2026-08-20")];
    expect(monthlyConsumption(txs, "2026-08-01", { includePlanned: true }).totalCents).toBe(10_100);
  });

  it("estorno reduz o consumo da categoria no mês do estorno", () => {
    const inv = invoice("inv", "2026-10-01", "2026-10-05", "2026-10-12");
    const original = cardItem(inv, 20_000, { id: "orig", categoryId: "lazer", competenceDate: "2026-08-10" });
    const refund = cardItem(inv, 5_000, {
      kind: "refund", refundOfId: "orig", categoryId: "lazer", competenceDate: "2026-10-20", postedDate: "2026-10-20",
    });
    expect(monthlyConsumption([original, refund], "2026-08-01").byCategory).toEqual({ lazer: 20_000 });
    expect(monthlyConsumption([original, refund], "2026-10-01").byCategory).toEqual({ lazer: -5_000 });
  });

  it("parcela entra no consumo do mês da sua própria competência", () => {
    const inv1 = invoice("i1", "2026-09-01", "2026-09-05", "2026-09-12");
    const inv2 = invoice("i2", "2026-10-01", "2026-10-05", "2026-10-12");
    const p1 = cardItem(inv1, 20_000, { competenceDate: "2026-08-10" });
    const p2 = cardItem(inv2, 20_000, { competenceDate: "2026-09-10" });
    expect(monthlyConsumption([p1, p2], "2026-08-01").totalCents).toBe(20_000);
    expect(monthlyConsumption([p1, p2], "2026-09-01").totalCents).toBe(20_000);
  });
});

describe("sem contagem duplicada: compra no crédito + pagamento da fatura", () => {
  const chk = account({ id: "chk", openingBalanceCents: 100_000 });
  const inv = invoice("inv", "2026-09-01", "2026-09-05", "2026-09-12");

  it("R$ 100 no crédito: saldo igual, consumo +100; pagar a fatura tira do saldo mas não cria novo consumo", () => {
    const purchase = cardItem(inv, 10_000, { competenceDate: "2026-08-10", postedDate: "2026-08-10" });
    const afterPurchase = ledger({ accounts: [chk], invoices: [inv], transactions: [purchase] });

    expect(accountBalance(chk, afterPurchase, "2026-08-10")).toBe(100_000);
    expect(monthlyConsumption(afterPurchase.transactions, "2026-08-01").totalCents).toBe(10_000);

    const afterPayment = { ...afterPurchase, payments: [payment("inv", "chk", 10_000, "2026-09-12")] };
    expect(accountBalance(chk, afterPayment, "2026-09-12")).toBe(90_000);
    expect(monthlyConsumption(afterPayment.transactions, "2026-08-01").totalCents).toBe(10_000);
    expect(monthlyConsumption(afterPayment.transactions, "2026-09-01").totalCents).toBe(0);
  });

  it("transferências e aportes em metas nunca são consumo", () => {
    const sav = account({ id: "sav" });
    const data = ledger({
      accounts: [chk, sav],
      transfers: [transfer("chk", "sav", 50_000)],
      contributions: [contribution("chk", 20_000)],
    });
    expect(monthlyConsumption(data.transactions, "2026-08-01").totalCents).toBe(0);
    expect(accountBalance(chk, data, "2026-08-10")).toBe(50_000); // só a transferência mexe no saldo
  });
});
