import { test, expect } from "@playwright/test";

test.describe("Admin Requests (Approve / Reject)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/requests");
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("h2").filter({ hasText: /duyệt/i })
    ).toBeVisible();
  });

  test("renders request list", async ({ page }) => {
    await expect(page.locator("#request-admin-list")).toBeVisible();
  });

  test("shows the seeded [E2E] test leave request as PENDING", async ({
    page,
  }) => {
    await expect(page.locator("#request-admin-list")).toContainText(
      "[E2E] Test leave request for approve/reject flow"
    );
    // Should show approve + reject buttons (PENDING state)
    await expect(
      page.getByRole("button", { name: /✅ Duyệt/ }).first()
    ).toBeVisible();
  });

  test("APPROVE: approves the [E2E] test request", async ({ page }) => {
    // Remove joyride overlay if present
    await page.evaluate(() => {
      const portal = document.getElementById('react-joyride-portal');
      if (portal) portal.remove();
    });

    // Find first approve button (seeded PENDING [E2E] request)
    const approveBtn = page.locator("button").filter({ hasText: /Duyệt/ }).first();
    await expect(approveBtn).toBeVisible({ timeout: 10000 });

    // Handle the browser confirm dialog
    page.once("dialog", (dialog) => dialog.accept());
    await approveBtn.click();

    // After approve, page refreshes without error
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("500");
  });
});

test.describe("Admin Requests — layout", () => {
  test("page title is correct", async ({ page }) => {
    await page.goto("/admin/requests");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
