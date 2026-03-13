import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  chooseScopeAndConfirm,
  clearStorage,
  createEvent,
  navigateDay,
  openEventDetail,
  waitForCalendarReady,
  waitForDialogClosed,
  waitForHydration,
} from "./helpers/test-helpers";

test.describe("Recurring Events", () => {
  test.beforeEach(async ({ page, request }) => {
    await page.goto("/");
    await clearStorage(page);

    const reg = await registerFamily(request, {
      familyName: "Test Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    await seedBrowserAuth(page, reg);

    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);

    // Ensure we start in daily view
    const viewSwitcher = page.getByTestId("view-switcher");
    await viewSwitcher.locator("button").nth(0).click();
    await page.waitForTimeout(200);
  });

  test("creates daily recurring event and verifies instances on consecutive days", async ({
    page,
  }) => {
    await createEvent(page, {
      title: "Daily Standup",
      recurrence: { frequency: "daily" },
    });

    // Verify visible today
    await expect(page.getByText("Daily Standup")).toBeVisible();

    // Navigate forward 1 day — should still be visible
    await navigateDay(page, "next");
    await expect(page.getByText("Daily Standup")).toBeVisible();

    // Navigate forward 1 more day — still visible
    await navigateDay(page, "next");
    await expect(page.getByText("Daily Standup")).toBeVisible();

    // Open detail modal and verify recurrence label
    const dialog = await openEventDetail(page, "Daily Standup");
    await expect(dialog.getByText("Daily")).toBeVisible();
  });

  test("creates weekly recurring event with custom days and verifies placement", async ({
    page,
  }) => {
    await createEvent(page, {
      title: "Gym",
      recurrence: { frequency: "weekly-custom", customDays: ["MO", "WE"] },
    });

    // Switch to weekly view to verify day-column placement
    const viewSwitcher = page.getByTestId("view-switcher");
    await viewSwitcher.locator("button").nth(1).click();

    // Navigate to ensure we're on a week that includes the event
    // The event was created today, so current week should show it
    await expect(page.getByText("Gym").first()).toBeVisible({ timeout: 10000 });

    // Open detail modal and verify recurrence label shows weekday names
    const dialog = await openEventDetail(page, "Gym");
    await expect(dialog.getByText(/Mon|Wed/)).toBeVisible();
  });

  test("edits single instance without affecting the series", async ({
    page,
  }) => {
    await createEvent(page, {
      title: "Team Standup",
      recurrence: { frequency: "daily" },
    });

    // Click today's instance and open edit
    await openEventDetail(page, "Team Standup");
    await page.getByRole("button", { name: "Edit" }).click();

    // EditScopeDialog should appear
    await expect(page.getByText("Edit recurring event")).toBeVisible();

    // "This event" should be selected by default
    const thisEventRadio = page.getByText("This event");
    await expect(thisEventRadio).toBeVisible();

    // Click OK with "This event" scope
    await chooseScopeAndConfirm(page, "this");

    // Edit form should open — RecurrencePicker should NOT be visible
    await expect(
      page.getByRole("heading", { name: "Edit Event" }),
    ).toBeVisible();
    await expect(page.locator("select")).toBeHidden();

    // Change title
    const titleInput = page.getByLabel("Event Name");
    await titleInput.clear();
    await titleInput.fill("Special Standup");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Verify today shows the edited name
    await expect(page.getByText("Special Standup")).toBeVisible();
    await expect(page.getByText("Team Standup")).not.toBeVisible();

    // Navigate to tomorrow — should still show original name
    await navigateDay(page, "next");
    await expect(page.getByText("Team Standup")).toBeVisible();
    await expect(page.getByText("Special Standup")).not.toBeVisible();
  });

  test("edits all events in a series", async ({ page }) => {
    await createEvent(page, {
      title: "Daily Check-in",
      recurrence: { frequency: "daily" },
    });

    // Click today's instance and edit
    await openEventDetail(page, "Daily Check-in");
    await page.getByRole("button", { name: "Edit" }).click();

    // EditScopeDialog — select "All events"
    await expect(page.getByText("Edit recurring event")).toBeVisible();
    await chooseScopeAndConfirm(page, "all");

    // Edit form should open — RecurrencePicker SHOULD be visible
    await expect(
      page.getByRole("heading", { name: "Edit Event" }),
    ).toBeVisible();
    await expect(page.locator("select")).toBeVisible();

    // Change title
    const titleInput = page.getByLabel("Event Name");
    await titleInput.clear();
    await titleInput.fill("Daily Sync");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Verify today shows updated name
    await expect(page.getByText("Daily Sync")).toBeVisible();

    // Navigate to tomorrow — should also show updated name
    await navigateDay(page, "next");
    await expect(page.getByText("Daily Sync")).toBeVisible();
  });

  test("deletes single instance, then deletes entire series", async ({
    page,
  }) => {
    await createEvent(page, {
      title: "Morning Routine",
      recurrence: { frequency: "daily" },
    });

    // ===== Part A: Delete this event =====

    await openEventDetail(page, "Morning Routine");

    // Delete flow: Delete button → confirmation → "Delete Event" → scope dialog
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(
      page.getByText("Are you sure you want to delete this event?"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete Event" }).click();

    // EditScopeDialog should appear for recurring event
    await expect(page.getByText("Delete recurring event")).toBeVisible();
    await chooseScopeAndConfirm(page, "this");

    // Wait for dialogs to close
    await waitForDialogClosed(page);

    // Verify today no longer shows the event
    await expect(page.getByText("Morning Routine")).not.toBeVisible();

    // Navigate to tomorrow — should still exist
    await navigateDay(page, "next");
    await expect(page.getByText("Morning Routine")).toBeVisible();

    // ===== Part B: Delete all events =====

    await openEventDetail(page, "Morning Routine");
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(
      page.getByText("Are you sure you want to delete this event?"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete Event" }).click();

    // Scope dialog — select "All events"
    await expect(page.getByText("Delete recurring event")).toBeVisible();
    await chooseScopeAndConfirm(page, "all");
    await waitForDialogClosed(page);

    // Verify tomorrow no longer shows the event
    await expect(page.getByText("Morning Routine")).not.toBeVisible();

    // Navigate to day after — also gone
    await navigateDay(page, "next");
    await expect(page.getByText("Morning Routine")).not.toBeVisible();
  });

  test("creates monthly recurring event and verifies next month instance", async ({
    page,
  }) => {
    await createEvent(page, {
      title: "Rent Payment",
      recurrence: { frequency: "monthly" },
    });

    // Verify visible today
    await expect(page.getByText("Rent Payment")).toBeVisible();

    // Switch to monthly view
    const viewSwitcher = page.getByTestId("view-switcher");
    await viewSwitcher.locator("button").nth(2).click();
    await page.waitForTimeout(300);

    // Navigate to next month
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForTimeout(300);

    // Verify event appears in next month on the same date
    await expect(page.getByText("Rent Payment").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("creates all-day recurring event with custom interval", async ({
    page,
  }) => {
    await createEvent(page, {
      title: "Sprint Review",
      allDay: true,
      recurrence: { frequency: "daily", interval: 2 },
    });

    // Verify visible today
    await expect(page.getByText("Sprint Review")).toBeVisible();

    // Open detail modal and check labels
    const dialog = await openEventDetail(page, "Sprint Review");
    await expect(dialog.getByText("All day")).toBeVisible();
    await expect(dialog.getByText(/Every 2 days/)).toBeVisible();

    // Close detail modal
    await page.keyboard.press("Escape");
    await waitForDialogClosed(page);

    // Navigate forward 1 day — should NOT be visible (every 2 days)
    await navigateDay(page, "next");
    await expect(page.getByText("Sprint Review")).not.toBeVisible();

    // Navigate forward 1 more day — should be visible again
    await navigateDay(page, "next");
    await expect(page.getByText("Sprint Review")).toBeVisible();
  });

  test("creates recurring event with end date", async ({ page }) => {
    // Calculate an end date 2 days from now
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 2);

    await createEvent(page, {
      title: "Workshop",
      recurrence: { frequency: "daily", endDate },
    });

    // Verify visible today
    await expect(page.getByText("Workshop")).toBeVisible();

    // Navigate to tomorrow — should be visible
    await navigateDay(page, "next");
    await expect(page.getByText("Workshop")).toBeVisible();

    // Navigate past the end date (2 more days forward, 3 total from today)
    await navigateDay(page, "next", 2);
    await expect(page.getByText("Workshop")).not.toBeVisible();
  });
});
