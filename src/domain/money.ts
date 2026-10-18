import { DomainError } from "./errors";

/** Valor monetário em centavos inteiros. Nunca ponto flutuante. */
export type Cents = number;

/** Teto por valor (R$ 1 bilhão): protege contra estouro e entradas absurdas. */
export const MAX_AMOUNT_CENTS = 100_000_000_000;

export function assertCents(value: unknown, label = "valor"): asserts value is Cents {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new DomainError("INVALID_AMOUNT", `${label} deve ser um inteiro em centavos`);
  }
  if (Math.abs(value) > MAX_AMOUNT_CENTS) {
    throw new DomainError("INVALID_AMOUNT", `${label} acima do limite permitido`);
  }
}

export function assertPositiveCents(value: unknown, label = "valor"): asserts value is Cents {
  assertCents(value, label);
  if (value <= 0) {
    throw new DomainError("INVALID_AMOUNT", `${label} deve ser maior que zero`);
  }
}

export function sumCents(values: readonly Cents[]): Cents {
  let total = 0;
  for (const value of values) {
    assertCents(value);
    total += value;
  }
  if (!Number.isSafeInteger(total)) {
    throw new DomainError("INVALID_AMOUNT", "soma fora do intervalo seguro");
  }
  return total;
}

/**
 * Divide `total` em `parts` partes inteiras cuja soma é exatamente `total`.
 * As primeiras `total mod parts` partes recebem 1 centavo a mais.
 */
export function splitEvenly(total: Cents, parts: number): Cents[] {
  assertCents(total, "total");
  if (total < 0) {
    throw new DomainError("INVALID_AMOUNT", "total não pode ser negativo");
  }
  if (!Number.isInteger(parts) || parts < 1) {
    throw new DomainError("INVALID_ARGUMENT", "número de partes deve ser um inteiro maior que zero");
  }
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}

/**
 * Rateia `total` proporcionalmente a `weights` (inteiros >= 0), pelo método do maior resto.
 * Usa BigInt nos produtos intermediários para não perder precisão.
 */
export function allocateByWeights(total: Cents, weights: readonly number[]): Cents[] {
  assertCents(total, "total");
  if (total < 0) {
    throw new DomainError("INVALID_AMOUNT", "total não pode ser negativo");
  }
  if (weights.length === 0 || weights.some((w) => !Number.isSafeInteger(w) || w < 0)) {
    throw new DomainError("INVALID_ARGUMENT", "pesos devem ser inteiros maiores ou iguais a zero");
  }
  const weightSum = weights.reduce((sum, w) => sum + BigInt(w), 0n);
  if (weightSum === 0n) {
    throw new DomainError("INVALID_ARGUMENT", "a soma dos pesos deve ser maior que zero");
  }

  const bigTotal = BigInt(total);
  const shares = weights.map((w, index) => {
    const product = bigTotal * BigInt(w);
    return { index, floor: product / weightSum, remainder: product % weightSum };
  });
  let left = bigTotal - shares.reduce((sum, s) => sum + s.floor, 0n);

  const byRemainder = [...shares].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  );
  const extra = new Set<number>();
  for (const share of byRemainder) {
    if (left === 0n) break;
    if (weights[share.index] === 0) continue;
    extra.add(share.index);
    left -= 1n;
  }
  return shares.map((s) => Number(s.floor) + (extra.has(s.index) ? 1 : 0));
}

/** `bps` pontos-base (1% = 100). Arredonda meio centavo para cima. Somente valores não negativos. */
export function percentOfBps(cents: Cents, bps: number): Cents {
  assertCents(cents, "valor");
  if (cents < 0) {
    throw new DomainError("INVALID_AMOUNT", "valor não pode ser negativo");
  }
  if (!Number.isSafeInteger(bps) || bps < 0) {
    throw new DomainError("INVALID_ARGUMENT", "percentual deve ser um inteiro não negativo em pontos-base");
  }
  const result = (BigInt(cents) * BigInt(bps) + 5000n) / 10000n;
  const value = Number(result);
  assertCents(value);
  return value;
}

const BRL_PATTERN = /^\s*(-)?\s*(?:R\$\s*)?(-)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?\s*$/;

/** Converte texto no padrão pt-BR ("R$ 1.234,56") para centavos. */
export function parseBRL(text: string): Cents {
  const match = BRL_PATTERN.exec(text);
  if (!match || (match[1] && match[2])) {
    throw new DomainError("INVALID_AMOUNT", "valor em reais inválido");
  }
  const reais = Number(match[3].replace(/\./g, ""));
  const fraction = Number((match[4] ?? "").padEnd(2, "0"));
  const magnitude = reais * 100 + fraction;
  if (!Number.isSafeInteger(magnitude)) {
    throw new DomainError("INVALID_AMOUNT", "valor em reais inválido");
  }
  const value = match[1] || match[2] ? -magnitude : magnitude;
  assertCents(value);
  return value;
}

/** Formata centavos como "R$ 1.234,56" (sem depender de Intl). */
export function formatBRL(cents: Cents): string {
  assertCents(cents);
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const reais = Math.floor(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fraction = (absolute % 100).toString().padStart(2, "0");
  return `${negative ? "-" : ""}R$ ${reais},${fraction}`;
}
