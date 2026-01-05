import type { Page } from "@playwright/test";
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
      setupComplete: boolean;
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
        setupComplete: true,
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
 * Wait for the calendar module to be fully loaded
 * The FAB (Add event button) is a reliable indicator
 *
 * On mobile (<640px), the app starts on home dashboard,
 * so we need to navigate to calendar first.
 */
export async function waitForCalendar(page: Page): Promise<void> {
  // Check if we're on the mobile home dashboard by looking for the "Home" heading
  const homeHeading = page.getByRole("heading", { name: "Home", level: 1 });
  const isOnHomeDashboard = await homeHeading.isVisible().catch(() => false);

  if (isOnHomeDashboard) {
    // We're on mobile home dashboard - click Calendar card to navigate
    // Use the button within main content area (not nav tabs)
    await page
      .locator("main")
      .getByRole("button", { name: "Calendar" })
      .click();
  }

  // Now wait for calendar to load
  await page
    .getByRole("button", { name: "Add event" })
    .waitFor({ state: "visible", timeout: 10000 });
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
 * Wait for a Radix dialog to fully open.
 * Uses data-state attribute which is deterministic.
 * In CI with reducedMotion, animations are instant.
 */
export async function waitForDialogOpen(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible" });
  // Ensure Radix has finished mounting by checking data-state
  await page.waitForSelector('[data-state="open"]', { state: "attached" });
}

/**
 * Wait for all dialogs to close.
 * Uses role selector which is more reliable than data-state for closed state.
 */
export async function waitForDialogClosed(page: Page): Promise<void> {
  await page.getByRole("dialog").waitFor({ state: "hidden" });
}

/**
 * Legacy helper - kept for backwards compatibility during transition.
 * With reducedMotion in CI, this is effectively instant.
 * Locally, we wait for the data-state to confirm the dialog is ready.
 * @deprecated Use waitForDialogOpen or waitForDialogClosed instead
 */
export async function waitForDialogAnimation(page: Page): Promise<void> {
  // Wait for data-state="open" which indicates Radix has mounted
  await page
    .waitForSelector('[data-state="open"]', {
      state: "attached",
      timeout: 5000,
    })
    .catch(() => {
      // Dialog might already be open or closing - that's fine
    });
}
