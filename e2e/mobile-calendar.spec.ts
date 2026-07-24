import { expect, test } from "@playwright/test";
import { colorMap } from "../src/lib/types";
import {
  createCalendarEvent,
  registerFamily,
  seedBrowserAuth,
} from "./helpers/api-helpers";
import {
  clearStorage,
  getTodayDateString,
  safeClick,
  switchCalendarView,
  waitForCalendarReady,
  waitForHydration,
} from "./helpers/test-helpers";

test.describe("Mobile Calendar Views", () => {
  test.beforeEach(async ({ page, request, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");

    await page.goto("/");
    await clearStorage(page);

    const reg = await registerFamily(request, {
      familyName: "Test Family",
      members: [
        { name: "Alice", color: "coral" },
        { name: "Bob", color: "teal" },
      ],
    });
    await seedBrowserAuth(page, reg);

    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);
  });

  test("mobile toolbar renders with D/W/M/S view switcher", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /daily view/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /weekly view/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /monthly view/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /schedule view/i }),
    ).toBeVisible();
  });

  test("can switch between all 4 views", async ({ page }) => {
    // Switch to daily
    await page.getByRole("button", { name: /daily view/i }).click();
    // Daily view should show time labels
    await expect(page.getByText("8 AM")).toBeVisible();

    // Switch to weekly
    await page.getByRole("button", { name: /weekly view/i }).click();
    // Weekly view should show date strip navigation
    await expect(
      page.getByRole("navigation", { name: /week navigation/i }),
    ).toBeVisible();

    // Switch to monthly
    await page.getByRole("button", { name: /monthly view/i }).click();
    // Monthly view should show date grid
    await expect(page.getByRole("grid")).toBeVisible();

    // Switch to schedule
    await page.getByRole("button", { name: /schedule view/i }).click();
    // Schedule view should show the Add event FAB (confirming calendar is rendered)
    await expect(page.getByRole("button", { name: "Add event" })).toBeVisible();
  });

  test("event creation uses full-screen sheet on mobile", async ({ page }) => {
    // Tap FAB
    await safeClick(page.getByRole("button", { name: /add event/i }));

    // Should see full-screen sheet (dialog role) with Cancel button
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();

    // Fill in event name
    await page.getByLabel("Event Name").fill("Test Event");

    // Submit via the header "Add" button
    await dialog.getByRole("button", { name: /add event/i }).click();

    // Sheet should close after submission
    await expect(dialog).toBeHidden();
  });

  test("no horizontal scrolling on any view at mobile viewport", async ({
    page,
  }) => {
    const viewButtons = [
      { name: /daily view/i },
      { name: /weekly view/i },
      { name: /monthly view/i },
      { name: /schedule view/i },
    ];

    for (const { name } of viewButtons) {
      await page.getByRole("button", { name }).click();
      // Allow view to render
      await page.waitForTimeout(300);

      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      // 1px tolerance for sub-pixel rounding
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    }
  });

  test("member filter dots toggle member visibility", async ({ page }) => {
    // Locate Alice's filter dot by aria-label
    const aliceDot = page
      .getByRole("button", { name: /Alice filter/i })
      .first();
    await expect(aliceDot).toBeVisible();
    // Toggle the filter — verifies the interaction doesn't crash
    await aliceDot.click();

    // Bob's filter dot should also be present
    const bobDot = page.getByRole("button", { name: /Bob filter/i }).first();
    await expect(bobDot).toBeVisible();
  });
});

/**
 * The compact Schedule row's coloured left border.
 *
 * Its own describe because the fixture ordering is load-bearing: the event must
 * exist *before* the app's first authenticated calendar load. Seeding it after
 * that load and reloading does not work — successful queries are persisted to
 * IndexedDB by `PersistQueryClientProvider`, `clearStorage` clears only
 * local/sessionStorage, and the restored empty result is seconds old against a
 * 5-minute `staleTime`, so TanStack treats it as fresh and never refetches.
 * Schedule then renders "No upcoming events" while the event sits in the
 * backend. Same ordering as `calendar-preservation-visual.spec.ts`.
 */
test.describe("Mobile Schedule member border", () => {
  test("Schedule rows resolve the member's coloured left border", async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile-only test");

    await page.goto("/");
    await clearStorage(page);

    const reg = await registerFamily(request, {
      familyName: "Schedule Border",
      members: [{ name: "Alice", color: "coral" }],
    });
    await createCalendarEvent(request, reg.token, {
      title: "Border Probe",
      date: getTodayDateString(),
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      memberId: reg.family.members[0].id,
      isAllDay: false,
    });

    await seedBrowserAuth(page, reg);
    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);
    await switchCalendarView(page, "schedule");

    // Assert on the loaded surface, never on an empty one: reading geometry off
    // a row that has not rendered yet fails for the wrong reason.
    const row = page.getByRole("button", { name: /Border Probe/ });
    await expect(row).toBeVisible();

    // The *resolved* values, not `element.style`. jsdom cannot stand in for
    // this: it loads no Tailwind stylesheet, so `border-l-4` never resolves
    // there and the width half of the guard only holds against real CSS.
    const actual = await row.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.borderLeftColor, width: style.borderLeftWidth };
    });
    const expected = await page.evaluate((hex) => {
      const probe = document.createElement("div");
      probe.style.borderLeftColor = hex;
      return probe.style.borderLeftColor;
    }, colorMap.coral.hex);

    expect(actual.color).toBe(expected);
    expect(actual.width).toBe("4px");
  });
});
