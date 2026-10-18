import { defineConfig } from "vitest/config";

// Testes de integração: exigem o Supabase LOCAL em execução (npm run db:start).
// Não entram em `npm test`.
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.itest.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
