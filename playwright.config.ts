import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 3,
  timeout: 60000,
  reporter: "html",
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",
  use: {
    baseURL: "http://localhost:5000",
    trace: "on",
    screenshot: "on",
    video: "on",
  },
  projects: [
    {
      // Unauthenticated flows: auth.spec.ts, checkin.spec.ts, admin.spec.ts
      name: "unauthenticated",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: ["**/admin-*.spec.ts", "**/staff-flows.spec.ts"],
    },
    {
      // Authenticated admin flows: admin-*.spec.ts
      name: "admin-auth",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/admin.json",
      },
      testMatch: ["**/admin-*.spec.ts"],
    },
    {
      // Authenticated staff flows: staff-flows.spec.ts
      name: "staff-auth",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/staff.json",
      },
      testMatch: ["**/staff-flows.spec.ts"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5000",
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
