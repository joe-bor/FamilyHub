import { expect, test } from "@playwright/test";
import {
  clearStorage,
  seedAuth,
  waitForCalendar,
  waitForHydration,
} from "./helpers/test-helpers";

test.describe("First-Time User Onboarding", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state - no existing family data
    await page.goto("/");
    await clearStorage(page);
    // Seed auth token to bypass login screen
    await seedAuth(page);
    await page.reload();
    await waitForHydration(page);
  });

  test("completes full onboarding flow and persists data", async ({ page }) => {
    // Step 1: Welcome screen
    await expect(
      page.getByRole("heading", { name: "Welcome to FamilyHub" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Get Started" }),
    ).toBeVisible();

    // Verify welcome features are shown
    await expect(page.getByText("Shared Calendar")).toBeVisible();
    await expect(page.getByText("Family Profiles")).toBeVisible();

    // Click to proceed
    await page.getByRole("button", { name: "Get Started" }).click();

    // Step 2: Family Name (Step 1 of 3)
    await expect(
      page.getByRole("heading", { name: /family name/i }),
    ).toBeVisible();
    await expect(page.getByText("Step 1 of 3")).toBeVisible();

    // Enter family name
    const familyNameInput = page.getByPlaceholder("The Smiths");
    await familyNameInput.fill("The Johnsons");

    // Click continue
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: Members (Step 2 of 3)
    await expect(
      page.getByRole("heading", { name: /who's in your family/i }),
    ).toBeVisible();
    await expect(page.getByText("Step 2 of 3")).toBeVisible();

    // Continue should be disabled (no members yet)
    const continueButton = page.getByRole("button", { name: "Continue" });
    await expect(continueButton).toBeDisabled();

    // Click Add Family Member
    await page.getByRole("button", { name: "Add Family Member" }).click();

    // Wait for modal
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Add Family Member" }),
    ).toBeVisible();

    // Fill member name
    await page.getByLabel("Name").fill("Alice");

    // Select coral color
    await page.getByRole("button", { name: /select coral color/i }).click();

    // Submit the form
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // Wait for modal to close
    await expect(page.getByRole("dialog")).toBeHidden();

    // Verify member card appears
    await expect(page.getByText("Alice")).toBeVisible();

    // Continue should now be enabled
    await expect(continueButton).toBeEnabled();

    // Click Continue to go to credentials step
    await continueButton.click();

    // Step 4: Credentials (Step 3 of 3)
    await expect(
      page.getByRole("heading", { name: /create your login/i }),
    ).toBeVisible();
    await expect(page.getByText("Step 3 of 3")).toBeVisible();

    // Fill in credentials
    await page.getByLabel("Username").fill("testuser");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm Password").fill("password123");

    // Click Complete Setup
    await page.getByRole("button", { name: "Complete Setup" }).click();

    // Verify main app is showing
    // On mobile, this shows home dashboard first; on desktop, shows calendar
    // waitForCalendar handles both cases by navigating from home if needed
    await waitForCalendar(page);

    // Verify family name appears in header
    await expect(page.getByText("The Johnsons")).toBeVisible();

    // Step 4: Verify persistence on reload
    await page.reload();
    await waitForHydration(page);

    // Should still be on main app (not onboarding)
    // On mobile, this will be home dashboard; waitForCalendar handles it
    await waitForCalendar(page);

    // Family name should still be visible
    await expect(page.getByText("The Johnsons")).toBeVisible();

    // Onboarding welcome should NOT be visible
    await expect(
      page.getByRole("heading", { name: "Welcome to FamilyHub" }),
    ).not.toBeVisible();
  });
});
