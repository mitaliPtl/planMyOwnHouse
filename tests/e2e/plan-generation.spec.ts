import { test, expect } from "@playwright/test";

import { createVerifiedCustomer, deleteUserByEmail } from "./helpers/db";

const PASSWORD = "correct-horse-battery-42";

test.describe("Plot, rooms, and 2D plan generation", () => {
  test("a customer can set plot details, select rooms, and generate a 2D plan", async ({ page }) => {
    const email = `e2e-plan-${Date.now()}@example.com`;
    await createVerifiedCustomer(email, PASSWORD);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/projects/new");
    const projectName = `E2E Plan House ${Date.now()}`;
    await page.getByLabel("Project name").fill(projectName);
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);
    const projectUrl = page.url();
    const projectId = projectUrl.split("/").pop();

    // Step 1: Plot Details
    await page.getByRole("link", { name: /Plot Details/i }).click();
    await expect(page).toHaveURL(/\/plot$/);
    await page.getByLabel("Width").fill("30");
    await page.getByLabel("Length").fill("50");
    await page.getByLabel("Number of floors").fill("1");
    await page.getByLabel("Road side").selectOption("North");
    await page.getByLabel("Main door direction").selectOption("East");

    // The preview should reflect the selected main door direction immediately.
    await expect(page.getByText("Main Door", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Save & continue" }).click();

    // Save & continue navigates to /rooms
    await expect(page).toHaveURL(/\/rooms$/);

    // Going back to Plot Details should show the saved main door direction persisted.
    await page.goto(`${projectUrl}/plot`);
    await expect(page.getByLabel("Main door direction")).toHaveValue("East");
    await expect(page.getByText("Main Door", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save & continue" }).click();
    await expect(page).toHaveURL(/\/rooms$/);

    // Step 2: Requirements & Room Settings
    const bedroomCard = page.locator("div").filter({ hasText: /^Bedroommin/ }).first();
    await bedroomCard.getByRole("checkbox").first().click();
    const kitchenCard = page.locator("div").filter({ hasText: /^Kitchenmin/ }).first();
    await kitchenCard.getByRole("checkbox").first().click();
    await page.getByRole("button", { name: "Save & continue" }).click();

    // Save & continue navigates to /plan
    await expect(page).toHaveURL(/\/plan$/);

    // Step 3: Generate the 2D plan
    await page.getByRole("button", { name: "Generate 2D plan" }).click();
    await expect(page.getByText("Plan version 1.")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Bedroom").first()).toBeVisible();
    await expect(page.getByText("Kitchen").first()).toBeVisible();

    // The generated plan's entrance should honor the main door direction (East) picked
    // on the Plot Details step, not just the plot preview.
    await expect(page.getByText("Main Entrance", { exact: true })).toBeVisible();

    // Regeneration bumps the version
    await page.getByRole("button", { name: "Regenerate plan" }).click();
    await expect(page.getByText("Plan version 2.")).toBeVisible({ timeout: 10_000 });

    // Back on the project detail page, all three real steps should now show done.
    await page.goto(`/projects/${projectId}`);
    const workflowItems = page.locator("ol li");
    await expect(workflowItems.filter({ hasText: "Plot Details" })).not.toContainText("Soon");
    await expect(
      workflowItems.filter({ hasText: "Requirements & Room Settings" })
    ).not.toContainText("Soon");
    await expect(workflowItems.filter({ hasText: "2D Plan" })).not.toContainText("Soon");

    await deleteUserByEmail(email);
  });
});
