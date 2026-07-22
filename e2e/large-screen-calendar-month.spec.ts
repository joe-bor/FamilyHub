import { expect, test } from "@playwright/test";
import { addDays, addMonths, startOfMonth } from "date-fns";
import { formatLocalDate, parseLocalDate } from "../src/lib/time-utils";
import {
  createCalendarEvent,
  registerFamily,
  seedBrowserAuth,
} from "./helpers/api-helpers";
import {
  clearStorage,
  getTodayDateString,
  switchCalendarView,
  waitForCalendarReady,
  waitForHydration,
} from "./helpers/test-helpers";

/** Engine-independent description of what currently holds focus. */
function describeFocus(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const active = document.activeElement;
    return {
      tag: active?.tagName ?? null,
      label: active?.getAttribute("aria-label") ?? null,
      inGrid: Boolean(active?.closest('[role="grid"]')),
    };
  });
}

test.describe("Large-screen Calendar Month", () => {
  test.beforeEach(async ({ page, request, isMobile }) => {
    test.skip(isMobile, "Large-screen only");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await clearStorage(page);

    const reg = await registerFamily(request, {
      familyName: "Test Family",
      members: [
        { name: "Alice", color: "coral" },
        { name: "Bob", color: "teal" },
      ],
    });

    // Six events on one day guarantees overflow at any capacity this
    // viewport yields (max 5), so the popover tests have data to work with.
    // Seed through the API rather than the Add Event modal: the `createEvent`
    // UI helper accepts only { title, recurrence, allDay } and cannot set a
    // date or time.
    const today = getTodayDateString();
    for (let i = 0; i < 6; i++) {
      await createCalendarEvent(request, reg.token, {
        title: `Overflow event ${i}`,
        date: today,
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        memberId: reg.family.members[0].id,
        isAllDay: false,
      });
    }

    const parsedToday = parseLocalDate(today);
    const monthStart = startOfMonth(parsedToday);

    // A fixed in-month day, kept distinct from today and the run below, proves
    // the non-overflow activation path even when today is month-end.
    const singleDate = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      parsedToday.getDate() === 15 ? 16 : 15,
    );
    await createCalendarEvent(request, reg.token, {
      title: "Single event day",
      date: formatLocalDate(singleDate),
      startTime: "2:00 PM",
      endTime: "3:00 PM",
      memberId: reg.family.members[1].id,
      isAllDay: false,
    });

    // The first Friday of the displayed month through Tuesday guarantees a
    // five-segment run crossing the Sat/Sun row edge, fully inside the Month
    // matrix regardless of today's position near month-end.
    const daysUntilFriday = (5 - monthStart.getDay() + 7) % 7;
    const runStart = addDays(monthStart, daysUntilFriday);
    const runEnd = addDays(runStart, 4);
    await createCalendarEvent(request, reg.token, {
      title: "Family trip",
      date: formatLocalDate(runStart),
      endDate: formatLocalDate(runEnd),
      startTime: "12:00 AM",
      endTime: "11:59 PM",
      memberId: reg.family.members[0].id,
      isAllDay: true,
    });

    await seedBrowserAuth(page, reg);
    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);
    await switchCalendarView(page, "monthly");
  });

  test("grid fills the viewport with no dead space below the last week", async ({
    page,
  }) => {
    const grid = page.getByRole("grid");
    const gridBox = await grid.boundingBox();
    const lastRow = grid.getByRole("row").last();
    const lastBox = await lastRow.boundingBox();

    expect(gridBox).not.toBeNull();
    expect(lastBox).not.toBeNull();
    const lastBottom =
      (lastBox as { y: number; height: number }).y +
      (lastBox as { height: number }).height;
    const gridBottom =
      (gridBox as { y: number; height: number }).y +
      (gridBox as { height: number }).height;
    // Two-sided: dead space and an overfull/permanently scrolling grid fail.
    expect(lastBottom).toBeGreaterThanOrEqual(gridBottom - 24);
    expect(lastBottom).toBeLessThanOrEqual(gridBottom + 2);
  });

  test("the grid is a single tab stop", async ({ page }) => {
    // Count tabbable cells directly rather than tabbing from a fixed control.
    // The "Today" button is `disabled` whenever `isViewingToday` is true
    // (calendar-navigation.tsx), so focusing it on a fresh load is a no-op and
    // a tab-from-Today test would silently start from <body>.
    const grid = page.getByRole("grid");
    await expect(grid.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(
      1,
    );
    await expect(
      grid.locator(
        '[role="gridcell"]:not([tabindex="-1"]):not([tabindex="0"])',
      ),
    ).toHaveCount(0);
    // Dense visual slots must not introduce any button at all.
    await expect(grid.locator('button:not([tabindex="-1"])')).toHaveCount(0);
  });

  test("Enter opens the popover on a day with events but no overflow", async ({
    page,
  }) => {
    // Guards the case where the popover is gated on overflow: a day with
    // 1..capacity events must still open it, since the popover is the
    // keyboard path to every event.
    const singleEventDay = page
      .getByRole("gridcell")
      .filter({ hasText: "Single event day" });
    await expect(singleEventDay).toHaveCount(1);
    await singleEventDay.focus();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("a pointer click through a normal chip opens that day's popover", async ({
    page,
  }) => {
    const singleEventDay = page
      .getByRole("gridcell")
      .filter({ hasText: "Single event day" });
    const chip = singleEventDay
      .getByTestId("month-event-chip")
      .filter({ hasText: "Single event day" });
    await expect(chip).toBeVisible();
    const box = await chip.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(
      (box as { x: number; width: number }).x +
        (box as { width: number }).width / 2,
      (box as { y: number; height: number }).y +
        (box as { height: number }).height / 2,
    );

    const dialog = page.getByRole("dialog", { name: /events for/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Single event day");
  });

  test("a pointer click through +N opens the complete busy-day popover", async ({
    page,
  }) => {
    const busyDay = page.locator(
      `[role="gridcell"][data-date="${getTodayDateString()}"]`,
    );
    const summary = busyDay.getByTestId("month-overflow-summary");
    await expect(summary).toBeVisible();
    const box = await summary.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(
      (box as { x: number; width: number }).x +
        (box as { width: number }).width / 2,
      (box as { y: number; height: number }).y +
        (box as { height: number }).height / 2,
    );

    const dialog = page.getByRole("dialog", { name: /events for/i });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /Overflow event/ }),
    ).toHaveCount(6);
  });

  test("ArrowRight crosses the grid edge and restores the exact landed day", async ({
    page,
  }) => {
    const cells = page.getByRole("gridcell");
    const last = cells.last();
    const before = await last.getAttribute("data-date");
    if (!before) throw new Error("Last gridcell has no data-date");
    await last.focus();

    await page.keyboard.press("ArrowRight");
    const expected = formatLocalDate(addDays(parseLocalDate(before), 1));
    await expect
      .poll(() =>
        page.evaluate(() => document.activeElement?.getAttribute("data-date")),
      )
      .toBe(expected);
  });

  test("PageDown changes the visible month and restores the exact date", async ({
    page,
  }) => {
    const cell = page.getByRole("gridcell").nth(10);
    const before = await cell.getAttribute("data-date");
    if (!before) throw new Error("Gridcell has no data-date");
    await cell.focus();
    await page.keyboard.press("PageDown");
    const expected = formatLocalDate(addMonths(parseLocalDate(before), 1));
    await expect
      .poll(() =>
        page.evaluate(() => document.activeElement?.getAttribute("data-date")),
      )
      .toBe(expected);
  });

  test("Enter on a day with events opens the overflow popover", async ({
    page,
  }) => {
    // The six overflow events are seeded in beforeEach via the API.
    const busyDay = page.locator(
      `[role="gridcell"][data-date="${getTodayDateString()}"]`,
    );
    await busyDay.focus();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    const focusedRole = await page.evaluate(() =>
      document.activeElement?.getAttribute("role"),
    );
    expect(focusedRole).toBe("gridcell");
  });

  test("selecting a popover event closes it and opens EventDetailModal", async ({
    page,
  }) => {
    const busyDay = page.locator(
      `[role="gridcell"][data-date="${getTodayDateString()}"]`,
    );
    const originDate = await busyDay.getAttribute("data-date");
    await busyDay.focus();
    await page.keyboard.press("Enter");
    const dayPopover = page.getByRole("dialog", { name: /events for/i });
    await dayPopover.getByRole("button", { name: /Overflow event 3/i }).click();
    await expect(dayPopover).not.toBeVisible();
    const detail = page
      .getByRole("dialog")
      .filter({ hasText: "Overflow event 3" });
    await expect(detail).toBeVisible();
    await detail.getByRole("button", { name: /close/i }).click();
    await expect(detail).not.toBeVisible();
    expect(
      await page.evaluate(() =>
        document.activeElement?.getAttribute("data-date"),
      ),
    ).toBe(originDate);
  });

  test("toolbar navigation dismisses the popover and keeps focus on the toolbar", async ({
    page,
  }) => {
    const busyDay = page.locator(
      `[role="gridcell"][data-date="${getTodayDateString()}"]`,
    );
    await busyDay.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("dialog", { name: /events for/i }),
    ).toBeVisible();

    const next = page.getByRole("button", { name: "Next" });
    await next.click();

    await expect(
      page.getByRole("dialog", { name: /events for/i }),
    ).not.toBeVisible();

    // The contract is that dismissal must not STEAL focus from the external
    // control — not that a click focuses a button, which is a Chromium/Gecko
    // convention WebKit does not share (macOS Safari leaves <body> active after
    // a button click, popover or not). Assert the contract on every engine:
    // focus is not yanked back into the grid, and the focus outcome is byte-for
    // -byte what the very same click produces with no popover open, so the
    // popover provably changed nothing.
    const afterDismiss = await describeFocus(page);
    expect(afterDismiss.inGrid).toBe(false);

    await next.click();
    expect(await describeFocus(page)).toEqual(afterDismiss);
  });

  test("weekday header is a row of columnheaders inside the grid", async ({
    page,
  }) => {
    const grid = page.getByRole("grid");
    await expect(grid.getByRole("columnheader")).toHaveCount(7);
    await expect(grid.locator(':scope > [role="row"]')).toHaveCount(1);
    await expect(grid.locator(':scope > [role="rowgroup"]')).toHaveCount(1);
    const weekRows = grid.locator(':scope > [role="rowgroup"] > [role="row"]');
    expect(await weekRows.count()).toBeGreaterThanOrEqual(4);
    expect(await weekRows.count()).toBeLessThanOrEqual(6);
  });

  test("multi-day segments weld, keep row-edge corners square and never overflow the page", async ({
    page,
  }) => {
    const chips = page
      .getByTestId("month-event-chip")
      .filter({ hasText: "Family trip" });
    await expect(chips).toHaveCount(5);
    await expect(chips.nth(0)).toHaveClass(/rounded-l/);
    await expect(chips.nth(0)).not.toHaveClass(/rounded-r/);
    await expect(chips.nth(4)).toHaveClass(/rounded-r/);
    await expect(chips.nth(4)).not.toHaveClass(/rounded-l/);

    const friday = await chips.nth(0).boundingBox();
    const saturday = await chips.nth(1).boundingBox();
    expect(friday).not.toBeNull();
    expect(saturday).not.toBeNull();
    expect(
      Math.abs(
        (friday as { x: number; width: number }).x +
          (friday as { width: number }).width -
          (saturday as { x: number }).x,
      ),
    ).toBeLessThanOrEqual(1);

    // Saturday and Sunday are interior segments at opposite row edges. They
    // stay square even though outward bleed is suppressed there.
    await expect(chips.nth(1)).not.toHaveClass(/rounded-r/);
    await expect(chips.nth(2)).not.toHaveClass(/rounded-l/);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
});
