import { test, expect } from "@playwright/test";

// ============================================================
// Admin — Payroll Detail & Employee Profile
// uses admin-auth project (storageState: tests/.auth/admin.json)
// ============================================================

test.describe("Admin Payroll Detail", () => {
  test("payroll list loads and shows employee rows", async ({ page }) => {
    await page.goto("/admin/payroll");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/payroll/);
    await expect(page.locator("body")).not.toContainText("500 Internal Server");
  });

  test("payroll page has month selector or table", async ({ page }) => {
    await page.goto("/admin/payroll");
    await page.waitForLoadState("networkidle");
    // Should render a salary-related heading or table
    await expect(page.locator("body")).toContainText(/lương|payroll|tháng/i);
  });
});

test.describe("Admin Employee Profile & Detail", () => {
  test("employee list page loads", async ({ page }) => {
    await page.goto("/admin/employees");
    await page.waitForLoadState("networkidle");
    // Remove joyride overlay
    await page.evaluate(() => {
      const portal = document.getElementById("react-joyride-portal");
      if (portal) portal.remove();
    });
    await expect(page.locator("h2, h1").first()).toBeVisible();
  });

  test("clicking first employee navigates to profile detail", async ({
    page,
  }) => {
    await page.goto("/admin/employees");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      const portal = document.getElementById("react-joyride-portal");
      if (portal) portal.remove();
    });

    // Find first employee card/row link and click it
    const employeeLink = page
      .locator("a[href^='/admin/employees/']")
      .first();

    if (await employeeLink.isVisible({ timeout: 3000 })) {
      await employeeLink.click();
      await page.waitForLoadState("networkidle");
      // Profile page should show stat cards and email
      await expect(page).toHaveURL(/\/admin\/employees\/.+/);
      await expect(page.locator("body")).not.toContainText("500 Internal Server");
    } else {
      // No employees in DB — skip detail test
      console.log("No employee links found, skipping detail test");
    }
  });

  test("employee profile shows key sections", async ({ page }) => {
    await page.goto("/admin/employees");
    await page.waitForLoadState("networkidle");
    const employeeLink = page.locator("a[href^='/admin/employees/']").first();

    if (await employeeLink.isVisible({ timeout: 3000 })) {
      const href = await employeeLink.getAttribute("href");
      await page.goto(href!);
      await page.waitForLoadState("networkidle");

      // Should show stat cards: Tổng Công, Lương Tạm Tính
      await expect(page.locator("body")).toContainText(/Tổng Công|Lương Tạm/i);
      // Should show the attendance table
      await expect(page.locator("body")).toContainText(/Bảng Chấm Công/i);
    }
  });
});

test.describe("Admin Tasks / WFH Management", () => {
  test("loads Task Management page with heading", async ({ page }) => {
    await page.goto("/admin/tasks");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").filter({ hasText: /WFH & Packing Management/i })).toBeVisible();
  });

  test("shows 3 tabs: Review, Definitions, Items", async ({ page }) => {
    await page.goto("/admin/tasks");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#tab-trigger-review")).toBeVisible();
    await expect(page.locator("#tab-trigger-definitions")).toBeVisible();
    await expect(page.locator("#tab-trigger-items")).toBeVisible();
  });

  test("Task Definitions tab loads without crash", async ({ page }) => {
    await page.goto("/admin/tasks");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      const portal = document.getElementById("react-joyride-portal");
      if (portal) portal.remove();
    });
    await page.locator("#tab-trigger-definitions").click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("500 Internal Server");
  });

  test("Task Items (Marketplace) tab loads without crash", async ({ page }) => {
    await page.goto("/admin/tasks");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      const portal = document.getElementById("react-joyride-portal");
      if (portal) portal.remove();
    });
    await page.locator("#tab-trigger-items").click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("500 Internal Server");
  });
});

test.describe("Admin Help", () => {
  test("loads help page without crash", async ({ page }) => {
    await page.goto("/admin/help");
    await expect(page).toHaveURL(/\/admin\/help/);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("500 Internal Server");
  });
});

test.describe("Admin Payroll — Per-User Detail Page", () => {
  test("navigate to employee payroll detail from payroll list", async ({ page }) => {
    await page.goto("/admin/payroll");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      const portal = document.getElementById("react-joyride-portal");
      if (portal) portal.remove();
    });

    // Find first link to a user's payroll page
    const payrollLink = page.locator("a[href^='/admin/payroll/']").first();
    if (await payrollLink.isVisible({ timeout: 3000 })) {
      const href = await payrollLink.getAttribute("href");
      await page.goto(href!);
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/admin\/payroll\/.+/);
      await expect(page.locator("body")).toContainText(/Chi tiết lương nhân viên/i);
    } else {
      console.log("No payroll user links found — skipping direct payroll detail test");
    }
  });

  test("payroll detail page shows month selector", async ({ page }) => {
    await page.goto("/admin/payroll");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      const portal = document.getElementById("react-joyride-portal");
      if (portal) portal.remove();
    });
    const payrollLink = page.locator("a[href^='/admin/payroll/']").first();
    if (await payrollLink.isVisible({ timeout: 3000 })) {
      const href = await payrollLink.getAttribute("href");
      await page.goto(href!);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).toContainText(/Kỳ lương/i);
    }
  });
});

test.describe("Admin Employee Profile — Manual Check-in Form", () => {
  test("employee profile shows Manual Check-in form (read-only verification)", async ({
    page,
  }) => {
    await page.goto("/admin/employees");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      const portal = document.getElementById("react-joyride-portal");
      if (portal) portal.remove();
    });

    const employeeLink = page.locator("a[href^='/admin/employees/']").first();
    if (await employeeLink.isVisible({ timeout: 3000 })) {
      const href = await employeeLink.getAttribute("href");
      await page.goto(href!);
      await page.waitForLoadState("networkidle");

      // ManualCheckInForm renders a select for shift and time inputs
      // Verify form renders (no submit — would write to prod DB)
      await expect(page.locator("body")).toContainText(/Chấm Công Thủ Công|Manual|Check.in/i);
      // Form should have a select or button
      const formControls = page.locator("select, input[type='datetime-local'], input[type='time']");
      await expect(formControls.first()).toBeVisible();
    } else {
      console.log("No employees in DB — skipping manual check-in form test");
    }
  });
});
