import { describe, expect, it } from "vitest";
import {
  calculateInstallmentSchedule,
  splitInstallmentAmounts,
} from "./installmentSchedule";

const card = { closing_day: 20, due_day: 27 };

describe("parcelamentos", () => {
  it("preserva centavos na última parcela", () => {
    expect(splitInstallmentAmounts(100, 3)).toEqual([33.33, 33.33, 33.34]);
    expect(
      splitInstallmentAmounts(100, 3).reduce(
        (sum, amount) => sum + amount,
        0,
      ),
    ).toBe(100);
  });

  it("encadeia a 12ª parcela onze ciclos após a primeira atravessando o ano", () => {
    const plan = calculateInstallmentSchedule("2025-03-22", 1200, 12, card);
    expect(plan[0].cycle.referenceMonth).toBe("2025-04");
    expect(plan[11].cycle.referenceMonth).toBe("2026-03");
  });

  it("continua após ciclo no fim de fevereiro não bissexto", () => {
    const plan = calculateInstallmentSchedule("2025-02-28", 300, 3, {
      closing_day: 31,
      due_day: 5,
    });
    expect(plan.map((item) => item.cycle.referenceMonth)).toEqual([
      "2025-02",
      "2025-03",
      "2025-04",
    ]);
  });

  it("continua após ciclo no fim de fevereiro bissexto", () => {
    const plan = calculateInstallmentSchedule("2024-02-29", 300, 3, {
      closing_day: 31,
      due_day: 5,
    });
    expect(plan.map((item) => item.cycle.referenceMonth)).toEqual([
      "2024-02",
      "2024-03",
      "2024-04",
    ]);
  });
});
