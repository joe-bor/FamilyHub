import { expect, test } from "@playwright/test";
import {
  clearStorage,
  createTestMember,
  seedFamily,
  waitForCalendar,
  waitForHydration,
} from "./helpers/test-helpers";

test.describe("Family Member Management", () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage and seed a family with one member
    await page.goto("/");
    await clearStorage(page);

    // Seed family with one member
    await seedFamily(page, {
      name: "Test Family",
      members: [createTestMember("Alice", "coral")],
    });

    await page.reload();
    await waitForHydration(page);
    await waitForCalendar(page);
  });

  test("opens settings and manages family members", async ({ page }) => {
    // ============================================
    // OPEN SIDEBAR
    // ============================================

    // Click menu button in header
    const menuButton = page.getByRole("button", { name: "Menu" });
    await menuButton.click();

    // Wait for sidebar to appear
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    // Verify family members are shown in sidebar
    await expect(sidebar.getByText("Alice")).toBeVisible();

    // ============================================
    // OPEN FAMILY SETTINGS
    // ============================================

    // Click Family Settings button
    await page.getByRole("button", { name: "Family Settings" }).click();

    // Wait for Family Settings modal
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Family Settings" }),
    ).toBeVisible();

    // Verify Alice is shown in the member list (scope to dialog)
    await expect(dialog.getByText("Alice")).toBeVisible();

    // ============================================
    // ADD NEW MEMBER
    // ============================================

    // Click Add button
    await page.getByRole("button", { name: "Add" }).click();

    // Wait for member form modal - it's a nested dialog
    const memberFormHeading = page.getByRole("heading", {
      name: "Add Family Member",
    });
    await expect(memberFormHeading).toBeVisible();

    // Fill in member details - use placeholder to target the right input
    await page.getByPlaceholder("Enter name").fill("Bob");

    // Select teal color
    await page.getByRole("button", { name: /select teal color/i }).click();

    // Submit the form
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // Wait for modal to close
    await expect(memberFormHeading).toBeHidden();

    // Verify Bob appears in the member list (scope to dialog)
    await expect(
      page.getByRole("heading", { name: "Family Settings" }),
    ).toBeVisible();
    await expect(dialog.getByText("Bob")).toBeVisible();

    // ============================================
    // EDIT MEMBER
    // ============================================

    // Click edit button for Bob
    await page.getByRole("button", { name: "Edit Bob" }).click();

    // Wait for edit modal
    const editFormHeading = page.getByRole("heading", {
      name: "Edit Family Member",
    });
    await expect(editFormHeading).toBeVisible();

    // Verify name is pre-filled - use placeholder to target right input
    const nameInput = page.getByPlaceholder("Enter name");
    await expect(nameInput).toHaveValue("Bob");

    // Change name to Robert
    await nameInput.clear();
    await nameInput.fill("Robert");

    // Save changes
    await page.getByRole("button", { name: "Save" }).click();

    // Wait for modal to close and animation to complete
    await expect(editFormHeading).toBeHidden();

    // Wait for the edit button to update (confirms state propagation)
    await expect(
      page.getByRole("button", { name: "Edit Robert" }),
    ).toBeVisible();

    // Verify Bob is no longer in the list
    await expect(page.getByRole("button", { name: "Edit Bob" })).toBeHidden();

    // ============================================
    // REMOVE MEMBER (can only remove if > 1 member)
    // ============================================

    // Now we have Alice and Robert, so we can remove Robert
    await page.getByRole("button", { name: "Remove Robert" }).click();

    // Verify Robert is removed
    await expect(
      page.getByRole("button", { name: "Edit Robert" }),
    ).toBeHidden();

    // Alice should still be there
    await expect(
      page.getByRole("button", { name: "Edit Alice" }),
    ).toBeVisible();

    // ============================================
    // CLOSE SETTINGS
    // ============================================

    // Close the settings modal
    const closeButton = page.getByRole("button", { name: "Close" });
    await closeButton.click();

    // Wait for dialog close animation to complete
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10000 });

    // Verify we're back to the main app
    await expect(page.getByRole("button", { name: "Add event" })).toBeVisible();
  });
});
