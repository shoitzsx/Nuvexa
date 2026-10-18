import { defineConfig, devices } from "@playwright/test";

const port = 4173;

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.pw\.ts$/,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  snapshotPathTemplate: "{testDir}/visual/__snapshots__/{arg}{ext}",
  expect: {
    toHaveScreenshot: { maxDiffPixels: 0, animations: "disabled" },
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${port}`,
  },
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
