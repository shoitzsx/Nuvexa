import { describe, expect, it } from "vitest";
import { accountBalance, balancesByAccount } from "./balance";
import { DomainError } from "./errors";
import { assertCanAllocate, goalBalances, summarizeReserves } from "./reserves";
import { account, contribution, ledger, posted, transfer } from "./testing/builders";

const chk = account({ id: "chk", openingBalanceCents: 650_000 });
const sav = account({ id: "sav", openingBalanceCents: 200_000, includeInAvailable: false });
const today = "2026-08-10";

describe("summarizeReserves", () => {
  it("reserva virtual não muda o saldo, só reduz o disponível", () => {
    const ctb = [contribution("chk", 50_000)];
    const data = ledger({ accounts: [chk, sav], contributions: ctb });
    const balances = balancesByAccount([chk, sav], data, today);
    expect(balances.get("chk")).toBe(650_000); // saldo intacto
    const result = summarizeReserves([chk, sav], balances, ctb);
    expect(result.effectiveIncludedCents).toBe(50_000);
    expect(result.shortfallCents).toBe(0);
  });

  it("reserva em conta fora do disponível não é descontada de novo", () => {
    const ctb = [contribution("chk", 50_000), contribution("sav", 100_000, { goalId: "reserva" })];
    const balances = new Map([["chk", 650_000], ["sav", 200_000]]);
    const result = summarizeReserves([chk, sav], balances, ctb);
    expect(result.effectiveIncludedCents).toBe(50_000); // os 100.000 da poupança ficam de fora
    const savRow = result.accounts.find((a) => a.accountId === "sav")!;
    expect(savRow).toMatchObject({ reservedCents: 100_000, effectiveCents: 100_000, includedInAvailable: false });
  });

  it("gastar dinheiro reservado gera 'reserva descoberta' e não desconto duplicado", () => {
    const ctb = [contribution("chk", 50_000)];
    const balances = new Map([["chk", 30_000], ["sav", 0]]);
    const result = summarizeReserves([chk, sav], balances, ctb);
    expect(result.effectiveIncludedCents).toBe(30_000);
    expect(result.shortfallCents).toBe(20_000);
  });

  it("saldo negativo: nada a reservar, toda a reserva fica descoberta", () => {
    const balances = new Map([["chk", -10_000], ["sav", 0]]);
    const result = summarizeReserves([chk, sav], balances, [contribution("chk", 50_000)]);
    expect(result.effectiveIncludedCents).toBe(0);
    expect(result.shortfallCents).toBe(50_000);
  });

  it("retirada reduz a reserva; aporte planejado, cancelado e retirada a maior são tratados com segurança", () => {
    const ctb = [
      contribution("chk", 80_000),
      contribution("chk", 30_000, { kind: "withdrawal" }),
      contribution("chk", 99_999, { status: "planned", postedDate: null, expectedDate: "2026-09-01" }),
      contribution("chk", 77_777, { status: "canceled", postedDate: null }),
      contribution("sav", 10_000, { kind: "withdrawal" }), // maior que o reservado na conta: nunca negativo
    ];
    const balances = new Map([["chk", 650_000], ["sav", 200_000]]);
    const result = summarizeReserves([chk, sav], balances, ctb);
    expect(result.accounts.find((a) => a.accountId === "chk")!.reservedCents).toBe(50_000);
    expect(result.accounts.find((a) => a.accountId === "sav")!.reservedCents).toBe(0);
  });

  it("aporte em conta desconhecida é rejeitado", () => {
    expect(() => summarizeReserves([chk], new Map([["chk", 1]]), [contribution("zzz", 1)])).toThrow(DomainError);
  });
});

describe("mover dinheiro para conta própria e alocar", () => {
  it("transferir 800 para a poupança e alocar: patrimônio igual, consumo zero, disponível correto", () => {
    const data = ledger({
      accounts: [chk, sav],
      transfers: [transfer("chk", "sav", 80_000)],
      contributions: [contribution("chk", 50_000, { goalId: "viagem" }), contribution("sav", 80_000, { goalId: "viagem" })],
    });
    const balances = balancesByAccount([chk, sav], data, today);
    expect(balances.get("chk")).toBe(570_000);
    expect(balances.get("sav")).toBe(280_000);
    expect(balances.get("chk")! + balances.get("sav")!).toBe(850_000); // igual a 6.500 + 2.000
    const summary = summarizeReserves([chk, sav], balances, data.contributions);
    expect(570_000 - summary.effectiveIncludedCents).toBe(520_000); // disponível da corrente: 5.200
    expect(goalBalances(data.contributions).get("viagem")).toBe(130_000);
  });
});

describe("goalBalances", () => {
  it("soma aportes realizados menos retiradas por meta", () => {
    const ctb = [
      contribution("chk", 50_000, { goalId: "a" }),
      contribution("sav", 20_000, { goalId: "a" }),
      contribution("chk", 5_000, { goalId: "a", kind: "withdrawal" }),
      contribution("chk", 9_000, { goalId: "b" }),
      contribution("chk", 1_000, { goalId: "b", status: "planned", postedDate: null, expectedDate: "2026-09-01" }),
    ];
    const result = goalBalances(ctb);
    expect(result.get("a")).toBe(65_000);
    expect(result.get("b")).toBe(9_000);
  });
});

describe("assertCanAllocate", () => {
  it("aporte precisa caber no saldo ainda não reservado", () => {
    expect(() => assertCanAllocate({ balanceCents: 100_000, reservedCents: 30_000 }, 70_000)).not.toThrow();
    expect(() => assertCanAllocate({ balanceCents: 100_000, reservedCents: 30_000 }, 70_001)).toThrow(DomainError);
    expect(() => assertCanAllocate({ balanceCents: -5, reservedCents: 0 }, 1)).toThrow(DomainError);
    expect(() => assertCanAllocate({ balanceCents: 100, reservedCents: 0 }, 0)).toThrow(DomainError);
  });
});

describe("reservar dinheiro nunca cria despesa", () => {
  it("o saldo da conta calculado do livro-razão ignora aportes", () => {
    const data = ledger({
      accounts: [chk],
      transactions: [posted("income", "chk", 100, "2026-08-02")],
      contributions: [contribution("chk", 500_000)],
    });
    expect(accountBalance(chk, data, today)).toBe(650_100);
  });
});
