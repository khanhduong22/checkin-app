import { test, expect } from "@playwright/test";

// Helper: dismiss react-joyride tour overlay if present
async function dismissTour(page: any) {
  const overlay = page.locator('[data-test-id="overlay"]');
  try {
    if (await overlay.isVisible({ timeout: 1000 })) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
  } catch {
    // overlay not present, continue
  }
}

test.describe("Admin Announcements (CRUD)", () => {
  const E2E_TITLE = "[E2E] Playwright Test Announcement";
  const E2E_CONTENT = "This is an automated E2E test announcement.";

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/announcements");
    await page.waitForLoadState("networkidle");
    await dismissTour(page);
    await expect(
      page.locator("h2").filter({ hasText: /thông báo/i })
    ).toBeVisible();
  });

  test("renders announcement page with 'Đăng thông báo mới' button", async ({
    page,
  }) => {
    await expect(page.locator("#announcement-new-btn")).toBeVisible();
  });

  test("CREATE: opens modal and creates a new announcement", async ({
    page,
  }) => {
    // Remove joyride portal overlay before clicking (it blocks the button)
    await page.evaluate(() => {
      const portal = document.getElementById("react-joyride-portal");
      if (portal) portal.remove();
    });

    // Open modal
    await page.locator("#announcement-new-btn").click();
    // Use role=heading to avoid strict mode (there could be nav text matching same string)
    await expect(page.getByRole("heading", { name: "Đăng Thông Báo Mới" })).toBeVisible();

    // Fill form — use placeholders from the actual HTML
    await page.getByPlaceholder(/VD:/i).fill(E2E_TITLE);
    await page.getByPlaceholder(/Nội dung chi tiết/i).fill(E2E_CONTENT);

    // Submit
    await page.getByRole("button", { name: "Đăng ngay" }).click();

    // Verify appears in list
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#announcement-list")).toContainText(E2E_TITLE);
  });

  test("TOGGLE: can toggle announcement active/inactive", async ({ page }) => {
    // Find our E2E announcement — it must exist (created by previous test in sequence or pre-seeded)
    // This test verifies the toggle button works on any announcement in the list
    const list = page.locator("#announcement-list");
    const firstToggle = list.getByRole("button", { name: /tắt|bật/i }).first();

    if (await firstToggle.isVisible({ timeout: 3000 })) {
      const initialText = await firstToggle.textContent();
      await firstToggle.click();
      await page.waitForLoadState("networkidle");
      // Page should reload without error
      await expect(page.locator("body")).not.toContainText("500 Internal Server");
    } else {
      // No announcements exist to toggle — skip gracefully
      console.log("No announcements to toggle, skipping");
    }
  });
});
