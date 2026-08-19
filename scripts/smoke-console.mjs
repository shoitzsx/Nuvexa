import { chromium, expect } from "@playwright/test";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const consoleIssues = [];

page.on("console", (message) => {
  if (message.type() === "error" || message.type() === "warning") {
    consoleIssues.push(`${message.type()}: ${message.text()}`);
  }
});

page.on("pageerror", (error) => {
  consoleIssues.push(`pageerror: ${error.message}`);
});

await page.goto(appUrl, { waitUntil: "networkidle" });
await expect(
  page.getByRole("heading", { name: "Entenda para onde seu dinheiro vai." }),
).toBeVisible();
await expect(page.getByRole("link", { name: "Começar gratuitamente" })).toBeVisible();
await page.getByRole("link", { name: "Começar gratuitamente" }).click();
await expect(page.getByRole("img", { name: "Nuvexa" }).first()).toBeVisible();
await page.locator('button[aria-label^="Ativar tema"]').first().click();

await page.getByRole("link", { name: "Política de Privacidade" }).click();
await expect(
  page.getByRole("heading", { name: "Política de Privacidade" }),
).toBeVisible();

await page.goto(`${appUrl}/dashboard`, { waitUntil: "networkidle" });

const setupNotice = page.getByText("Site temporariamente indisponível");
const loginHeading = page.getByRole("heading", { name: "Entrar" });
const protectedRouteHandled =
  (await setupNotice.count()) > 0 || (await loginHeading.count()) > 0;

if (!protectedRouteHandled) {
  throw new Error("Rota protegida não exibiu aviso ou login.");
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(appUrl, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Abrir menu" }).click();
await expect(page.getByRole("link", { name: "Criar conta grátis" })).toBeVisible();

const layout = await page.evaluate(() => ({
  bodyWidth: document.body.scrollWidth,
  viewportWidth: window.innerWidth,
}));

await browser.close();

if (layout.bodyWidth > layout.viewportWidth) {
  throw new Error(
    `Overflow horizontal detectado: body ${layout.bodyWidth}px, viewport ${layout.viewportWidth}px.`,
  );
}

if (consoleIssues.length > 0) {
  throw new Error(`Console com avisos ou erros:\n${consoleIssues.join("\n")}`);
}

console.log("Smoke test sem erros de console e sem overflow horizontal.");
