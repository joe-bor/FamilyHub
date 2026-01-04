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
 */
export async function waitForCalendar(page: Page): Promise<void> {
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
 * Wait for Radix UI dialog animations to complete.
 * WebKit renders animations asynchronously unlike Chromium,
 * causing flaky tests when checking dialog visibility immediately.
 */
export async function waitForDialogAnimation(page: Page): Promise<void> {
  await page.waitForTimeout(300); // 200ms animation + 100ms buffer
}
