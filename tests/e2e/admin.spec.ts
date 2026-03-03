import { test, expect } from "@playwright/test";

// The admin layout checks session + ADMIN role, and redirects to '/' (not /login) if not admin.
// Unauthenticated users: NextAuth root redirect kicks in first → /login, OR admin layout redirects to /.
// We test that admin routes are NOT accessible (user ends up NOT on the admin page).

test.describe("Admin Panel (access control)", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("unauthenticated access to /admin is blocked", async ({ page }) => {
    await page.goto("/admin");
    // Should redirect away — either to /login or to /
    await expect(page).not.toHaveURL("http://localhost:5000/admin");
  });

  test("unauthenticated access to /admin/payroll is blocked", async ({
    page,
  }) => {
    await page.goto("/admin/payroll");
    await expect(page).not.toHaveURL("http://localhost:5000/admin/payroll");
  });

  test("unauthenticated access to /admin/employees is blocked", async ({
    page,
  }) => {
    await page.goto("/admin/employees");
    await expect(page).not.toHaveURL("http://localhost:5000/admin/employees");
  });

  test("unauthenticated access to /admin/schedule is blocked", async ({
    page,
  }) => {
    await page.goto("/admin/schedule");
    await expect(page).not.toHaveURL("http://localhost:5000/admin/schedule");
  });

  test("unauthenticated access to /admin/requests is blocked", async ({
    page,
  }) => {
    await page.goto("/admin/requests");
    await expect(page).not.toHaveURL("http://localhost:5000/admin/requests");
  });
});
