import { assertIsoDate, monthStart, type IsoDate } from "./dates";
import type { Cents } from "./money";
import type { Transaction } from "./types";

export interface ConsumptionResult {
  totalCents: Cents;
  byCategory: Record<string, Cents>;
}

export interface ConsumptionOptions {
  /** Inclui lançamentos planejados (útil para orçamento). Padrão: somente realizados. */
  includePlanned?: boolean;
}

/**
 * Consumo (competência) do mês: despesas menos estornos, pela data de competência.
 * Ficam de fora: receitas, ajustes de conciliação e cancelados. Transferências, pagamentos de
 * fatura e aportes em metas nem existem em `transactions`, então nunca viram consumo.
 */
export function monthlyConsumption(
  transactions: readonly Transaction[],
  month: IsoDate,
  options: ConsumptionOptions = {},
): ConsumptionResult {
  assertIsoDate(month, "mês");
  const start = monthStart(month);
  const byCategory: Record<string, Cents> = {};
  let totalCents = 0;

  for (const t of transactions) {
    if (t.kind === "income" || t.isAdjustment || t.status === "canceled") continue;
    if (t.status === "planned" && !options.includePlanned) continue;
    if (monthStart(t.competenceDate) !== start) continue;

    const signed = t.kind === "expense" ? t.amountCents : -t.amountCents;
    const key = t.categoryId ?? "uncategorized";
    byCategory[key] = (byCategory[key] ?? 0) + signed;
    totalCents += signed;
  }
  return { totalCents, byCategory };
}
