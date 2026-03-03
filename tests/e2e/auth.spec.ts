import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("unauthenticated user visiting / is redirected to /login", async ({
    page,
  }) => {
    // Clear any stored session state
    await page.context().clearCookies();

    await page.goto("/");

    // Should end up on the login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders sign-in form / provider button", async ({
    page,
  }) => {
    await page.goto("/login");

    // The page should not show a server error
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page.locator("body")).not.toContainText("Application error");

    // Page content should be visible — look for a heading or sign-in element
    // NextAuth renders a sign-in interface
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Should contain some kind of login action (button or form)
    const hasSignIn =
      (await page.locator("button").count()) > 0 ||
      (await page.locator("input[type=email]").count()) > 0 ||
      (await page.locator("a").filter({ hasText: /sign in|đăng nhập|login/i }).count()) > 0;

    expect(hasSignIn).toBe(true);
  });

  test("login page has correct title or heading", async ({ page }) => {
    await page.goto("/login");
    // Page should render without errors
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
