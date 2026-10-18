import { describe, expect, it } from "vitest";
import { accountBalance } from "./balance";
import { DomainError } from "./errors";
import { projectBalances } from "./projection";
import { account, cardItem, contribution, invoice, ledger, payment, planned, posted, transfer } from "./testing/builders";
import type { LedgerData, RecurrenceRule } from "./types";

const today = "2026-08-10";

const rules: RecurrenceRule[] = [
  { id: "r-salary", kind: "income", amountCents: 500_000, accountId: "chk", dayOfMonth: 5, startDate: "2026-01-01", endDate: null, active: true },
  { id: "r-rent", kind: "expense", amountCents: 150_000, accountId: "chk", dayOfMonth: 3, startDate: "2026-01-01", endDate: null, active: true },
  { id: "r-internet", kind: "expense", amountCents: 10_000, accountId: "chk", dayOfMonth: 20, startDate: "2026-01-01", endDate: null, active: true },
];

function scenario(over: Partial<LedgerData> = {}): LedgerData {
  const chk = account({ id: "chk", openingBalanceCents: 650_000 });
  const aug = invoice("aug", "2026-08-01", "2026-08-05", "2026-08-12");
  const sep = invoice("sep", "2026-09-01", "2026-09-05", "2026-09-12");
  const oct = invoice("oct", "2026-10-01", "2026-10-05", "2026-10-12");
  return ledger({
    accounts: [chk],
    invoices: [aug, sep, oct],
    transactions: [cardItem(aug, 90_000), cardItem(sep, 80_000), cardItem(oct, 20_000)],
    ...over,
  });
}

const ends = (result: ReturnType<typeof projectBalances>) => result.map((m) => m.endCents);

describe("projectBalances: exemplo de 3 meses", () => {
  it("fim de ago 5.500, set 8.100, out 11.300", () => {
    const result = projectBalances({ today, months: 3, data: scenario(), rules });
    expect(result.map((m) => m.month)).toEqual(["2026-08-01", "2026-09-01", "2026-10-01"]);
    expect(ends(result)).toEqual([550_000, 810_000, 1_130_000]);
    expect(result[0]).toMatchObject({ startCents: 650_000, incomeCents: 0, expensesCents: 10_000, invoicesCents: 90_000 });
    expect(result[1]).toMatchObject({ startCents: 550_000, incomeCents: 500_000, expensesCents: 160_000, invoicesCents: 80_000 });
  });

  it("6 e 12 meses mantêm os 3 primeiros e geram a quantidade pedida", () => {
    const six = projectBalances({ today, months: 6, data: scenario(), rules });
    const twelve = projectBalances({ today, months: 12, data: scenario(), rules });
    expect(six).toHaveLength(6);
    expect(twelve).toHaveLength(12);
    expect(ends(six).slice(0, 3)).toEqual([550_000, 810_000, 1_130_000]);
    expect(twelve[11].month).toBe("2027-07-01");
    // meses sem fatura conhecida: +5.000 − 1.600
    expect(twelve[3].endCents - twelve[2].endCents).toBe(340_000);
  });

  it("o saldo inicial do mês 0 é exatamente o saldo atual das contas", () => {
    const data = scenario();
    const result = projectBalances({ today, months: 3, data, rules: [] });
    expect(result[0].startCents).toBe(accountBalance(data.accounts[0], data, today));
  });

  it("rejeita horizontes que não sejam 3, 6 ou 12", () => {
    // @ts-expect-error fora do contrato
    expect(() => projectBalances({ today, months: 4, data: scenario(), rules })).toThrow(DomainError);
  });
});

describe("sem contagem dupla", () => {
  it("recorrência já materializada não é expandida de novo", () => {
    const materialized = planned("expense", "chk", 10_000, "2026-08-20", {
      recurrenceId: "r-internet", recurrenceKey: "2026-08-20",
    });
    const data = scenario();
    const result = projectBalances({ today, months: 3, data: { ...data, transactions: [...data.transactions, materialized] }, rules });
    expect(ends(result)).toEqual([550_000, 810_000, 1_130_000]); // igual: 100 contados uma vez só
  });

  it("ocorrência cancelada pelo usuário não volta pela expansão", () => {
    const canceled = planned("expense", "chk", 10_000, "2026-09-20", {
      recurrenceId: "r-internet", recurrenceKey: "2026-09-20", status: "canceled",
    });
    const data = scenario();
    const result = projectBalances({ today, months: 3, data: { ...data, transactions: [...data.transactions, canceled] }, rules });
    expect(result[1].expensesCents).toBe(150_000);
    expect(ends(result)).toEqual([550_000, 820_000, 1_140_000]);
  });

  it("fatura parcialmente paga: só o saldo em aberto é descontado (o pago já saiu do saldo)", () => {
    const data = scenario();
    const partial = { ...data, payments: [payment("aug", "chk", 40_000, "2026-08-10")] };
    const result = projectBalances({ today, months: 3, data: partial, rules });
    expect(result[0].startCents).toBe(610_000);
    expect(result[0].invoicesCents).toBe(50_000);
    expect(ends(result)).toEqual([550_000, 810_000, 1_130_000]); // mesmo resultado final
  });

  it("liquidar um planejado no valor e na data previstos não altera o saldo projetado", () => {
    const rent = planned("expense", "chk", 150_000, "2026-08-03", { id: "rent" });
    const data = scenario();
    const before = projectBalances({ today, months: 3, data: { ...data, transactions: [...data.transactions, rent] }, rules });
    const settledRent = { ...rent, status: "posted" as const, postedDate: "2026-08-10" };
    const after = projectBalances({ today, months: 3, data: { ...data, transactions: [...data.transactions, settledRent] }, rules });
    expect(ends(after)).toEqual(ends(before));
    expect(before[0].expensesCents).toBe(160_000); // atrasado conta no mês atual, uma vez
  });

  it("planejados atrasados (despesa e fatura vencida) caem no mês atual", () => {
    const data = scenario({ transactions: [cardItem(invoice("old", "2026-07-01", "2026-07-05", "2026-07-12"), 30_000)], invoices: [invoice("old", "2026-07-01", "2026-07-05", "2026-07-12")] });
    const result = projectBalances({ today, months: 3, data, rules: [] });
    expect(result[0].invoicesCents).toBe(30_000);
  });

  it("aportes em metas não entram no saldo projetado", () => {
    const data = scenario();
    const withReserve = { ...data, contributions: [contribution("chk", 500_000)] };
    expect(ends(projectBalances({ today, months: 3, data: withReserve, rules }))).toEqual(ends(projectBalances({ today, months: 3, data, rules })));
  });

  it("itens de cartão são contados só pela fatura, nunca individualmente", () => {
    const data = scenario();
    const result = projectBalances({ today, months: 3, data, rules: [] });
    expect(result.map((m) => m.invoicesCents)).toEqual([90_000, 80_000, 20_000]);
    expect(result.every((m) => m.expensesCents === 0)).toBe(true);
  });

  it("faturas além do horizonte não entram", () => {
    const far = invoice("far", "2027-06-01", "2027-06-05", "2027-06-12");
    const data = scenario({ invoices: [...scenario().invoices, far], transactions: [...scenario().transactions, cardItem(far, 99_000)] });
    const result = projectBalances({ today, months: 3, data, rules: [] });
    expect(result.reduce((sum, m) => sum + m.invoicesCents, 0)).toBe(190_000);
  });
});

describe("transferências e regras de recorrência", () => {
  it("transferência planejada para conta fora do conjunto reduz; entre contas do conjunto é neutra", () => {
    const chk = account({ id: "chk", openingBalanceCents: 100_000 });
    const chk2 = account({ id: "chk2", openingBalanceCents: 0 });
    const sav = account({ id: "sav", openingBalanceCents: 0, includeInAvailable: false });
    const data = ledger({
      accounts: [chk, chk2, sav],
      transfers: [
        transfer("chk", "sav", 30_000, { status: "planned", postedDate: null, expectedDate: "2026-08-25" }),
        transfer("chk", "chk2", 20_000, { status: "planned", postedDate: null, expectedDate: "2026-08-25" }),
        transfer("sav", "chk", 5_000, { status: "planned", postedDate: null, expectedDate: "2026-09-02" }),
      ],
    });
    const result = projectBalances({ today, months: 3, data, rules: [] });
    expect(result[0].transfersNetCents).toBe(-30_000);
    expect(result[1].transfersNetCents).toBe(5_000);
    expect(ends(result)).toEqual([70_000, 75_000, 75_000]);
  });

  it("regra respeita data inicial, final, inativa e dia 31 em mês curto", () => {
    const chk = account({ id: "chk", openingBalanceCents: 0 });
    const data = ledger({ accounts: [chk] });
    const r = (over: Partial<RecurrenceRule>): RecurrenceRule => ({
      id: "r", kind: "expense", amountCents: 1_000, accountId: "chk", dayOfMonth: 31, startDate: "2026-01-01", endDate: null, active: true, ...over,
    });
    const run = (rule: RecurrenceRule) => projectBalances({ today: "2026-01-10", months: 3, data, rules: [rule] }).map((m) => m.expensesCents);
    expect(run(r({}))).toEqual([1_000, 1_000, 1_000]); // 31/jan, 28/fev, 31/mar
    expect(run(r({ active: false }))).toEqual([0, 0, 0]);
    expect(run(r({ startDate: "2026-02-01" }))).toEqual([0, 1_000, 1_000]);
    expect(run(r({ endDate: "2026-02-28" }))).toEqual([1_000, 1_000, 0]);
    expect(run(r({ dayOfMonth: 5 }))).toEqual([0, 1_000, 1_000]); // 5/jan já passou
  });

  it("regra de conta desconhecida ou valor inválido é rejeitada", () => {
    const data = scenario();
    expect(() => projectBalances({ today, months: 3, data, rules: [{ ...rules[0], accountId: "zzz" }] })).toThrow(DomainError);
    expect(() => projectBalances({ today, months: 3, data, rules: [{ ...rules[0], amountCents: 0 }] })).toThrow(DomainError);
    expect(() => projectBalances({ today, months: 3, data, rules: [{ ...rules[0], dayOfMonth: 32 }] })).toThrow(DomainError);
  });
});

describe("saldo atual x projetado x lançamento realizado hoje", () => {
  it("lançar hoje uma despesa realizada reduz o saldo atual e o projetado na mesma medida", () => {
    const data = scenario();
    const spend = posted("expense", "chk", 12_345, today);
    const before = projectBalances({ today, months: 3, data, rules });
    const after = projectBalances({ today, months: 3, data: { ...data, transactions: [...data.transactions, spend] }, rules });
    expect(before[0].startCents - after[0].startCents).toBe(12_345);
    expect(before[2].endCents - after[2].endCents).toBe(12_345);
  });
});
