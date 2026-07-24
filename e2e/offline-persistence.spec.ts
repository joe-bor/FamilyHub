import { mkdir } from "node:fs/promises";
import { type APIRequestContext, expect, test } from "@playwright/test";
import {
  createCalendarEvent,
  registerFamily,
  seedBrowserAuth,
} from "./helpers/api-helpers";
import {
  clearStorage,
  getTodayDateString,
  readPersistedQueryData,
  switchCalendarView,
  waitForCalendarReady,
  waitForHydration,
  waitForOfflineCachePersisted,
  waitForServiceWorkerReady,
} from "./helpers/test-helpers";

const API_BASE = "http://127.0.0.1:8080/api";

async function createGroupedGeneralList(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const headers = { Authorization: `Bearer ${token}` };

  const listResponse = await request.post(`${API_BASE}/lists`, {
    headers,
    data: { name: "Offline Test List", kind: "general" },
  });
  if (!listResponse.ok()) {
    throw new Error(
      `Create list failed (${listResponse.status()}): ${await listResponse.text()}`,
    );
  }
  const listJson = (await listResponse.json()) as { data: { id: string } };
  const listId = listJson.data.id;

  const categoryResponse = await request.post(`${API_BASE}/lists/categories`, {
    headers,
    data: { kind: "general", name: "Archived" },
  });
  if (!categoryResponse.ok()) {
    throw new Error(
      `Create category failed (${categoryResponse.status()}): ${await categoryResponse.text()}`,
    );
  }
  const categoryJson = (await categoryResponse.json()) as {
    data: { id: string };
  };
  const categoryId = categoryJson.data.id;

  const itemResponse = await request.post(`${API_BASE}/lists/${listId}/items`, {
    headers,
    data: { text: "Old Documents", categoryId },
  });
  if (!itemResponse.ok()) {
    throw new Error(
      `Create item failed (${itemResponse.status()}): ${await itemResponse.text()}`,
    );
  }

  const updateResponse = await request.patch(`${API_BASE}/lists/${listId}`, {
    headers,
    data: { categoryDisplayMode: "grouped", showCompletedOverride: null },
  });
  if (!updateResponse.ok()) {
    throw new Error(
      `Group list failed (${updateResponse.status()}): ${await updateResponse.text()}`,
    );
  }
}

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
    await waitForCalendarReady(page);
    await expect(page.getByText("Persisted Dentist")).toBeVisible();

    // Wait until the throttled persister has actually written to IndexedDB.
    await waitForOfflineCachePersisted(page);

    // The offline reload must be served from the SW precache; wait until the SW
    // controls the page or page.reload() races it and fails offline with
    // ERR_INTERNET_DISCONNECTED.
    await waitForServiceWorkerReady(page);

    // Go offline and reload — the app shell + cached data must come back.
    await context.setOffline(true);
    await page.reload();
    await waitForHydration(page);

    // The offline-reloaded page starts back at Home; steer to Calendar so the
    // cached event assertion below matches where it actually renders.
    await waitForCalendarReady(page);

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

    // Load online but only visit the calendar — Recipes is never fetched.
    // (Home prefetches chores/meals/lists for its state strip, so Recipes is
    // the module whose data can genuinely be absent offline.)
    await seedBrowserAuth(page, reg);
    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);

    // The Recipes chunk is lazy-loaded; ensure the SW controls the page so its
    // precached chunk is served offline (otherwise the import crashes to blank).
    await waitForServiceWorkerReady(page);

    // Offline, navigate to the never-loaded Recipes module via the nav rail.
    await context.setOffline(true);
    await page
      .getByRole("navigation", { name: /primary/i })
      .getByRole("button", { name: /recipes/i })
      .click();

    // No crash / infinite spinner — a clear offline empty state instead.
    await expect(
      page.getByText(/haven't been saved for offline viewing yet/i),
    ).toBeVisible();
  });

  test("a precached module chunk that fails to load shows the offline empty state, not a blank page", async ({
    page,
    context,
    request,
  }) => {
    const reg = await registerFamily(request, {
      familyName: "Evicted Chunk",
      members: [{ name: "Alice", color: "coral" }],
    });

    // Load online and gain SW control so the Chores chunk is precached and would
    // normally be served offline.
    await seedBrowserAuth(page, reg);
    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);
    await waitForServiceWorkerReady(page);

    // Force a precache miss for the Chores chunk by dropping it from BOTH the
    // Workbox cache and the HTTP cache, so the offline dynamic import has nothing
    // to serve and must hit the (offline) network. This is the defense-in-depth
    // path clientsClaim cannot cover: a precached chunk that was evicted.
    const client = await context.newCDPSession(page);
    await client.send("Network.clearBrowserCache");
    const evicted = await page.evaluate(async () => {
      let count = 0;
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) {
          if (new URL(req.url).pathname.includes("chores-view")) {
            if (await cache.delete(req)) count++;
          }
        }
      }
      return count;
    });
    expect(evicted).toBeGreaterThan(0);

    // Offline, navigate to Chores — the chunk import now fails. Scope to the
    // nav rail: Home's state strip also has a "Open Chores. …" control that
    // matches /chores/i.
    await context.setOffline(true);
    const primaryNav = page.getByRole("navigation", { name: /primary/i });
    await primaryNav.getByRole("button", { name: /chores/i }).click();

    // The error boundary renders the offline empty state instead of crashing.
    await expect(
      page.getByText(/haven't been saved for offline viewing yet/i),
    ).toBeVisible();
    // It is the boundary fallback, not the loaded module: the module's own header
    // is absent, and the app shell (nav) survived rather than blanking out.
    await expect(page.getByRole("heading", { name: "Chores" })).toHaveCount(0);
    await expect(
      primaryNav.getByRole("button", { name: /chores/i }),
    ).toBeVisible();
  });

  test("grouped General list: headings and items readable offline; Manage Categories and New Category unavailable", async ({
    page,
    context,
    request,
  }) => {
    // Register a family and create a General list with a category and item online.
    const reg = await registerFamily(request, {
      familyName: "Offline General",
      members: [{ name: "Alice", color: "coral" }],
    });
    await createGroupedGeneralList(request, reg.token);

    // Seed auth and navigate so the app fetches all data.
    await seedBrowserAuth(page, reg);
    await page.reload();
    await waitForHydration(page);

    // Navigate to Lists via the nav rail: Home's state strip also has an
    // "Open Lists. …" control that substring-matches name: "Lists".
    const primaryNav = page.getByRole("navigation", { name: /primary/i });
    await primaryNav.getByRole("button", { name: "Lists" }).click();
    await expect(
      page.getByRole("heading", { name: "My Lists", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Offline Test List" }).click();
    await expect(
      page.getByRole("heading", { name: "Offline Test List" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Archived" })).toBeVisible();
    await expect(page.getByText("Old Documents")).toBeVisible();

    // Wait until the throttled persister has written the cache to IndexedDB.
    await waitForOfflineCachePersisted(page);

    // Gain SW control so the offline reload is served from precache.
    await waitForServiceWorkerReady(page);

    // Go offline and reload.
    await context.setOffline(true);
    await page.reload();
    await waitForHydration(page);

    // The app shell must come back (offline banner).
    await expect(page.getByText(/you're offline/i)).toBeVisible();

    // Navigate back to Lists (the offline-reloaded page starts at Home). Scope
    // to the nav rail: the state strip's "Open Lists. …" control also matches.
    await primaryNav.getByRole("button", { name: "Lists" }).click();

    // The list card should still be visible from the cached list index.
    await page.getByRole("button", { name: "Offline Test List" }).click();

    // Category heading and item should render from the cached list detail.
    await expect(page.getByRole("heading", { name: "Archived" })).toBeVisible();
    await expect(page.getByText("Old Documents")).toBeVisible();

    // Manage Categories button must be disabled offline.
    await expect(
      page.getByRole("button", { name: "Manage categories" }),
    ).toBeDisabled();

    // "New category" affordance in Add Item must be absent/unavailable offline.
    await page.getByRole("button", { name: "Add item" }).click();
    const addItemOffline = page.getByRole("dialog", { name: "Add Item" });
    await expect(addItemOffline).toBeVisible();
    // The "+ New category" button is hidden offline; a "Connect to the internet"
    // message appears instead.
    await expect(
      addItemOffline.getByRole("button", { name: "+ New category" }),
    ).toBeHidden();
    await expect(
      addItemOffline.getByText(/connect to the internet/i),
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
    await waitForCalendarReady(page);
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
    await waitForCalendarReady(page);

    // Family A's persisted event must not leak into Family B's session.
    await expect(page.getByText("Family A Secret")).toHaveCount(0);
  });

  test("large Month restores cached empty April and February without a cold-cache flash", async ({
    page,
    context,
    request,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.setFixedTime(new Date(2026, 3, 15, 12, 0, 0));
    await clearStorage(page);

    // Observe every text mutation from before application scripts run. A final
    // absence assertion alone could miss a one-frame uncached-message flash.
    await page.addInitScript(() => {
      (window as Window & { __sawMonthColdCopy?: boolean }).__sawMonthColdCopy =
        false;
      new MutationObserver(() => {
        if (
          document.body?.textContent?.includes("This month isn't cached yet.")
        ) {
          (
            window as Window & { __sawMonthColdCopy?: boolean }
          ).__sawMonthColdCopy = true;
        }
      }).observe(document, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });

    const reg = await registerFamily(request, {
      familyName: "Empty Month Cache",
      members: [{ name: "Alice", color: "coral" }],
    });
    await seedBrowserAuth(page, reg);
    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);
    await switchCalendarView(page, "monthly");

    // April has a grid-expanded key (Mar 29-May 2). February 2026 is exactly
    // four Sunday-start weeks, so its expanded and month-only keys are equal.
    await expect(page.getByRole("grid", { name: "April 2026" })).toBeVisible();
    await page.getByRole("button", { name: "Previous" }).click();
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(
      page.getByRole("grid", { name: "February 2026" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("grid", { name: "April 2026" })).toBeVisible();

    // Persistence is only ready when both exact Month query keys exist with
    // cached empty payloads. A generic "some cache exists" wait can pass on the
    // bootstrap/preferences queries and leave this test racing IndexedDB.
    await expect
      .poll(
        async () => {
          const [april, february] = await Promise.all([
            readPersistedQueryData<{ data?: unknown[] }>(page, [
              "calendar",
              "events",
              { startDate: "2026-03-29", endDate: "2026-05-02" },
            ]),
            readPersistedQueryData<{ data?: unknown[] }>(page, [
              "calendar",
              "events",
              { startDate: "2026-02-01", endDate: "2026-02-28" },
            ]),
          ]);
          return [april?.data?.length, february?.data?.length];
        },
        { timeout: 10_000 },
      )
      .toEqual([0, 0]);
    await waitForServiceWorkerReady(page);
    await context.setOffline(true);
    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);
    await switchCalendarView(page, "monthly");

    await expect(page.getByRole("grid", { name: "April 2026" })).toBeVisible();
    expect(
      await page.evaluate(() =>
        Boolean(
          (window as Window & { __sawMonthColdCopy?: boolean })
            .__sawMonthColdCopy,
        ),
      ),
    ).toBe(false);

    // Task 12 opts into one deterministic offline-restoration screenshot. The
    // normal offline-persistence project remains artifact-free.
    const visualOut = process.env.CALENDAR_VISUAL_OUT_DIR;
    if (visualOut) {
      const directory = `${visualOut}/month/1280x800`;
      await mkdir(directory, { recursive: true });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await page.screenshot({
        path: `${directory}/offline-restored.png`,
        fullPage: true,
      });
    }

    await page.getByRole("button", { name: "Previous" }).click();
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(
      page.getByRole("grid", { name: "February 2026" }),
    ).toBeVisible();
    await expect(page.getByText(/isn't cached/i)).toHaveCount(0);

    // March and April were loaded during navigation; May was never loaded. The
    // honest cold-cache state therefore appears only on the third Next click.
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("This month isn't cached yet.")).toBeVisible();

    // Offline with nothing cached is a settled condition, not a transient one.
    // TanStack cold-starts believing it is online, so the doomed fetch retries
    // and resolves to an error at roughly seven seconds; before this was fixed
    // the copy above was replaced by an unusable "Try again" at t=8s and a
    // visibility check alone passed purely on timing. Hold past that point.
    await page.waitForTimeout(12_000);
    await expect(page.getByText("This month isn't cached yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: /try again/i })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("status", { name: /loading month/i }),
    ).toHaveCount(0);
  });
});

/**
 * First-session case: the tab that registered the service worker is itself
 * uncontrolled until the SW claims it. Without clientsClaim it stays uncontrolled
 * for the whole session, so an offline lazy import hits the network and crashes
 * the app to a blank page. These tests use a single authenticated load (auth is
 * seeded before navigation) and never do the control-gaining reload.
 */
test.describe("Offline first session (clientsClaim)", () => {
  test("a never-visited module loads offline without a control-gaining reload", async ({
    page,
    context,
    request,
  }) => {
    const reg = await registerFamily(request, {
      familyName: "First Session",
      members: [{ name: "Alice", color: "coral" }],
    });

    // Seed auth BEFORE the first navigation so the very first load — the one that
    // registers the SW and is therefore uncontrolled — is already authenticated.
    // No second, control-gaining reload happens after this.
    await page.addInitScript((data) => {
      localStorage.setItem("family-hub-auth-token", data.token);
      localStorage.setItem(
        "family-hub-family",
        JSON.stringify({
          state: { family: data.family, _hasHydrated: true },
          version: 0,
        }),
      );
    }, reg);

    await page.goto("/");
    await waitForHydration(page);
    await waitForCalendarReady(page);

    // The SW activates after this page loaded. clientsClaim must make it take
    // control of this already-open tab WITHOUT a reload; otherwise the controller
    // never appears and offline lazy imports cannot be served from precache.
    await page.evaluate(() => navigator.serviceWorker?.ready);
    await page.waitForFunction(
      () => navigator.serviceWorker.controller != null,
      undefined,
      { timeout: 15000 },
    );

    // Offline, navigate via SPA (no reload) to the never-visited Recipes
    // module. (Home prefetches chores/meals/lists for its state strip, so
    // Recipes is the module whose data can genuinely be absent offline.)
    await context.setOffline(true);
    await page
      .getByRole("navigation", { name: /primary/i })
      .getByRole("button", { name: /recipes/i })
      .click();

    // The precached chunk loads from the now-controlling SW: the module's own
    // header renders (proof the chunk loaded, not the error-boundary fallback)…
    await expect(page.getByRole("heading", { name: "Recipes" })).toBeVisible();
    // …alongside its honest "not saved for offline" empty state (no cached data).
    await expect(
      page.getByText(/haven't been saved for offline viewing yet/i),
    ).toBeVisible();
  });
});
