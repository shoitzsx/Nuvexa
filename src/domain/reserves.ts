import { DomainError } from "./errors";
import { assertPositiveCents, type Cents } from "./money";
import type { Account, GoalContribution } from "./types";

export interface AccountReserve {
  accountId: string;
  balanceCents: Cents;
  /** Valor alocado a metas nesta conta (nunca negativo). */
  reservedCents: Cents;
  /** Parte da reserva realmente coberta pelo saldo: min(reservado, max(saldo, 0)). */
  effectiveCents: Cents;
  /** Reserva descoberta: o dinheiro reservado já foi gasto. */
  shortfallCents: Cents;
  includedInAvailable: boolean;
}

export interface ReserveSummary {
  accounts: AccountReserve[];
  /** O que se desconta do disponível: só reservas efetivas em contas incluídas no disponível. */
  effectiveIncludedCents: Cents;
  shortfallCents: Cents;
}

function signed(c: GoalContribution): Cents {
  return c.kind === "deposit" ? c.amountCents : -c.amountCents;
}

/**
 * Reservas são alocações: o dinheiro continua na conta e o saldo não muda.
 * Reservas em contas fora do disponível (ex.: poupança) não são descontadas de novo,
 * porque a própria conta já está fora do cálculo.
 */
export function summarizeReserves(
  accounts: readonly Account[],
  balances: ReadonlyMap<string, Cents>,
  contributions: readonly GoalContribution[],
): ReserveSummary {
  const knownAccounts = new Set(accounts.map((a) => a.id));
  const raw = new Map<string, number>();

  for (const c of contributions) {
    if (!knownAccounts.has(c.accountId)) {
      throw new DomainError("UNKNOWN_REFERENCE", `conta inexistente: "${c.accountId}"`);
    }
    if (c.status !== "posted") continue;
    assertPositiveCents(c.amountCents, `aporte ${c.id}: valor`);
    raw.set(c.accountId, (raw.get(c.accountId) ?? 0) + signed(c));
  }

  const rows = accounts.map((account): AccountReserve => {
    const balanceCents = balances.get(account.id) ?? 0;
    const reservedCents = Math.max(raw.get(account.id) ?? 0, 0);
    const effectiveCents = Math.min(reservedCents, Math.max(balanceCents, 0));
    return {
      accountId: account.id,
      balanceCents,
      reservedCents,
      effectiveCents,
      shortfallCents: reservedCents - effectiveCents,
      includedInAvailable: account.includeInAvailable,
    };
  });

  return {
    accounts: rows,
    effectiveIncludedCents: rows.filter((r) => r.includedInAvailable).reduce((sum, r) => sum + r.effectiveCents, 0),
    shortfallCents: rows.reduce((sum, r) => sum + r.shortfallCents, 0),
  };
}

/** Progresso de cada meta: aportes realizados menos retiradas, em qualquer conta. */
export function goalBalances(contributions: readonly GoalContribution[]): Map<string, Cents> {
  const result = new Map<string, Cents>();
  for (const c of contributions) {
    if (c.status !== "posted") continue;
    assertPositiveCents(c.amountCents, `aporte ${c.id}: valor`);
    result.set(c.goalId, (result.get(c.goalId) ?? 0) + signed(c));
  }
  return result;
}

/** Um aporte precisa caber no saldo ainda não reservado da conta. */
export function assertCanAllocate(account: { balanceCents: Cents; reservedCents: Cents }, amountCents: Cents): void {
  assertPositiveCents(amountCents, "valor do aporte");
  if (account.reservedCents + amountCents > Math.max(account.balanceCents, 0)) {
    throw new DomainError("RESERVE_EXCEEDS_BALANCE", "o aporte excede o saldo disponível da conta");
  }
}
