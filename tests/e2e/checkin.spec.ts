import { test, expect } from "@playwright/test";

test.describe("Check-in Page (unauthenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("root / redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});

// These tests require an authenticated session.
// In CI, they can be gated behind a session fixture.
// For now, we verify the pages do not 500.
test.describe("History Page", () => {
  test("history page redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/history");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Schedule Page", () => {
  test("schedule page redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/schedule");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Requests Page", () => {
  test("requests page redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/requests");
    await expect(page).toHaveURL(/\/login/);
  });
});
