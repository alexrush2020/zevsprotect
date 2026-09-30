import { defineConfig, devices } from "@playwright/test";

/**
 * E2E витрины (L-QA). Сервер поднимается вручную на изолированной БД zevs_e2e — см. docs/qa/2026-09-30-e2e-protocol.md.
 * E2E_IP — x-real-ip прогона (см. withRunIp в e2e/helpers.ts).
 */
process.env.E2E_IP ??= `e2e-${Date.now()}`;

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:43140",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
