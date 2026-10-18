import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonthsClamped,
  clampDay,
  compareIsoDates,
  daysInMonth,
  endOfMonth,
  formatIsoDate,
  isIsoDate,
  isLeapYear,
  monthStart,
  parseIsoDate,
  todayInZone,
} from "./dates";
import { DomainError } from "./errors";

describe("isIsoDate", () => {
  it.each(["2026-08-10", "2028-02-29", "2026-12-31", "1900-01-01"])("aceita %s", (value) => {
    expect(isIsoDate(value)).toBe(true);
  });
  it.each(["2026-02-29", "2026-13-01", "2026-00-10", "2026-08-32", "2026-8-1", "10/08/2026", "", "2026-08-10T00:00:00Z", null, 20260810])(
    "rejeita %s",
    (value) => {
      expect(isIsoDate(value)).toBe(false);
    },
  );
});

describe("calendário", () => {
  it("anos bissextos", () => {
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2100)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });
  it("dias por mês", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
  it("clampDay limita ao último dia do mês", () => {
    expect(clampDay(2026, 2, 31)).toBe(28);
    expect(clampDay(2028, 2, 31)).toBe(29);
    expect(clampDay(2026, 4, 31)).toBe(30);
    expect(clampDay(2026, 8, 5)).toBe(5);
  });
  it("formatIsoDate valida e completa com zeros", () => {
    expect(formatIsoDate(2026, 8, 5)).toBe("2026-08-05");
    expect(() => formatIsoDate(2026, 2, 30)).toThrow(DomainError);
  });
  it("parseIsoDate", () => {
    expect(parseIsoDate("2026-08-05")).toEqual({ year: 2026, month: 8, day: 5 });
    expect(() => parseIsoDate("2026-02-30")).toThrow(DomainError);
  });
});

describe("addMonthsClamped", () => {
  it("meses curtos e ajuste a partir do dia original (sem acumular erro)", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2026-01-31", 2)).toBe("2026-03-31");
    expect(addMonthsClamped("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsClamped("2026-01-31", 3)).toBe("2026-04-30");
  });
  it("virada de ano e valores negativos", () => {
    expect(addMonthsClamped("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonthsClamped("2026-08-10", -8)).toBe("2025-12-10");
    expect(addMonthsClamped("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonthsClamped("2026-08-10", 0)).toBe("2026-08-10");
    expect(addMonthsClamped("2026-08-10", 24)).toBe("2028-08-10");
  });
  it("rejeita deslocamentos inválidos", () => {
    expect(() => addMonthsClamped("2026-08-10", 1.5)).toThrow(DomainError);
  });
});

describe("addDays, início e fim do mês", () => {
  it("addDays atravessa mês, ano e bissexto", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-09-05", -1)).toBe("2026-09-04");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("monthStart e endOfMonth", () => {
    expect(monthStart("2026-08-17")).toBe("2026-08-01");
    expect(endOfMonth("2026-08-17")).toBe("2026-08-31");
    expect(endOfMonth("2026-02-03")).toBe("2026-02-28");
    expect(endOfMonth("2028-02-03")).toBe("2028-02-29");
  });
  it("compareIsoDates", () => {
    expect(compareIsoDates("2026-08-10", "2026-08-11")).toBe(-1);
    expect(compareIsoDates("2026-08-10", "2026-08-10")).toBe(0);
    expect(compareIsoDates("2027-01-01", "2026-12-31")).toBe(1);
  });
});

describe("todayInZone (America/Sao_Paulo)", () => {
  it("23h30 em Brasília ainda é o dia anterior (UTC já virou o dia)", () => {
    expect(todayInZone(new Date("2026-08-10T02:30:00Z"))).toBe("2026-08-09");
  });
  it("00h00 em Brasília", () => {
    expect(todayInZone(new Date("2026-08-10T03:00:00Z"))).toBe("2026-08-10");
  });
  it("outro fuso muda o dia", () => {
    expect(todayInZone(new Date("2026-08-10T02:30:00Z"), "UTC")).toBe("2026-08-10");
  });
  it("rejeita fuso e data inválidos", () => {
    expect(() => todayInZone(new Date("2026-08-10T00:00:00Z"), "Marte/Olympus")).toThrow(DomainError);
    expect(() => todayInZone(new Date("invalid"))).toThrow(DomainError);
  });
});
