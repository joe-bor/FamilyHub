import { expect, test } from "@playwright/test";
import {
  clearStorage,
  createTestMember,
  seedFamily,
  waitForCalendar,
  waitForHydration,
} from "./helpers/test-helpers";

test.describe("Calendar View Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage and seed a family with 2 members for filtering
    await page.goto("/");
    await clearStorage(page);

    // Seed family with two members
    await seedFamily(page, {
      name: "Test Family",
      members: [
        createTestMember("Alice", "coral"),
        createTestMember("Bob", "teal"),
      ],
    });

    await page.reload();
    await waitForHydration(page);
    await waitForCalendar(page);
  });

  test("switches views, navigates dates, and filters members", async ({
    page,
  }) => {
    // ============================================
    // CREATE AN EVENT FOR TESTING FILTERS
    // ============================================

    // Create an event so we can test filtering
    await page.getByRole("button", { name: "Add event" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Event Name").fill("Alice's Task");
    await page.getByRole("button", { name: "Add Event" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Verify event is visible
    await expect(page.getByText("Alice's Task")).toBeVisible();

    // ============================================
    // VIEW SWITCHING
    // ============================================

    // Get the view switcher container
    const viewSwitcher = page.locator(".bg-muted.rounded-lg.p-1");

    // Click Week view (second button)
    await viewSwitcher.locator("button").nth(1).click();

    // Verify we're on weekly view by looking for the week grid structure
    // The weekly view has 7 day columns - use exact match to avoid matching "Month"
    await expect(page.getByText("Mon", { exact: true })).toBeVisible();
    await expect(page.getByText("Tue", { exact: true })).toBeVisible();

    // Click Month view (third button)
    await viewSwitcher.locator("button").nth(2).click();

    // Monthly view shows a calendar grid - look for typical month structure
    // Should have multiple week rows
    await page.waitForTimeout(300); // Allow view transition

    // Click Schedule view (fourth button)
    await viewSwitcher.locator("button").nth(3).click();

    // Schedule view shows a list format
    await page.waitForTimeout(300);

    // Go back to Day view (first button)
    await viewSwitcher.locator("button").nth(0).click();
    await page.waitForTimeout(300);

    // ============================================
    // DATE NAVIGATION
    // ============================================

    // Get the current date label
    const dateLabel = page.locator("h2").first();
    const initialDateText = await dateLabel.textContent();

    // Click Previous button
    await page.getByRole("button", { name: "Previous" }).click();

    // Verify date changed
    const prevDateText = await dateLabel.textContent();
    expect(prevDateText).not.toBe(initialDateText);

    // Click Next button (back to today)
    await page.getByRole("button", { name: "Next" }).click();

    // Click Next again (forward one day)
    await page.getByRole("button", { name: "Next" }).click();

    // Verify date changed again
    const nextDateText = await dateLabel.textContent();
    expect(nextDateText).not.toBe(prevDateText);

    // Click Today button to return
    await page.getByRole("button", { name: "Today" }).click();

    // Verify we're back to today (date should match initial or today's date)
    const todayDateText = await dateLabel.textContent();
    expect(todayDateText).toBe(initialDateText);

    // ============================================
    // MEMBER FILTERING
    // ============================================

    // The event "Alice's Task" should be visible initially
    await expect(page.getByText("Alice's Task")).toBeVisible();

    // Find and click Alice's filter pill to toggle OFF
    // The pill has Alice's name or initial
    const alicePill = page.getByRole("button", { name: /Alice/i }).first();
    await alicePill.click();

    // Wait for filter to apply and verify event is hidden
    await expect(page.getByText("Alice's Task")).toBeHidden();

    // Click Alice's pill again to toggle ON
    await alicePill.click();

    // Verify event reappears
    await expect(page.getByText("Alice's Task")).toBeVisible();

    // Test "All" toggle
    const allToggle = page.getByRole("button", { name: /^(All|Some|None)$/i });
    await allToggle.click();

    // If it was "All", now it's "None" - event should be hidden
    const toggleText = await allToggle.textContent();
    if (toggleText === "None") {
      await expect(page.getByText("Alice's Task")).toBeHidden();
    }

    // Click again to toggle back to All
    await allToggle.click();

    // Verify event is visible
    await expect(page.getByText("Alice's Task")).toBeVisible();
  });
});
