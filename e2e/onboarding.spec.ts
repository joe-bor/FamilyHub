import { expect, test } from "@playwright/test";
import {
  clearStorage,
  waitForCalendar,
  waitForHydration,
} from "./helpers/test-helpers";

test.describe("First-Time User Onboarding", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state - no existing family data
    await page.goto("/");
    await clearStorage(page);
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

    // Step 2: Family Name
    await expect(
      page.getByRole("heading", { name: /family name/i }),
    ).toBeVisible();
    await expect(page.getByText("Step 1 of 2")).toBeVisible();

    // Enter family name
    const familyNameInput = page.getByPlaceholder("The Smiths");
    await familyNameInput.fill("The Johnsons");

    // Click continue
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: Members
    await expect(
      page.getByRole("heading", { name: /who's in your family/i }),
    ).toBeVisible();
    await expect(page.getByText("Step 2 of 2")).toBeVisible();

    // Complete Setup should be disabled (no members yet)
    const completeButton = page.getByRole("button", { name: "Complete Setup" });
    await expect(completeButton).toBeDisabled();

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

    // Complete Setup should now be enabled
    await expect(completeButton).toBeEnabled();

    // Click Complete Setup
    await completeButton.click();

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
