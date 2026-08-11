import { test, expect } from "@playwright/test";

import { createVerifiedCustomer, deleteUserByEmail } from "./helpers/db";

const PASSWORD = "correct-horse-battery-42";

test.describe("Dashboard & project shell", () => {
  test("unauthenticated users are redirected away from /dashboard and /projects", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a logged-in user can create a project, see it on the dashboard, and the in-app logo stays inside the app", async ({
    page,
  }) => {
    const email = `e2e-project-${Date.now()}@example.com`;
    await createVerifiedCustomer(email, PASSWORD);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome back, Project Test User!" })
    ).toBeVisible();
    await expect(page.getByText("You haven't created a project yet.")).toBeVisible();

    await page.getByRole("link", { name: "Create your first plan" }).click();
    await expect(page).toHaveURL(/\/projects\/new/);

    const projectName = `E2E House ${Date.now()}`;
    await page.getByLabel("Project name").fill(projectName);
    await page.getByLabel("City").fill("Ahmedabad");
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);
    // CardTitle renders a styled <div>, not a semantic heading — match by text.
    await expect(page.getByText(projectName, { exact: true })).toBeVisible();
    await expect(page.getByText("Ahmedabad")).toBeVisible();

    // The dashboard shell's logo must stay inside the authenticated app (not bounce
    // out to the public landing page and look like a logout) — this is the exact
    // regression this phase's shell replaced the old header for.
    await page.getByRole("link", { name: "planMyOwnHouse" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(projectName, { exact: true })).toBeVisible();

    await page.goto("/projects");
    await expect(page.getByText(projectName, { exact: true })).toBeVisible();

    await deleteUserByEmail(email);
  });

  test("editing a project returns to the read-only view with the saved changes, not a stuck form", async ({
    page,
  }) => {
    const email = `e2e-edit-${Date.now()}@example.com`;
    await createVerifiedCustomer(email, PASSWORD);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const projectName = `E2E Edit House ${Date.now()}`;
    await page.goto("/projects/new");
    await page.getByLabel("Project name").fill(projectName);
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);

    // Editing on /projects/[id] used to router.push() back to that exact same URL,
    // which the App Router treats as a no-op — the form's local "isEditing" state
    // never reset, so a successful save left the form stuck on screen looking
    // unsaved even though the PATCH had already gone through.
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByText("Edit project", { exact: true })).toBeVisible();

    await page.getByLabel("Description").fill("Updated description");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Edit project", { exact: true })).toBeHidden();
    await expect(page.getByText("Updated description")).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);

    // Reload from the server to confirm the save actually persisted, not just local state.
    await page.reload();
    await expect(page.getByText("Updated description")).toBeVisible();

    await deleteUserByEmail(email);
  });
});
