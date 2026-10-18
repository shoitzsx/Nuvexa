import { expect, type Page, test } from "@playwright/test";

const widths = [390, 768, 1024, 1440] as const;
const themes = ["light", "dark"] as const;
const themeStorageKey = "finantrack.theme";
const toastSelector = 'aside[aria-label="Exemplo de atividade recente"]';

async function openLanding(page: Page, width: number, theme: (typeof themes)[number]) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [themeStorageKey, theme],
  );
  await page.clock.install({ time: new Date("2026-08-01T12:00:00-03:00") });
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
}

async function revealWholePage(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let top = 0; top < height; top += 300) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
    await page.waitForTimeout(50);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  // Avança o relógio simulado o suficiente para concluir as animações de entrada,
  // mas antes de 1,5 s, quando a primeira notificação aparece.
  await page.clock.runFor(1_200);
}

for (const theme of themes) {
  for (const width of widths) {
    test(`landing completa ${width}px ${theme}`, async ({ page }) => {
      await openLanding(page, width, theme);
      await revealWholePage(page);
      await expect(page.locator(`${toastSelector} > div`)).toHaveCount(0);
      await expect(page).toHaveScreenshot(`landing-${width}-${theme}.png`, { fullPage: true });
    });
  }
}

// As notificações usam o relógio real: a opacidade é animada via WAAPI, que não
// acompanha o relógio simulado do Playwright.
test.describe("notificações de prova social", () => {
  async function openWithRealClock(page: Page, width: number, theme: (typeof themes)[number]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [themeStorageKey, theme],
    );
    await page.goto("/", { waitUntil: "load" });
  }

  test("aparece, some e avança na sequência original", async ({ page }) => {
    test.setTimeout(45_000);
    await openWithRealClock(page, 1440, "light");
    const card = page.locator(`${toastSelector} > div`);

    await expect(card).toHaveCount(0);
    await expect(card).toContainText("Mariana de Curitiba", { timeout: 6_000 });
    await expect(card).toContainText("Conheceu o plano Nuvexa Plus há 3 min");

    // Visível por 5 s, depois saída animada de 0,5 s.
    await expect(card).toHaveCount(0, { timeout: 8_000 });

    // Próxima: 7 s de intervalo + 1,5 s de espera inicial.
    await expect(card).toContainText("Lucas de São Paulo", { timeout: 12_000 });
  });

  for (const { width, inset } of [
    { width: 390, inset: 16 },
    { width: 1440, inset: 24 },
  ]) {
    for (const theme of themes) {
      test(`posição e visual ${width}px ${theme}`, async ({ page }) => {
        await openWithRealClock(page, width, theme);
        const card = page.locator(`${toastSelector} > div`);
        await expect(card).toContainText("Mariana de Curitiba", { timeout: 6_000 });
        await expect.poll(async () => Math.round((await card.boundingBox())?.x ?? -1)).toBe(inset);

        const box = await card.boundingBox();
        expect(box).not.toBeNull();
        expect(Math.round(900 - (box!.y + box!.height))).toBe(inset);
        expect(Math.round(box!.width)).toBeLessThanOrEqual(320);

        await expect(card).toHaveScreenshot(`toast-${width}-${theme}.png`);
      });
    }
  }
});

test.describe("navegação pública", () => {
  test("CTAs, privacidade e menu móvel", async ({ page }) => {
    const consoleIssues: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        consoleIssues.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => consoleIssues.push(`pageerror: ${error.message}`));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Entenda para onde seu dinheiro vai." })).toBeVisible();

    await page.getByRole("link", { name: "Começar gratuitamente" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("img", { name: "Nuvexa" }).first()).toBeVisible();
    await expect(page.getByText("Página não encontrada")).toHaveCount(0);

    await page.goto("/");
    await page.getByRole("link", { name: "Privacidade" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { name: "Política de Privacidade" })).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    await page.getByRole("link", { name: "Voltar ao início" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByRole("link", { name: "Criar conta grátis" })).toBeVisible();
    const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    expect(consoleIssues).toEqual([]);
  });
});
