import { test, expect } from "@playwright/test";

/**
 * Covers the UI-reachable parts of the auth flow without a database dependency:
 * signup, the "email not verified" login guard, and the generic forgot-password
 * response. The token-based verify/reset steps (which require reading the
 * ConsoleEmailProvider's logged link) are covered by the manual click-through in the
 * plan's verification steps — see docs/roadmap.md for where a DB-backed integration
 * test for the full loop belongs (Phase 3+ tests/integration).
 */
test.describe("Customer authentication", () => {
  test("landing page shows the primary CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Design Your Dream Home, Your Way" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Create Your Plan" }).first()).toBeVisible();
  });

  test("a new customer can sign up and is guided to verify their email before logging in", async ({
    page,
  }) => {
    const uniqueEmail = `e2e-${Date.now()}@example.com`;

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("E2E Test User");
    await page.getByLabel("Email").fill(uniqueEmail);
    // The "Password"/"Confirm password" labels carry a decorative required-asterisk
    // that Playwright's getByLabel folds into the matched text even though it's
    // aria-hidden, so id-based locators are the reliable way to target them.
    await page.locator("#password").fill("correct-horse-battery-42");
    await page.locator("#confirmPassword").fill("correct-horse-battery-42");
    // Not getByText: the "I agree to the" text sits in the same wrapping <label> as
    // the "Terms & Conditions" link, so a text click can land on the link and
    // navigate away. The checkbox role is unambiguous.
    await page.getByRole("checkbox").click();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/login\?verified=pending/);

    await page.getByLabel("Email").fill(uniqueEmail);
    await page.locator("#password").fill("correct-horse-battery-42");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText(/verify your email/i)).toBeVisible();
  });

  test("forgot password always shows a generic confirmation", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("nobody-in-particular@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(page.getByText(/we've sent a password reset link/i)).toBeVisible();
  });

  test("unauthenticated users are redirected away from /profile", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
  });
});
