import { expect, test } from "@playwright/test";
import {
  createCalendarEvent,
  registerFamily,
  seedBrowserAuth,
} from "./helpers/api-helpers";
import {
  clearStorage,
  getTodayDateString,
  waitForHydration,
  waitForOfflineCachePersisted,
} from "./helpers/test-helpers";

/**
 * Option C — read-only offline data persistence.
 *
 * Runs against `npm run build` + `npm run preview` (the `offline-persistence`
 * Playwright project), NOT `npm run dev`: the service worker that serves the app
 * shell offline only exists in the production build, and IndexedDB query
 * persistence needs a real reload to exercise hydration.
 */
test.describe("Offline read persistence (Option C)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearStorage(page);
  });

  test("cached data stays visible and read-only after going offline", async ({
    page,
    context,
    request,
  }) => {
    const reg = await registerFamily(request, {
      familyName: "Offline Reads",
      members: [{ name: "Alice", color: "coral" }],
    });
    await createCalendarEvent(request, reg.token, {
      title: "Persisted Dentist",
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      date: getTodayDateString(),
      memberId: reg.family.members[0].id,
    });

    // Load online so the calendar fetches and the read cache is persisted.
    await seedBrowserAuth(page, reg);
    await page.reload();
    await waitForHydration(page);
    await expect(page.getByText("Persisted Dentist")).toBeVisible();

    // Wait until the throttled persister has actually written to IndexedDB.
    await waitForOfflineCachePersisted(page);

    // Go offline and reload — the app shell + cached data must come back.
    await context.setOffline(true);
    await page.reload();
    await waitForHydration(page);

    // Cached event renders from IndexedDB without a network round-trip.
    await expect(page.getByText("Persisted Dentist")).toBeVisible();

    // Read-only: the offline banner communicates that writes won't save.
    await expect(page.getByText(/you're offline/i)).toBeVisible();
    await expect(page.getByText(/won't save/i)).toBeVisible();
  });

  test("a never-loaded module shows a clear offline empty state", async ({
    page,
    context,
    request,
  }) => {
    const reg = await registerFamily(request, {
      familyName: "Partial Cache",
      members: [{ name: "Alice", color: "coral" }],
    });

    // Load online but only visit the calendar — chores are never fetched.
    await seedBrowserAuth(page, reg);
    await page.reload();
    await waitForHydration(page);
    await expect(page.getByRole("button", { name: "Add event" })).toBeVisible();

    // Offline, navigate to the never-loaded Chores module.
    await context.setOffline(true);
    await page.getByRole("button", { name: /chores/i }).click();

    // No crash / infinite spinner — a clear offline empty state instead.
    await expect(
      page.getByText(/haven't been saved for offline viewing yet/i),
    ).toBeVisible();
  });

  test("cross-account: a second family never sees the first family's cached data", async ({
    page,
    request,
  }) => {
    // Family A loads and persists a private event.
    const familyA = await registerFamily(request, {
      familyName: "Family A",
      members: [{ name: "Alice", color: "coral" }],
    });
    await createCalendarEvent(request, familyA.token, {
      title: "Family A Secret",
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      date: getTodayDateString(),
      memberId: familyA.family.members[0].id,
    });
    await seedBrowserAuth(page, familyA);
    await page.reload();
    await waitForHydration(page);
    await expect(page.getByText("Family A Secret")).toBeVisible();
    await waitForOfflineCachePersisted(page);

    // Sign out through the real UI flow (clears token, family storage, and the
    // persisted IndexedDB cache before reloading).
    await page.getByRole("button", { name: "Menu" }).first().click();
    await page.getByRole("button", { name: "Sign Out" }).click();
    await page.getByRole("button", { name: "Sign Out" }).click();
    await page.waitForLoadState("load");

    // Family B signs in on the same browser/origin.
    const familyB = await registerFamily(request, {
      familyName: "Family B",
      members: [{ name: "Bob", color: "teal" }],
    });
    await seedBrowserAuth(page, familyB);
    await page.reload();
    await waitForHydration(page);

    // Family A's persisted event must not leak into Family B's session.
    await expect(page.getByText("Family A Secret")).toHaveCount(0);
  });
});
