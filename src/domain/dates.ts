import { DomainError } from "./errors";

/** Data de negócio no formato AAAA-MM-DD (sem fuso). */
export type IsoDate = string;

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Limita o dia ao último dia do mês (dia 31 em fevereiro vira 28 ou 29). */
export function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}

function validParts(year: number, month: number, day: number): boolean {
  return (
    Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day) &&
    year >= MIN_YEAR && year <= MAX_YEAR && month >= 1 && month <= 12 &&
    day >= 1 && day <= daysInMonth(year, month)
  );
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string") return false;
  const match = ISO_PATTERN.exec(value);
  return match !== null && validParts(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function assertIsoDate(value: unknown, label = "data"): asserts value is IsoDate {
  if (!isIsoDate(value)) {
    throw new DomainError("INVALID_DATE", `${label} inválida (esperado AAAA-MM-DD)`);
  }
}

export function formatIsoDate(year: number, month: number, day: number): IsoDate {
  if (!validParts(year, month, day)) {
    throw new DomainError("INVALID_DATE", `data inexistente: ${year}-${month}-${day}`);
  }
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function parseIsoDate(value: IsoDate): { year: number; month: number; day: number } {
  assertIsoDate(value);
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)), day: Number(value.slice(8, 10)) };
}

export function compareIsoDates(a: IsoDate, b: IsoDate): -1 | 0 | 1 {
  assertIsoDate(a);
  assertIsoDate(b);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function monthStart(value: IsoDate): IsoDate {
  const { year, month } = parseIsoDate(value);
  return formatIsoDate(year, month, 1);
}

export function endOfMonth(value: IsoDate): IsoDate {
  const { year, month } = parseIsoDate(value);
  return formatIsoDate(year, month, daysInMonth(year, month));
}

/**
 * Soma `months` meses mantendo o dia da data ORIGINAL (limitado ao último dia do mês).
 * Sempre parta da data original ao gerar parcelas, para não acumular erro (31/jan, 28/fev, 31/mar).
 */
export function addMonthsClamped(value: IsoDate, months: number): IsoDate {
  if (!Number.isInteger(months)) {
    throw new DomainError("INVALID_ARGUMENT", "deslocamento em meses deve ser inteiro");
  }
  const { year, month, day } = parseIsoDate(value);
  const total = year * 12 + (month - 1) + months;
  const newYear = Math.floor(total / 12);
  const newMonth = total - newYear * 12 + 1;
  return formatIsoDate(newYear, newMonth, clampDay(newYear, newMonth, day));
}

export function addDays(value: IsoDate, days: number): IsoDate {
  if (!Number.isInteger(days)) {
    throw new DomainError("INVALID_ARGUMENT", "deslocamento em dias deve ser inteiro");
  }
  const { year, month, day } = parseIsoDate(value);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return formatIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Diferença em meses entre os inícios de mês de `from` e `to` (to - from). */
export function monthsBetween(from: IsoDate, to: IsoDate): number {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}

/** "Hoje" no fuso informado (padrão: America/Sao_Paulo). O domínio nunca lê o relógio sozinho. */
export function todayInZone(now: Date, timeZone = "America/Sao_Paulo"): IsoDate {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new DomainError("INVALID_DATE", "instante inválido");
  }
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    throw new DomainError("INVALID_ARGUMENT", `fuso horário inválido: ${timeZone}`);
  }
  const parts = Object.fromEntries(formatter.formatToParts(now).map((p) => [p.type, p.value]));
  return formatIsoDate(Number(parts.year), Number(parts.month), Number(parts.day));
}
