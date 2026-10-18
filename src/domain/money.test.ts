import { describe, expect, it } from "vitest";
import { DomainError } from "./errors";
import {
  MAX_AMOUNT_CENTS,
  allocateByWeights,
  assertCents,
  assertPositiveCents,
  formatBRL,
  parseBRL,
  percentOfBps,
  splitEvenly,
  sumCents,
} from "./money";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("assertCents", () => {
  it.each([0, 1, -1, 12_345, MAX_AMOUNT_CENTS, -MAX_AMOUNT_CENTS])("aceita %s", (value) => {
    expect(() => assertCents(value)).not.toThrow();
  });

  it.each([0.1, 1.5, NaN, Infinity, -Infinity, "10", null, undefined, {}, MAX_AMOUNT_CENTS + 1, 2 ** 53])(
    "rejeita %s",
    (value) => {
      expect(() => assertCents(value)).toThrow(DomainError);
    },
  );

  it("usa o código INVALID_AMOUNT", () => {
    try {
      assertCents(1.5);
      expect.unreachable();
    } catch (error) {
      expect((error as DomainError).code).toBe("INVALID_AMOUNT");
    }
  });
});

describe("assertPositiveCents", () => {
  it("aceita valores positivos", () => {
    expect(() => assertPositiveCents(1)).not.toThrow();
  });
  it.each([0, -1, 0.5])("rejeita %s", (value) => {
    expect(() => assertPositiveCents(value)).toThrow(DomainError);
  });
});

describe("sumCents", () => {
  it("soma exatamente, sem erro de ponto flutuante", () => {
    // 0,10 + 0,20 em float dá 0,30000000000000004
    expect(sumCents([10, 20])).toBe(30);
    expect(sumCents([])).toBe(0);
    expect(sumCents([-500, 200, 300])).toBe(0);
  });
  it("rejeita qualquer elemento inválido", () => {
    expect(() => sumCents([10, 0.5])).toThrow(DomainError);
  });
});

describe("splitEvenly", () => {
  it("R$ 100,00 em 3x preserva os centavos (primeiras parcelas recebem o resto)", () => {
    expect(splitEvenly(10_000, 3)).toEqual([3334, 3333, 3333]);
  });
  it("divisão exata", () => {
    expect(splitEvenly(120_000, 6)).toEqual([20_000, 20_000, 20_000, 20_000, 20_000, 20_000]);
  });
  it("resto maior que 1 centavo", () => {
    expect(splitEvenly(5, 3)).toEqual([2, 2, 1]);
  });
  it("uma parte e total zero", () => {
    expect(splitEvenly(1, 1)).toEqual([1]);
    expect(splitEvenly(0, 3)).toEqual([0, 0, 0]);
  });
  it("total no teto em 48 partes mantém a soma exata", () => {
    const parts = splitEvenly(MAX_AMOUNT_CENTS, 48);
    expect(parts).toHaveLength(48);
    expect(sum(parts)).toBe(MAX_AMOUNT_CENTS);
  });
  it("propriedade: soma exata e diferença máxima de 1 centavo", () => {
    for (const total of [1, 7, 99, 100, 101, 12_345, 999_999, 1_000_001]) {
      for (let parts = 1; parts <= 48; parts += 1) {
        const result = splitEvenly(total, parts);
        expect(sum(result)).toBe(total);
        expect(Math.max(...result) - Math.min(...result)).toBeLessThanOrEqual(1);
        expect(result).toEqual([...result].sort((a, b) => b - a));
      }
    }
  });
  it("rejeita partes inválidas e totais inválidos", () => {
    expect(() => splitEvenly(100, 0)).toThrow(DomainError);
    expect(() => splitEvenly(100, 1.5)).toThrow(DomainError);
    expect(() => splitEvenly(100, -2)).toThrow(DomainError);
    expect(() => splitEvenly(-100, 2)).toThrow(DomainError);
    expect(() => splitEvenly(10.5, 2)).toThrow(DomainError);
  });
});

describe("allocateByWeights", () => {
  it("maiores restos recebem o centavo extra", () => {
    expect(allocateByWeights(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocateByWeights(100, [70, 30])).toEqual([70, 30]);
    expect(allocateByWeights(10, [1, 2])).toEqual([3, 7]);
  });
  it("peso zero recebe zero", () => {
    expect(allocateByWeights(100, [0, 1, 1])).toEqual([0, 50, 50]);
  });
  it("não perde precisão com valores grandes", () => {
    const result = allocateByWeights(MAX_AMOUNT_CENTS, [999_999, 1, 1]);
    expect(sum(result)).toBe(MAX_AMOUNT_CENTS);
  });
  it("soma sempre igual ao total", () => {
    for (const total of [1, 99, 12_345]) {
      expect(sum(allocateByWeights(total, [3, 5, 7, 11]))).toBe(total);
    }
  });
  it("rejeita pesos inválidos", () => {
    expect(() => allocateByWeights(100, [])).toThrow(DomainError);
    expect(() => allocateByWeights(100, [0, 0])).toThrow(DomainError);
    expect(() => allocateByWeights(100, [1, -1])).toThrow(DomainError);
    expect(() => allocateByWeights(100, [1.5])).toThrow(DomainError);
  });
});

describe("percentOfBps", () => {
  it("arredonda meio centavo para cima", () => {
    expect(percentOfBps(1000, 100)).toBe(10); // 1%
    expect(percentOfBps(333, 100)).toBe(3); // 3,33
    expect(percentOfBps(350, 100)).toBe(4); // 3,50
    expect(percentOfBps(349, 100)).toBe(3); // 3,49
  });
  it("rejeita entradas inválidas", () => {
    expect(() => percentOfBps(-1, 100)).toThrow(DomainError);
    expect(() => percentOfBps(100, 1.5)).toThrow(DomainError);
    expect(() => percentOfBps(100, -1)).toThrow(DomainError);
  });
});

describe("parseBRL", () => {
  it.each([
    ["1.234,56", 123_456],
    ["R$ 1.234,56", 123_456],
    ["R$1.234,56", 123_456],
    ["1234,56", 123_456],
    ["0,5", 50],
    ["0,05", 5],
    ["10", 1000],
    ["1.234", 123_400],
    ["-R$ 10,00", -1000],
    ["R$ -10,00", -1000],
    ["  42,00  ", 4200],
  ])("converte %s", (text, expected) => {
    expect(parseBRL(text)).toBe(expected);
  });

  it.each(["", "abc", "12.5", "1,234", "1.23.4", "1,2,3", "R$", "1e3", "10,000", "--5", "1 000,00"])(
    "rejeita %s",
    (text) => {
      expect(() => parseBRL(text)).toThrow(DomainError);
    },
  );

  it("rejeita valor acima do teto", () => {
    expect(() => parseBRL("9.999.999.999,99")).toThrow(DomainError);
  });
});

describe("formatBRL", () => {
  it.each([
    [0, "R$ 0,00"],
    [5, "R$ 0,05"],
    [123_456, "R$ 1.234,56"],
    [100_000_000, "R$ 1.000.000,00"],
    [-1000, "-R$ 10,00"],
  ])("formata %s", (cents, expected) => {
    expect(formatBRL(cents)).toBe(expected);
  });
  it("rejeita valores inválidos", () => {
    expect(() => formatBRL(1.5)).toThrow(DomainError);
  });
  it("ida e volta preserva o valor", () => {
    for (const cents of [0, 1, 99, 100, 123_456, -987_654, MAX_AMOUNT_CENTS]) {
      expect(parseBRL(formatBRL(cents))).toBe(cents);
    }
  });
});
