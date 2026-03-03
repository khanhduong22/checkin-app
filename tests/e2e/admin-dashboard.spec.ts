import { test, expect } from "@playwright/test";

// All tests in this file use admin-auth project (storageState: tests/.auth/admin.json)

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
  });

  test("loads dashboard with heading 'Dashboard'", async ({ page }) => {
    // Wait for page to load fully
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h2").filter({ hasText: "Dashboard" })).toBeVisible();
  });

  test("shows stat card: current month salary", async ({ page }) => {
    await expect(page.locator("#dashboard-salary-card")).toBeVisible();
  });

  test("shows stat card: pending requests", async ({ page }) => {
    await expect(page.locator("#dashboard-requests-card")).toBeVisible();
  });

  test("shows stat card: today check-ins", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    // salary card already verified above; check body has check-in related content
    await expect(page.locator("body")).toContainText("Lượt Check");
  });

  test("shows check-in activity section", async ({ page }) => {
    await expect(page.locator("#dashboard-checkin-activity")).toBeVisible();
  });

  test("shows today schedule section", async ({ page }) => {
    await expect(page.locator("#dashboard-today-schedule")).toBeVisible();
  });

  test("has link to changelog", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    // Dismiss any tour overlay first
    const overlay = page.locator('[data-test-id="overlay"]');
    if (await overlay.isVisible()) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
    await expect(
      page.locator("a").filter({ hasText: /lịch sử/i })
    ).toBeVisible();
  });
});
