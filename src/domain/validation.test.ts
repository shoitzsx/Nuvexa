import { describe, expect, it } from "vitest";
import { DomainError } from "./errors";
import {
  assertUniqueIds,
  assertValidContribution,
  assertValidLedger,
  assertValidPayment,
  assertValidTransaction,
  assertValidTransfer,
} from "./validation";
import { account, cardItem, contribution, invoice, payment, planned, posted, transfer, tx, ledger } from "./testing/builders";

describe("assertValidTransaction", () => {
  it("aceita despesa e receita realizadas em conta", () => {
    expect(() => assertValidTransaction(posted("expense", "a", 100, "2026-08-01"))).not.toThrow();
    expect(() => assertValidTransaction(posted("income", "a", 100, "2026-08-01"))).not.toThrow();
  });

  it("aceita planejado com data esperada", () => {
    expect(() => assertValidTransaction(planned("expense", "a", 100, "2026-08-20"))).not.toThrow();
  });

  it.each([
    ["valor zero", { amountCents: 0 }],
    ["valor negativo", { amountCents: -5 }],
    ["valor decimal", { amountCents: 10.5 }],
    ["sem conta nem cartão", { accountId: null }],
    ["conta e cartão ao mesmo tempo", { cardId: "cc", invoiceId: "inv" }],
    ["conta com fatura", { invoiceId: "inv" }],
    ["realizado sem data efetiva", { postedDate: null }],
    ["planejado sem data esperada", { status: "planned" as const, postedDate: null, expectedDate: null }],
    ["planejado com data efetiva", { status: "planned" as const, expectedDate: "2026-08-20", postedDate: "2026-08-01" }],
    ["estorno sem original", { kind: "refund" as const, refundOfId: null }],
    ["despesa apontando para original", { refundOfId: "x" }],
    ["data de competência inválida", { competenceDate: "2026-02-30" }],
  ])("rejeita %s", (_name, override) => {
    expect(() => assertValidTransaction(tx(override))).toThrow(DomainError);
  });

  it("item de cartão: exige fatura, não aceita receita nem planejado", () => {
    const inv = invoice("inv", "2026-08-01", "2026-08-05", "2026-08-12");
    expect(() => assertValidTransaction(cardItem(inv, 100))).not.toThrow();
    expect(() => assertValidTransaction(cardItem(inv, 100, { invoiceId: null }))).toThrow(DomainError);
    expect(() => assertValidTransaction(cardItem(inv, 100, { kind: "income" }))).toThrow(DomainError);
    expect(() =>
      assertValidTransaction(cardItem(inv, 100, { status: "planned", expectedDate: "2026-08-20", postedDate: null })),
    ).toThrow(DomainError);
  });

  it("receita exige conta", () => {
    const inv = invoice("inv", "2026-08-01", "2026-08-05", "2026-08-12");
    expect(() => assertValidTransaction(tx({ kind: "income", accountId: null, cardId: inv.cardId, invoiceId: inv.id }))).toThrow(
      DomainError,
    );
  });
});

describe("assertValidTransfer, pagamento e aporte", () => {
  it("transferência: origem diferente do destino e valor positivo", () => {
    expect(() => assertValidTransfer(transfer("a", "b", 100))).not.toThrow();
    expect(() => assertValidTransfer(transfer("a", "a", 100))).toThrow(DomainError);
    expect(() => assertValidTransfer(transfer("a", "b", 0))).toThrow(DomainError);
    expect(() => assertValidTransfer(transfer("a", "b", 100, { postedDate: null }))).toThrow(DomainError);
    expect(() =>
      assertValidTransfer(transfer("a", "b", 100, { status: "planned", postedDate: null, expectedDate: null })),
    ).toThrow(DomainError);
  });

  it("pagamento de fatura: valor positivo e data válida", () => {
    expect(() => assertValidPayment(payment("inv", "a", 100, "2026-08-12"))).not.toThrow();
    expect(() => assertValidPayment(payment("inv", "a", -1, "2026-08-12"))).toThrow(DomainError);
    expect(() => assertValidPayment(payment("inv", "a", 100, "2026-13-12"))).toThrow(DomainError);
  });

  it("aporte: valor positivo e data coerente com o status", () => {
    expect(() => assertValidContribution(contribution("a", 100))).not.toThrow();
    expect(() => assertValidContribution(contribution("a", 0))).toThrow(DomainError);
    expect(() => assertValidContribution(contribution("a", 100, { postedDate: null }))).toThrow(DomainError);
  });
});

describe("assertUniqueIds", () => {
  it("rejeita ids duplicados (evita contar o mesmo lançamento duas vezes)", () => {
    const a = posted("expense", "a", 100, "2026-08-01", { id: "same" });
    const b = posted("expense", "a", 100, "2026-08-01", { id: "same" });
    expect(() => assertUniqueIds([a, b], "lançamentos")).toThrow(DomainError);
    expect(() => assertUniqueIds([a, { ...b, id: "other" }], "lançamentos")).not.toThrow();
  });
});

describe("assertValidLedger", () => {
  const acc = account({ id: "a" });

  it("aceita um livro-razão consistente", () => {
    expect(() => assertValidLedger(ledger({ accounts: [acc], transactions: [posted("income", "a", 100, "2026-08-01")] }))).not.toThrow();
  });

  it("rejeita referências inexistentes", () => {
    expect(() => assertValidLedger(ledger({ accounts: [acc], transactions: [posted("income", "zzz", 100, "2026-08-01")] }))).toThrow(DomainError);
    expect(() => assertValidLedger(ledger({ accounts: [acc], transfers: [transfer("a", "zzz", 100)] }))).toThrow(DomainError);
    expect(() => assertValidLedger(ledger({ accounts: [acc], payments: [payment("nope", "a", 100, "2026-08-12")] }))).toThrow(DomainError);
    expect(() => assertValidLedger(ledger({ accounts: [acc], contributions: [contribution("zzz", 100)] }))).toThrow(DomainError);
  });

  it("rejeita duplicidade de ids em qualquer coleção", () => {
    const t = posted("income", "a", 100, "2026-08-01", { id: "dup" });
    expect(() => assertValidLedger(ledger({ accounts: [acc], transactions: [t, { ...t }] }))).toThrow(DomainError);
    expect(() => assertValidLedger(ledger({ accounts: [acc, { ...acc }] }))).toThrow(DomainError);
  });

  it("estornos: referência ao original existente e soma limitada ao valor original", () => {
    const inv = invoice("inv", "2026-08-01", "2026-08-05", "2026-08-12");
    const original = cardItem(inv, 10_000, { id: "orig" });
    const refund = (id: string, cents: number) =>
      cardItem(inv, cents, { id, kind: "refund", refundOfId: "orig", competenceDate: "2026-08-10", postedDate: "2026-08-10" });

    const base = { accounts: [acc], invoices: [inv] };
    expect(() => assertValidLedger(ledger({ ...base, transactions: [original, refund("r1", 6000), refund("r2", 4000)] }))).not.toThrow();
    expect(() => assertValidLedger(ledger({ ...base, transactions: [original, refund("r1", 6000), refund("r2", 4001)] }))).toThrow(DomainError);
    expect(() => assertValidLedger(ledger({ ...base, transactions: [refund("r1", 100)] }))).toThrow(DomainError);
  });

  it("estorno cancelado não consome o valor do original", () => {
    const inv = invoice("inv", "2026-08-01", "2026-08-05", "2026-08-12");
    const original = cardItem(inv, 10_000, { id: "orig" });
    const canceled = cardItem(inv, 10_000, { id: "r1", kind: "refund", refundOfId: "orig", status: "canceled" });
    const valid = cardItem(inv, 10_000, { id: "r2", kind: "refund", refundOfId: "orig" });
    expect(() => assertValidLedger(ledger({ accounts: [acc], invoices: [inv], transactions: [original, canceled, valid] }))).not.toThrow();
  });

  it("item de cartão precisa estar na fatura do próprio cartão", () => {
    const inv = invoice("inv", "2026-08-01", "2026-08-05", "2026-08-12", "cc");
    const wrong = cardItem(inv, 100, { cardId: "outro-cartao" });
    expect(() => assertValidLedger(ledger({ accounts: [acc], invoices: [inv], transactions: [wrong] }))).toThrow(DomainError);
  });
});
