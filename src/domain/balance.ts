import { assertIsoDate, type IsoDate } from "./dates";
import { DomainError } from "./errors";
import { assertPositiveCents, type Cents } from "./money";
import type { Account, LedgerData } from "./types";
import { assertUniqueIds } from "./validation";

type BalanceData = Pick<LedgerData, "transactions" | "transfers" | "payments">;

/**
 * Saldo bancário em `asOf`: saldo inicial + movimentos REALIZADOS (data entre a abertura e `asOf`).
 * Compras e estornos de cartão não entram: só o pagamento da fatura move dinheiro.
 * Aportes em metas também não entram (são alocações, não movimentos).
 */
export function accountBalance(account: Account, data: BalanceData, asOf: IsoDate): Cents {
  assertIsoDate(asOf, "data de consulta");
  assertUniqueIds(data.transactions, "lançamentos");
  assertUniqueIds(data.transfers, "transferências");
  assertUniqueIds(data.payments, "pagamentos");

  const counts = (date: IsoDate) => date >= account.openingDate && date <= asOf;
  let balance = account.openingBalanceCents;

  for (const t of data.transactions) {
    if (t.accountId !== account.id || t.status !== "posted") continue;
    if (t.postedDate === null) {
      throw new DomainError("INVALID_ENTRY", `lançamento ${t.id}: realizado sem data efetiva`);
    }
    assertPositiveCents(t.amountCents, `lançamento ${t.id}: valor`);
    if (!counts(t.postedDate)) continue;
    balance += t.kind === "expense" ? -t.amountCents : t.amountCents;
  }

  for (const t of data.transfers) {
    if (t.status !== "posted") continue;
    if (t.fromAccountId !== account.id && t.toAccountId !== account.id) continue;
    if (t.postedDate === null) {
      throw new DomainError("INVALID_ENTRY", `transferência ${t.id}: realizada sem data efetiva`);
    }
    assertPositiveCents(t.amountCents, `transferência ${t.id}: valor`);
    if (!counts(t.postedDate)) continue;
    if (t.fromAccountId === account.id) balance -= t.amountCents;
    if (t.toAccountId === account.id) balance += t.amountCents;
  }

  for (const p of data.payments) {
    if (p.accountId !== account.id) continue;
    assertPositiveCents(p.amountCents, `pagamento ${p.id}: valor`);
    if (counts(p.paidDate)) balance -= p.amountCents;
  }

  return balance;
}

export function balancesByAccount(accounts: readonly Account[], data: BalanceData, asOf: IsoDate): Map<string, Cents> {
  assertUniqueIds(accounts, "contas");
  return new Map(accounts.map((account) => [account.id, accountBalance(account, data, asOf)]));
}

/** Uma saída de `amountCents` é permitida? (conta sem saldo negativo exige saldo suficiente) */
export function canDebit(account: Account, currentBalanceCents: Cents, amountCents: Cents): boolean {
  assertPositiveCents(amountCents, "valor da saída");
  return account.allowNegative || currentBalanceCents - amountCents >= 0;
}
