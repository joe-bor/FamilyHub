import { expect, type Locator, type Page } from "@playwright/test";
import type { FamilyColor, FamilyMember } from "../../src/lib/types/family";

/**
 * Clear all localStorage to ensure clean test state
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Wait for app hydration (Zustand rehydrates from localStorage)
 * The app shows "Loading..." while hydrating
 */
export async function waitForHydration(page: Page): Promise<void> {
  // Wait for any loading state to disappear
  // Use a short timeout since hydration is usually fast
  await page
    .getByText("Loading...")
    .waitFor({ state: "hidden", timeout: 5000 })
    .catch(() => {
      // Loading might already be gone, that's fine
    });
}

/**
 * Create default test members for seeding
 */
export function createTestMembers(): FamilyMember[] {
  return [
    { id: "member-alice", name: "Alice", color: "coral" },
    { id: "member-bob", name: "Bob", color: "teal" },
  ];
}

/**
 * Create a single test member
 */
export function createTestMember(
  name: string,
  color: FamilyColor,
  id?: string,
): FamilyMember {
  return {
    id: id || `member-${name.toLowerCase()}`,
    name,
    color,
  };
}

/**
 * Get today's date formatted as yyyy-MM-dd
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Wait for all dialogs to close.
 * Uses role selector which is more reliable than data-state for closed state.
 */
export async function waitForDialogClosed(page: Page): Promise<void> {
  await page.getByRole("dialog").waitFor({ state: "hidden" });
}

/**
 * Robust click that handles common flakiness issues.
 * - Waits for element to be visible with auto-retry
 * - Scrolls element to center to avoid sticky header interception
 * - Uses force:true for reliability in CI environments
 */
export async function safeClick(
  locator: Locator,
  options?: { timeout?: number },
): Promise<void> {
  const timeout = options?.timeout ?? 10000;

  // Wait for element to be visible with auto-retry
  await expect(locator).toBeVisible({ timeout });

  // Scroll element into view at center to avoid sticky headers
  await locator.scrollIntoViewIfNeeded();

  // Use force:true to bypass interception checks (reliable in CI)
  await locator.click({ force: true });
}

/**
 * Enhanced dialog wait that returns the dialog locator for chaining.
 * - Checks visibility with expect() auto-retry
 * - Confirms data-state="open" attribute
 * - Returns the dialog locator for scoped queries
 */
export async function waitForDialogReady(page: Page): Promise<Locator> {
  const dialog = page.getByRole("dialog");

  // Use expect with auto-retry for better CI stability
  await expect(dialog).toBeVisible({ timeout: 10000 });

  // Ensure Radix has finished mounting — scoped to the dialog, not page-wide
  await expect(dialog).toHaveAttribute("data-state", "open", { timeout: 5000 });

  return dialog;
}

/**
 * Enhanced calendar ready check that replaces networkidle with more reliable indicators.
 * Handles mobile home dashboard navigation and waits for multiple UI indicators.
 */
export async function waitForCalendarReady(page: Page): Promise<void> {
  // Check if we're on the mobile home dashboard
  const homeHeading = page.getByRole("heading", { name: "Home", level: 1 });
  const isOnHomeDashboard = await homeHeading.isVisible().catch(() => false);

  if (isOnHomeDashboard) {
    // Navigate to calendar from mobile home dashboard
    await page
      .locator("main")
      .getByRole("button", { name: "Calendar" })
      .click();
  }

  // Wait for primary calendar indicator (Add event FAB)
  const addButton = page.getByRole("button", { name: "Add event" });
  await expect(addButton).toBeVisible({ timeout: 10000 });

  // Wait for secondary indicator (view switcher)
  const viewSwitcher = page.getByTestId("view-switcher");
  await expect(viewSwitcher).toBeVisible({ timeout: 5000 });

  // Brief stability wait instead of unreliable networkidle
  // This allows React to finish any pending state updates
  await page.waitForTimeout(100);
}

/**
 * Options for creating an event via the Add Event modal.
 */
interface CreateEventOptions {
  title: string;
  recurrence?: {
    frequency: "daily" | "weekly-on-day" | "weekly-custom" | "monthly";
    customDays?: string[];
    interval?: number;
    endDate?: Date;
  };
  allDay?: boolean;
}

/**
 * Opens the Add Event modal, fills in event details, and submits.
 * Waits for modal to close after successful submission.
 */
export async function createEvent(
  page: Page,
  options: CreateEventOptions,
): Promise<void> {
  await page.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByLabel("Event Name").fill(options.title);

  // Toggle all-day if requested (before recurrence, since form order matters)
  if (options.allDay) {
    await page.getByRole("switch").click();
  }

  // Set recurrence if requested
  if (options.recurrence) {
    const select = page.locator("select");
    await select.selectOption(options.recurrence.frequency);

    // Toggle custom day buttons
    if (
      options.recurrence.frequency === "weekly-custom" &&
      options.recurrence.customDays
    ) {
      for (const day of options.recurrence.customDays) {
        await page.getByRole("button", { name: day, exact: true }).click();
      }
    }

    // Set custom interval
    if (options.recurrence.interval) {
      const spinbutton = page.getByRole("spinbutton");
      await spinbutton.clear();
      await spinbutton.fill(String(options.recurrence.interval));
    }

    // Set end date
    if (options.recurrence.endDate) {
      await page.getByText("On date").click();
      // The DatePicker for end date appears — find it by placeholder
      const endDatePicker = page.getByPlaceholder("Pick end date");
      await endDatePicker.click();
      // Select the day in the calendar popover
      const dayNum = options.recurrence.endDate.getDate();
      // Use the calendar grid to pick the specific day
      await page
        .getByRole("gridcell", { name: String(dayNum), exact: true })
        .click();
    }
  }

  await page.getByRole("button", { name: "Add Event" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

/**
 * Navigates forward or backward in daily calendar view by clicking
 * the Next/Previous button the specified number of times.
 */
export async function navigateDay(
  page: Page,
  direction: "next" | "prev",
  count = 1,
): Promise<void> {
  const buttonName = direction === "next" ? "Next" : "Previous";
  for (let i = 0; i < count; i++) {
    await page.getByRole("button", { name: buttonName }).click();
    // Allow calendar to settle between clicks
    await page.waitForTimeout(200);
  }
}

/**
 * Clicks an event card by name and waits for the detail dialog to open.
 * Returns the dialog locator for scoped queries.
 */
export async function openEventDetail(
  page: Page,
  eventName: string,
): Promise<Locator> {
  const eventCard = page
    .getByRole("button", { name: new RegExp(eventName) })
    .first();
  await safeClick(eventCard);
  return waitForDialogReady(page);
}

/**
 * In the EditScopeDialog, selects a scope radio and clicks OK.
 * Waits for the scope dialog to close.
 */
export async function chooseScopeAndConfirm(
  page: Page,
  scope: "this" | "all",
): Promise<void> {
  // Wait for scope dialog to be visible
  const scopeText = scope === "this" ? "This event" : "All events";
  await expect(page.getByText(scopeText)).toBeVisible();
  await page.getByText(scopeText).click();
  await page.getByRole("button", { name: "OK" }).click();
  // Brief wait for scope dialog transition
  await page.waitForTimeout(300);
}
