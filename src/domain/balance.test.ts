import { describe, expect, it } from "vitest";
import { accountBalance, balancesByAccount, canDebit } from "./balance";
import { DomainError } from "./errors";
import { account, cardItem, invoice, ledger, payment, planned, posted, transfer, tx } from "./testing/builders";

const chk = account({ id: "chk", openingBalanceCents: 100_000, openingDate: "2026-01-01" });
const sav = account({ id: "sav", openingBalanceCents: 50_000, openingDate: "2026-01-01" });
const today = "2026-08-10";

describe("accountBalance", () => {
  it("parte do saldo inicial", () => {
    expect(accountBalance(chk, ledger({ accounts: [chk] }), today)).toBe(100_000);
  });

  it("receitas somam, despesas subtraem (somente realizadas)", () => {
    const data = ledger({
      accounts: [chk],
      transactions: [
        posted("income", "chk", 500_000, "2026-08-01"),
        posted("expense", "chk", 150_000, "2026-08-03"),
        planned("expense", "chk", 10_000, "2026-08-20"),
        planned("income", "chk", 999_999, "2026-09-05"),
        tx({ accountId: "chk", amountCents: 7777, status: "canceled", postedDate: null }),
      ],
    });
    expect(accountBalance(chk, data, today)).toBe(100_000 + 500_000 - 150_000);
  });

  it("estorno em conta devolve o dinheiro", () => {
    const original = posted("expense", "chk", 20_000, "2026-08-02", { id: "orig" });
    const refund = tx({ kind: "refund", accountId: "chk", amountCents: 5_000, refundOfId: "orig", postedDate: "2026-08-05" });
    expect(accountBalance(chk, ledger({ accounts: [chk], transactions: [original, refund] }), today)).toBe(100_000 - 20_000 + 5_000);
  });

  it("compra no crédito NÃO altera o saldo bancário", () => {
    const inv = invoice("inv", "2026-09-01", "2026-09-05", "2026-09-12");
    const data = ledger({ accounts: [chk], invoices: [inv], transactions: [cardItem(inv, 10_000, { postedDate: "2026-08-10" })] });
    expect(accountBalance(chk, data, today)).toBe(100_000);
  });

  it("estorno em cartão NÃO altera o saldo bancário", () => {
    const inv = invoice("inv", "2026-09-01", "2026-09-05", "2026-09-12");
    const original = cardItem(inv, 10_000, { id: "orig" });
    const refund = cardItem(inv, 10_000, { kind: "refund", refundOfId: "orig", postedDate: "2026-08-10" });
    expect(accountBalance(chk, ledger({ accounts: [chk], invoices: [inv], transactions: [original, refund] }), today)).toBe(100_000);
  });

  it("pagamento de fatura reduz o saldo da conta pagadora", () => {
    const inv = invoice("inv", "2026-08-01", "2026-08-05", "2026-08-12");
    const data = ledger({ accounts: [chk], invoices: [inv], payments: [payment("inv", "chk", 30_000, "2026-08-10")] });
    expect(accountBalance(chk, data, today)).toBe(70_000);
  });

  it("transferência: sai da origem e entra no destino, sem mexer no total", () => {
    const data = ledger({ accounts: [chk, sav], transfers: [transfer("chk", "sav", 20_000)] });
    const balances = balancesByAccount([chk, sav], data, today);
    expect(balances.get("chk")).toBe(80_000);
    expect(balances.get("sav")).toBe(70_000);
    expect(balances.get("chk")! + balances.get("sav")!).toBe(150_000);
  });

  it("transferência planejada ou cancelada não conta", () => {
    const data = ledger({
      accounts: [chk, sav],
      transfers: [
        transfer("chk", "sav", 20_000, { status: "planned", postedDate: null, expectedDate: "2026-08-20" }),
        transfer("chk", "sav", 30_000, { status: "canceled", postedDate: null }),
      ],
    });
    expect(accountBalance(chk, data, today)).toBe(100_000);
  });

  it("lançamentos posteriores à data de consulta ou anteriores à abertura são ignorados", () => {
    const data = ledger({
      accounts: [chk],
      transactions: [
        posted("income", "chk", 1_000, "2026-08-11"),
        posted("income", "chk", 2_000, "2025-12-31"),
        posted("income", "chk", 300, "2026-01-01"),
      ],
    });
    expect(accountBalance(chk, data, today)).toBe(100_300);
  });

  it("ajuste de conciliação entra no saldo", () => {
    const adj = posted("income", "chk", 1_234, "2026-08-05", { isAdjustment: true });
    expect(accountBalance(chk, ledger({ accounts: [chk], transactions: [adj] }), today)).toBe(101_234);
  });

  it("saldo pode ficar negativo (cheque especial)", () => {
    const data = ledger({ accounts: [chk], transactions: [posted("expense", "chk", 150_000, "2026-08-02")] });
    expect(accountBalance(chk, data, today)).toBe(-50_000);
  });

  it("não conta o mesmo lançamento duas vezes quando há id duplicado", () => {
    const t = posted("expense", "chk", 100, "2026-08-02", { id: "dup" });
    expect(() => accountBalance(chk, ledger({ accounts: [chk], transactions: [t, { ...t }] }), today)).toThrow(DomainError);
  });
});

describe("canDebit", () => {
  it("bloqueia saldo insuficiente, salvo conta com saldo negativo permitido", () => {
    expect(canDebit(chk, 10_000, 10_000)).toBe(true);
    expect(canDebit(chk, 10_000, 10_001)).toBe(false);
    expect(canDebit({ ...chk, allowNegative: true }, 10_000, 99_999)).toBe(true);
  });
  it("rejeita valor inválido", () => {
    expect(() => canDebit(chk, 10_000, 0)).toThrow(DomainError);
  });
});
