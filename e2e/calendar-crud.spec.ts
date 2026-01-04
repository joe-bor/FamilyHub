import { expect, test } from "@playwright/test";
import {
  clearStorage,
  createTestMember,
  seedFamily,
  waitForCalendar,
  waitForDialogOpen,
  waitForHydration,
} from "./helpers/test-helpers";

test.describe("Calendar Event CRUD", () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage and seed a family
    await page.goto("/");
    await clearStorage(page);

    // Seed family with one member
    await seedFamily(page, {
      name: "Test Family",
      members: [createTestMember("Alice", "coral")],
    });

    // Navigate and wait for app
    await page.reload();
    await waitForHydration(page);
    await waitForCalendar(page);
  });

  test("creates, views, edits, and deletes an event", async ({ page }) => {
    // ============================================
    // CREATE EVENT
    // ============================================

    // Click the floating Add Event button
    await page.getByRole("button", { name: "Add event" }).click();

    // Wait for Add Event modal
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Add Event" }),
    ).toBeVisible();

    // Fill in the event title
    await page.getByLabel("Event Name").fill("Team Meeting");

    // Submit the form (date, time, and member are pre-filled with smart defaults)
    await page.getByRole("button", { name: "Add Event" }).click();

    // Wait for modal to close
    await expect(page.getByRole("dialog")).toBeHidden();

    // Verify event appears on calendar
    await expect(page.getByText("Team Meeting")).toBeVisible();

    // ============================================
    // VIEW EVENT DETAILS
    // ============================================

    // Click on the event card to open detail modal
    const eventCard = page
      .getByRole("button", { name: /Team Meeting/ })
      .first();
    await eventCard.waitFor({ state: "visible" });
    await eventCard.click({ force: true });

    // Wait for dialog to fully open
    await waitForDialogOpen(page);

    // Verify event title in modal
    await expect(
      page.getByRole("heading", { name: "Team Meeting" }),
    ).toBeVisible();

    // Verify member is shown (scope to dialog to avoid matching filter pills)
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Alice")).toBeVisible();

    // ============================================
    // EDIT EVENT
    // ============================================

    // Click Edit button
    await page.getByRole("button", { name: "Edit" }).click();

    // Wait for edit modal to appear
    await expect(
      page.getByRole("heading", { name: "Edit Event" }),
    ).toBeVisible();

    // Verify title is pre-filled
    const titleInput = page.getByLabel("Event Name");
    await expect(titleInput).toHaveValue("Team Meeting");

    // Change the title
    await titleInput.clear();
    await titleInput.fill("Updated Meeting");

    // Save changes
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Wait for modal to close
    await expect(page.getByRole("dialog")).toBeHidden();

    // Verify updated title appears on calendar
    await expect(page.getByText("Updated Meeting")).toBeVisible();
    await expect(page.getByText("Team Meeting")).not.toBeVisible();

    // ============================================
    // DELETE EVENT
    // ============================================

    // Click on the event card again
    const updatedCard = page
      .getByRole("button", { name: /Updated Meeting/ })
      .first();
    await updatedCard.waitFor({ state: "visible" });
    await updatedCard.click({ force: true });

    // Wait for dialog to fully open
    await waitForDialogOpen(page);
    await expect(
      page.getByRole("heading", { name: "Updated Meeting" }),
    ).toBeVisible();

    // Click Delete button
    await page.getByRole("button", { name: "Delete" }).click();

    // Verify confirmation message appears
    await expect(
      page.getByText("Are you sure you want to delete this event?"),
    ).toBeVisible();

    // Confirm deletion
    await page.getByRole("button", { name: "Delete Event" }).click();

    // Wait for modal to close
    await expect(page.getByRole("dialog")).toBeHidden();

    // Verify event is removed from calendar
    await expect(page.getByText("Updated Meeting")).not.toBeVisible();
  });
});
