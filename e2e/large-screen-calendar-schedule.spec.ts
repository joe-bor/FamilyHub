import { expect, test } from "@playwright/test";
import { addDays } from "date-fns";
import { formatLocalDate, parseLocalDate } from "../src/lib/time-utils";
import { colorMap } from "../src/lib/types";
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

/**
 * Block until the Schedule surface is the loaded composition rather than
 * `ScheduleSkeleton`. Every paging step starts a new query, and an absence
 * assertion ("this event is no longer in the window") passes trivially against
 * a skeleton — so the window proof has to gate on the loaded rows first.
 */
async function waitForScheduleLoaded(
  page: import("@playwright/test").Page,
): Promise<void> {
  await expect(
    page.getByRole("status", { name: /loading schedule/i }),
  ).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId("schedule-scroll-surface")).toBeVisible();
}

test.describe("Large-screen Calendar Schedule", () => {
  test.beforeEach(async ({ page, request, isMobile }) => {
    test.skip(isMobile, "Large-screen only");
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    await clearStorage(page);

    const reg = await registerFamily(request, {
      familyName: "Test Family",
      members: [{ name: "Alice", color: "coral" }],
    });

    const today = parseLocalDate(getTodayDateString());
    const dateFor = (offset: number) => formatLocalDate(addDays(today, offset));

    // Today and day +13 define the initial window and leave exactly one
    // 12-day interior gap. Day +20 is outside offsets 0..13 but enters after
    // the preserved 7-day paging step, making the 50% overlap testable.
    for (const offset of [0, 13, 20]) {
      await createCalendarEvent(request, reg.token, {
        title: `Event day ${offset}`,
        date: dateFor(offset),
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        memberId: reg.family.members[0].id,
        isAllDay: false,
      });
    }

    // Keep Today's section taller than the scroll offset so browser geometry
    // can prove the date gutter actually sticks within its day group.
    for (let index = 1; index <= 4; index++) {
      await createCalendarEvent(request, reg.token, {
        title: `Today extra ${index}`,
        date: dateFor(0),
        startTime: "10:00 AM",
        endTime: "11:00 AM",
        memberId: reg.family.members[0].id,
        isAllDay: false,
      });
    }

    await seedBrowserAuth(page, reg);
    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);
    await switchCalendarView(page, "schedule");

    // Switching views starts a fresh query and the released backend is cold on
    // the first spec of a run, so the skeleton can outlive the 5s expect
    // timeout and every assertion below would measure `ScheduleSkeleton`.
    await waitForScheduleLoaded(page);
  });

  test("content spans the width with no centred narrow column", async ({
    page,
  }) => {
    const section = page.getByRole("region", { name: /Today.*5 events/i });
    const box = await section.boundingBox();
    expect(box).not.toBeNull();
    // A 1400px cap fails here; 1920 minus nav/padding leaves about 1800px.
    expect((box as { width: number }).width).toBeGreaterThan(1700);
  });

  test("the date gutter carries label, date and count", async ({ page }) => {
    const todayRegion = page.getByRole("region", { name: /Today.*5 events/i });
    await expect(todayRegion.getByText("Today", { exact: true })).toBeVisible();
    await expect(
      todayRegion.getByText("5 events", { exact: true }),
    ).toBeVisible();
  });

  test("the date gutter sticks while its day group scrolls", async ({
    page,
  }) => {
    // Force a short but still large-screen viewport so the fixture genuinely
    // overflows; sticky geometry is meaningless on a non-scrollable surface.
    await page.setViewportSize({ width: 1920, height: 480 });
    const scroller = page.getByTestId("schedule-scroll-surface");
    const region = page.getByRole("region", { name: /Today.*5 events/i });
    const gutter = region.getByTestId("schedule-date-gutter");
    const regionBefore = await region.boundingBox();

    expect(
      await scroller.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    ).toBe(true);

    await scroller.evaluate((element) => {
      element.scrollTop = 120;
    });

    const [scrollBox, regionAfter, gutterAfter] = await Promise.all([
      scroller.boundingBox(),
      region.boundingBox(),
      gutter.boundingBox(),
    ]);
    expect(scrollBox).not.toBeNull();
    expect(regionBefore).not.toBeNull();
    expect(regionAfter).not.toBeNull();
    expect(gutterAfter).not.toBeNull();
    expect((regionAfter as { y: number }).y).toBeLessThan(
      (regionBefore as { y: number }).y - 50,
    );
    expect((gutterAfter as { y: number }).y).toBeGreaterThanOrEqual(
      (scrollBox as { y: number }).y,
    );
    expect((gutterAfter as { y: number }).y).toBeLessThanOrEqual(
      (scrollBox as { y: number }).y + 20,
    );
    // Pinned to the surface top *and* still inside its own day group: a gutter
    // that had escaped its section would satisfy the two bounds above while
    // floating over the following day's rows.
    expect((gutterAfter as { y: number }).y).toBeGreaterThanOrEqual(
      (regionAfter as { y: number }).y,
    );
    expect((gutterAfter as { y: number }).y).toBeLessThan(
      (regionAfter as { y: number }).y +
        (regionAfter as { height: number }).height,
    );
  });

  test("an event-free stretch renders one gap row", async ({ page }) => {
    const gaps = page.getByRole("group", { name: /nothing scheduled/i });
    await expect(gaps).toHaveCount(1);
    await expect(gaps).not.toHaveAttribute("tabindex");
  });

  test("event rows show the member and resolve the coloured border", async ({
    page,
  }) => {
    const row = page.getByRole("button", { name: /Event day 0/ });
    await expect(row).toContainText("Alice");
    const actual = await row.evaluate(
      (element) => (element as HTMLElement).style.borderLeftColor,
    );
    const expected = await page.evaluate((hex) => {
      const probe = document.createElement("div");
      probe.style.borderLeftColor = hex;
      return probe.style.borderLeftColor;
    }, colorMap.coral.hex);
    expect(actual).toBe(expected);
  });

  test("selecting a Schedule row opens EventDetailModal", async ({ page }) => {
    await page.getByRole("button", { name: /Event day 0/ }).click();
    await expect(
      page.getByRole("dialog").filter({ hasText: "Event day 0" }),
    ).toBeVisible();
  });

  test("pages a 14-day window by exactly 7 days and back", async ({ page }) => {
    const dayZero = page.getByText("Event day 0", { exact: true });
    const dayThirteen = page.getByText("Event day 13", { exact: true });
    const dayTwenty = page.getByText("Event day 20", { exact: true });

    // Initial offsets are 0..13: both boundary events render and +20 does not.
    // Each block asserts the events that must be present before the ones that
    // must be absent, so a still-loading surface can never satisfy the window.
    await expect(dayZero).toBeVisible();
    await expect(dayThirteen).toBeVisible();
    await expect(dayTwenty).toHaveCount(0);

    await page.getByRole("button", { name: "Next" }).click();
    await waitForScheduleLoaded(page);

    // The next window is offsets 7..20. Day +13 proves the seven-day overlap;
    // the old lower boundary leaves and the new upper boundary enters.
    await expect(dayThirteen).toBeVisible();
    await expect(dayTwenty).toBeVisible();
    await expect(dayZero).toHaveCount(0);

    await page.getByRole("button", { name: "Previous" }).click();
    await waitForScheduleLoaded(page);

    await expect(dayZero).toBeVisible();
    await expect(dayThirteen).toBeVisible();
    await expect(dayTwenty).toHaveCount(0);
  });
});
