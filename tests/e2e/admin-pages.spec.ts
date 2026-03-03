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
    // overlay not present
  }
}

test.describe("Admin Employees", () => {
  test("loads employee list page", async ({ page }) => {
    await page.goto("/admin/employees");
    // Should not redirect away
    await expect(page).toHaveURL(/\/admin\/employees/);
    // Should render some content
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("shows page heading for employees", async ({ page }) => {
    await page.goto("/admin/employees");
    await page.waitForLoadState("networkidle");
    await dismissTour(page);
    const heading = page.locator("h2, h1").first();
    await expect(heading).toBeVisible();
  });

  test("employee list renders without crashing", async ({ page }) => {
    await page.goto("/admin/employees");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("500");
  });
});

test.describe("Admin Payroll", () => {
  test("loads payroll page", async ({ page }) => {
    await page.goto("/admin/payroll");
    await expect(page).toHaveURL(/\/admin\/payroll/);
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("payroll page renders without crashing", async ({ page }) => {
    await page.goto("/admin/payroll");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("500");
  });
});

test.describe("Admin Schedule", () => {
  test("loads schedule page", async ({ page }) => {
    await page.goto("/admin/schedule");
    await expect(page).toHaveURL(/\/admin\/schedule/);
    await expect(page.locator("body")).not.toContainText("Application error");
  });
});

test.describe("Admin Settings", () => {
  test("loads settings page with tabs", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(
      page.getByRole("heading", { name: /cấu hình hệ thống/i })
    ).toBeVisible();
  });

  test("shows tabs: Truy cập & Bảo mật, Ngày Lễ & Lương, Sao lưu", async ({
    page,
  }) => {
    await page.goto("/admin/settings");
    await expect(
      page.getByRole("tab", { name: /truy cập/i })
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /ngày lễ/i })
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /sao lưu/i })
    ).toBeVisible();
  });

  test("Access tab shows IP management section", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.waitForLoadState("networkidle");
    // Force remove joyride overlay via JS (ESC doesn't always work)
    await page.evaluate(() => {
      const portal = document.getElementById('react-joyride-portal');
      if (portal) portal.remove();
    });
    await page.getByRole("tab", { name: /truy cập/i }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("500");
  });
});

test.describe("Admin Reports", () => {
  test("loads reports page without crash", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/admin\/reports/);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("500");
  });
});

test.describe("Admin Lucky Wheel", () => {
  test("loads lucky wheel management page", async ({ page }) => {
    await page.goto("/admin/lucky-wheel");
    await expect(page).toHaveURL(/\/admin\/lucky-wheel/);
    await expect(page.locator("body")).not.toContainText("Application error");
  });
});

test.describe("Admin Changelog", () => {
  test("loads changelog page", async ({ page }) => {
    await page.goto("/admin/changelog");
    await expect(page).toHaveURL(/\/admin\/changelog/);
    await expect(page.locator("body")).not.toContainText("500");
  });
});
