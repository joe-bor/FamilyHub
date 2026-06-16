import { expect, type Locator, type Page } from "@playwright/test";
import { format } from "date-fns";
import {
  OFFLINE_CACHE_DB_NAME,
  OFFLINE_CACHE_KEY,
  OFFLINE_CACHE_STORE_NAME,
} from "../../src/lib/offline/constants";
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
 * Wait until the production service worker is active AND controls the page.
 *
 * Tests that navigate to a never-visited, lazily-loaded module (e.g. Chores)
 * while offline rely on that module's JS chunk being served from the Workbox
 * precache. The chunk is only served once the SW is ACTIVE (precache complete)
 * and controls this page. The PWA ships `skipWaiting` without `clientsClaim`,
 * so a tab opened before the SW activated stays uncontrolled until its next
 * navigation — on slow CI the test can go offline before that happens, the
 * chunk import hits the network, fails, and the app crashes to a blank page.
 *
 * Wait for an active SW (its `ready` promise), then reload once if this page is
 * not yet controlled so the SW serves it — and its offline lazy imports — from
 * cache.
 */
export async function waitForServiceWorkerReady(page: Page): Promise<void> {
  const isControlled = () =>
    page.evaluate(
      () =>
        !("serviceWorker" in navigator) ||
        navigator.serviceWorker.controller != null,
    );

  // Resolves once an active SW exists for this scope (install/precache done).
  await page.evaluate(() => navigator.serviceWorker?.ready);

  if (!(await isControlled())) {
    // Uncontrolled tab (skipWaiting without clientsClaim): a fresh navigation
    // through the now-active SW makes it control the page.
    await page.reload();
    await waitForHydration(page);
    await page.waitForFunction(
      () =>
        !("serviceWorker" in navigator) ||
        navigator.serviceWorker.controller != null,
      undefined,
      { timeout: 10000 },
    );
  }
}

/**
 * Wait until the TanStack Query persister has written the dehydrated read cache
 * to IndexedDB.
 *
 * The persist is throttled (~1s, trailing-edge), so a fixed `waitForTimeout`
 * races the write and can go offline + reload before anything is persisted.
 * Poll the real IndexedDB key instead.
 *
 * The poll never CREATES the database: it gates on `indexedDB.databases()` and
 * checks the object store exists before reading, so it cannot beat idb-keyval
 * to store creation and leave a storeless DB that silently breaks the persister.
 */
export async function waitForOfflineCachePersisted(
  page: Page,
  options?: { timeout?: number },
): Promise<void> {
  const timeout = options?.timeout ?? 5000;
  await expect
    .poll(
      () =>
        page.evaluate(
          ({ dbName, storeName, key }) =>
            new Promise<boolean>((resolve) => {
              if (!indexedDB.databases) {
                resolve(false);
                return;
              }
              indexedDB
                .databases()
                .then((dbs) => {
                  if (!dbs.some((d) => d.name === dbName)) {
                    resolve(false);
                    return;
                  }
                  const req = indexedDB.open(dbName);
                  req.onerror = () => resolve(false);
                  req.onsuccess = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(storeName)) {
                      db.close();
                      resolve(false);
                      return;
                    }
                    const getReq = db
                      .transaction(storeName, "readonly")
                      .objectStore(storeName)
                      .get(key);
                    getReq.onsuccess = () => {
                      resolve(getReq.result !== undefined);
                      db.close();
                    };
                    getReq.onerror = () => {
                      resolve(false);
                      db.close();
                    };
                  };
                })
                .catch(() => resolve(false));
            }),
          {
            dbName: OFFLINE_CACHE_DB_NAME,
            storeName: OFFLINE_CACHE_STORE_NAME,
            key: OFFLINE_CACHE_KEY,
          },
        ),
      { timeout, intervals: [100, 200, 300] },
    )
    .toBe(true);
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
 * Waits for a just-opened sheet/dialog to finish moving into place before
 * interacting with its contents.
 *
 * Mobile sheets (vaul drawers, SideSheet) mount translated off-screen and
 * slide in via a transform. toBeVisible() passes while the panel is still
 * off-viewport, so safeClick's force:true click — which skips Playwright's
 * own stability wait — computes its point against a not-yet-positioned
 * target and misses, or errors with "Element is outside of the viewport"
 * on slow CI runners. Even with reduced motion (instant transitions), vaul
 * positions snap-point drawers from JS after mount, so there is a window
 * where the sheet is visible but still fully below the viewport.
 *
 * Settled means: bounding box overlaps the viewport on both axes AND is
 * unchanged across two consecutive polls. Stability alone is not enough —
 * a pre-positioned sheet is motionless while fully off-viewport. Overlap
 * (rather than fully-inside) is required because half-height vaul sheets
 * rest with their lower half translated below the viewport by design.
 */
export async function waitForSheetSettled(
  sheet: Locator,
  options?: { timeout?: number },
): Promise<void> {
  const timeout = options?.timeout ?? 10000;
  await expect(sheet).toBeVisible({ timeout });

  const viewport = sheet.page().viewportSize();
  let previous: string | null = null;
  await expect
    .poll(
      async () => {
        const box = await sheet.boundingBox();
        if (!box) {
          previous = null;
          return false;
        }
        // Pre-positioned sheets are translated exactly 100% off-screen, so
        // requiring ≥1px of overlap on both axes excludes them.
        const overlapsViewport =
          viewport === null ||
          (box.x + box.width >= 1 &&
            box.x <= viewport.width - 1 &&
            box.y + box.height >= 1 &&
            box.y <= viewport.height - 1);
        const current = [box.x, box.y, box.width, box.height].join(",");
        const settled = overlapsViewport && current === previous;
        previous = current;
        return settled;
      },
      { timeout, intervals: [50, 100] },
    )
    .toBe(true);
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

  // Ensure Radix has finished mounting — only check data-state for Radix dialogs
  // Mobile components (MobileEventSheet, MobileEventDetail) don't use Radix
  const hasDataState = await dialog
    .getAttribute("data-state")
    .catch(() => null);
  if (hasDataState !== null) {
    await expect(dialog).toHaveAttribute("data-state", "open", {
      timeout: 5000,
    });
  }

  return dialog;
}

/**
 * Enhanced calendar ready check that replaces networkidle with more reliable indicators.
 * Handles mobile home dashboard navigation via the existing shell state and
 * waits for multiple UI indicators.
 */
export async function waitForCalendarReady(page: Page): Promise<void> {
  const primaryNav = page.getByRole("navigation", { name: /primary/i });
  const hasMobileNav = await primaryNav
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false);

  if (hasMobileNav) {
    const calendarTab = primaryNav.getByRole("button", { name: "Calendar" });
    const calendarIsActive =
      (await calendarTab.getAttribute("aria-current").catch(() => null)) ===
      "page";

    if (!calendarIsActive) {
      await safeClick(calendarTab);
    }

    await expect(calendarTab).toHaveAttribute("aria-current", "page", {
      timeout: 10000,
    });
  }

  // Wait for primary calendar indicator (Add event FAB)
  const addButton = page.getByRole("button", { name: "Add event" });
  await expect(addButton).toBeVisible({ timeout: 10000 });

  // Wait for secondary indicator — works on both desktop (view-switcher) and mobile (toolbar buttons)
  const viewSwitcher = page.getByTestId("view-switcher");
  const mobileViewButton = page.getByRole("button", { name: /daily view/i });

  // Either desktop or mobile indicator should be visible
  // Use Promise.any to succeed when either resolves (Promise.race rejects on first rejection)
  await Promise.any([
    expect(viewSwitcher).toBeVisible({ timeout: 5000 }),
    expect(mobileViewButton).toBeVisible({ timeout: 5000 }),
  ]);

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
  // Use safeClick for the FAB to handle TanStack Query DevTools overlap
  // when running locally without VITE_E2E=true
  await safeClick(page.getByRole("button", { name: "Add event" }));
  const dialog = page.getByRole("dialog", { name: "Add Event" });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Event Name").fill(options.title);

  // Toggle all-day if requested (before recurrence, since form order matters)
  if (options.allDay) {
    await dialog.getByRole("switch").click();
  }

  // Set recurrence if requested
  if (options.recurrence) {
    const select = dialog.locator("select");
    await select.selectOption(options.recurrence.frequency);

    // Toggle custom day buttons
    if (
      options.recurrence.frequency === "weekly-custom" &&
      options.recurrence.customDays
    ) {
      const desiredDays = new Set(options.recurrence.customDays);
      for (const day of ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]) {
        const dayButton = dialog.getByRole("button", {
          name: day,
          exact: true,
        });
        const isPressed =
          (await dayButton.getAttribute("aria-pressed")) === "true";
        const shouldBePressed = desiredDays.has(day);

        if (isPressed !== shouldBePressed) {
          await dayButton.click();
        }
      }
    }

    // Set custom interval
    if (options.recurrence.interval) {
      const spinbutton = dialog.getByRole("spinbutton");
      await spinbutton.clear();
      await spinbutton.fill(String(options.recurrence.interval));
    }

    // Set end date
    if (options.recurrence.endDate) {
      await dialog.getByText("On date").click();
      // "On date" auto-fills with today's date. The recurrence end date
      // DatePicker is the second date-picker button within the dialog (after
      // the event date picker). Scope to dialog to avoid hitting view switcher.
      const datePickers = dialog.locator("button:has(svg.lucide-calendar)");
      const endDateBtn = datePickers.nth(1);
      await endDateBtn.click();
      // Wait for calendar popover to appear, then click the target day.
      // Match the full accessible name so duplicate day numbers across months
      // do not trip strict-mode lookups.
      const popover = page
        .locator("[data-radix-popper-content-wrapper]")
        .last();
      await expect(popover).toBeVisible();
      const endDateLabel = format(
        options.recurrence.endDate,
        "EEEE, MMMM do, yyyy",
      );
      await popover.getByRole("button", { name: endDateLabel }).click();
    }
  }

  await dialog.getByRole("button", { name: "Add Event" }).click();
  // Use named dialog to avoid strict mode violation from closed Radix popovers
  await expect(dialog).toBeHidden();
}

/**
 * Switches to the specified calendar view.
 * Works on both desktop (data-testid="view-switcher") and mobile (aria-label buttons).
 */
const VIEW_ARIA_LABELS: Record<string, RegExp> = {
  daily: /daily view/i,
  weekly: /weekly view/i,
  monthly: /monthly view/i,
  schedule: /schedule view/i,
};

const VIEW_INDEX: Record<string, number> = {
  daily: 0,
  weekly: 1,
  monthly: 2,
  schedule: 3,
};

export async function switchCalendarView(
  page: Page,
  view: "daily" | "weekly" | "monthly" | "schedule",
): Promise<void> {
  const viewSwitcher = page.getByTestId("view-switcher");
  const isDesktop = await viewSwitcher.isVisible().catch(() => false);

  if (isDesktop) {
    await viewSwitcher.locator("button").nth(VIEW_INDEX[view]).click();
  } else {
    await page.getByRole("button", { name: VIEW_ARIA_LABELS[view] }).click();
  }
  await page.waitForTimeout(200);
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
  // Use getByLabel to target the radio's wrapping <label>, avoiding
  // ambiguity with confirmation text like "delete this event?"
  const radioLabel = scope === "this" ? "This event" : "All events";
  await expect(page.getByLabel(radioLabel)).toBeVisible();
  await page.getByLabel(radioLabel).click();
  await page.getByRole("button", { name: "OK" }).click();
  // Brief wait for scope dialog transition
  await page.waitForTimeout(300);
}
