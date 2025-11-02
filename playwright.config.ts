import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.(spec|test)\.(ts|js|tsx|jsx)/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalTeardown: "./e2e/globalTeardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /.*\.(spec|test)\.(ts|js|tsx|jsx)/,
    },
  ],
  webServer: {
    command: "npm run dev:e2e",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 60 * 1000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
