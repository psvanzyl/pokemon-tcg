import { defineConfig, devices } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3001";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
