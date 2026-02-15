import { expect, type Locator, type Page } from "@playwright/test";
import type { FamilyColor, FamilyMember } from "../../src/lib/types/family";

/**
 * Family data structure matching Zustand persist format
 */
interface FamilyStorageData {
  state: {
    family: {
      id: string;
      name: string;
      members: FamilyMember[];
      createdAt: string;
    } | null;
    _hasHydrated: boolean;
  };
  version: number;
}

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
 * Seed authentication token to bypass login screen.
 * Must be called after page.goto() but before reload/navigation.
 */
export async function seedAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Mock JWT token - the app only checks for token existence, not validity
    const mockToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE3MDAwMDAwMDB9.mock";
    localStorage.setItem("family-hub-auth-token", mockToken);
  });
}

/**
 * Seed family data into localStorage
 * This bypasses onboarding for tests that need an existing family
 */
export async function seedFamily(
  page: Page,
  options: {
    name: string;
    members: FamilyMember[];
  },
): Promise<void> {
  const familyData: FamilyStorageData = {
    state: {
      family: {
        id: `test-family-${Date.now()}`,
        name: options.name,
        members: options.members,
        createdAt: new Date().toISOString(),
      },
      _hasHydrated: true,
    },
    version: 0,
  };

  await page.evaluate((data) => {
    localStorage.setItem("family-hub-family", JSON.stringify(data));
  }, familyData);
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

  // Ensure Radix has finished mounting by checking data-state
  await page.waitForSelector('[data-state="open"]', { state: "attached" });

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
