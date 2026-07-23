import { expect, test } from "@playwright/test";
import { addDays, format } from "date-fns";
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

/** Mirrors schedule-calendar.tsx's lg+ day-group grid track and its `gap-4`. */
const GUTTER_WIDTH = 168;
const GRID_GAP = 16;

/**
 * Block until a viewport change has actually reached the day group.
 *
 * `setViewportSize` returns before React re-renders, so a width read straight
 * after a resize can return the *previous* viewport's layout — which would
 * "prove" a width assertion against the wrong viewport. Waiting for the width
 * to both differ from the old one and hold still avoids that.
 */
async function settleScheduleWidth(
  page: import("@playwright/test").Page,
  previousWidth: number,
): Promise<void> {
  let previous = Number.NaN;
  let stableSamples = 0;
  await expect
    .poll(
      async () => {
        const width = await page.evaluate(
          () =>
            document
              .querySelector('[data-testid="schedule-scroll-surface"] section')
              ?.getBoundingClientRect().width ?? -1,
        );
        if (width < 0 || Math.abs(width - previousWidth) < 1) {
          stableSamples = 0;
          previous = Number.NaN;
          return 0;
        }
        stableSamples = width === previous ? stableSamples + 1 : 0;
        previous = width;
        return stableSamples;
      },
      { timeout: 15_000, intervals: [120, 120, 120, 200, 200, 400] },
    )
    .toBeGreaterThanOrEqual(2);
}

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

    // These five offsets pin the window and the paging step *exactly*.
    //   +0  and +13 are the initial window's boundaries.
    //   +14 is the first day outside the rendered window. It is still inside
    //       the 15-day *query* range, so its absence proves the rendered
    //       window is 14 days, not the range the query fetches.
    //   +20 is the new upper boundary after one step, forcing step >= 7.
    //   +7  is the new lower boundary after one step, forcing step <= 7.
    // Together the last two pin the step to exactly 7 — offsets {0,13,20}
    // alone would be satisfied by any step from 7 to 13 — and +7/+13 being
    // present in both windows is the 50% overlap.
    for (const offset of [0, 7, 13, 14, 20]) {
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

  test("keeps no outer cap at 2560 while the text measure stays fixed", async ({
    page,
  }) => {
    // The visual harness records these numbers as PR evidence, but it is
    // opt-in and CI never runs it. Keeping the relationship here makes it a
    // permanent regression guard.
    const section = page.getByRole("region", { name: /Today.*5 events/i });
    const row = page.getByRole("button", { name: /Event day 0/ });
    const textMeasure = row.locator(".max-w-\\[72ch\\]");

    const measure = async () => {
      const [sectionBox, rowBox, textBox] = await Promise.all([
        section.boundingBox(),
        row.boundingBox(),
        textMeasure.boundingBox(),
      ]);
      expect(sectionBox).not.toBeNull();
      expect(rowBox).not.toBeNull();
      expect(textBox).not.toBeNull();
      return {
        section: (sectionBox as { width: number }).width,
        row: (rowBox as { width: number }).width,
        text: (textBox as { width: number }).width,
      };
    };

    const wide = await measure();
    expect(wide.section).toBeGreaterThan(1700);
    // The row fills whatever the 168px gutter and the 16px grid gap leave, so
    // it has no cap of its own.
    expect(wide.row).toBeCloseTo(wide.section - GUTTER_WIDTH - GRID_GAP, 0);
    expect(wide.text).toBeLessThan(wide.row);

    // Contract 16 as rendered geometry rather than Tailwind class names.
    const typography = await row.evaluate((element) => {
      const heading = element.querySelector("h3");
      const metadata = element.querySelector<HTMLElement>(
        '[data-testid="schedule-event-metadata"]',
      );
      return {
        height: element.getBoundingClientRect().height,
        titlePx: heading
          ? Number.parseFloat(getComputedStyle(heading).fontSize)
          : -1,
        metadataPx: metadata
          ? Number.parseFloat(getComputedStyle(metadata).fontSize)
          : -1,
      };
    });
    expect(typography.titlePx).toBe(20);
    expect(typography.metadataPx).toBeGreaterThanOrEqual(14);
    expect(typography.height).toBeGreaterThanOrEqual(56);

    await page.setViewportSize({ width: 2560, height: 1440 });
    await settleScheduleWidth(page, wide.section);
    const widest = await measure();

    // The decisive "no outer cap, inner measure only" proof: 640px more
    // viewport reaches the day group and the row in full, while the readable
    // text measure does not grow with it.
    expect(widest.section).toBeGreaterThan(2300);
    expect(widest.row).toBeCloseTo(widest.section - GUTTER_WIDTH - GRID_GAP, 0);
    expect(widest.row).toBeGreaterThan(wide.row + 600);
    expect(widest.text - wide.text).toBeLessThan(50);
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
    // Pinned to the surface top *and* still inside its own day group. A
    // `fixed` or portalled gutter would satisfy the two bounds above while
    // floating over the following day's rows; `position: sticky` cannot leave
    // its containing block, so this is the assertion that tells them apart.
    expect((gutterAfter as { y: number }).y).toBeGreaterThanOrEqual(
      (regionAfter as { y: number }).y,
    );
    expect((gutterAfter as { y: number }).y).toBeLessThan(
      (regionAfter as { y: number }).y +
        (regionAfter as { height: number }).height,
    );
    // Not asserted here: that the gutter *unpins* once its group scrolls past.
    // This fixture's Today group is taller than the surface's scroll range, so
    // it can never be scrolled fully out of view and the gutter stays
    // legitimately pinned — the assertion would be untestable, not merely
    // unwritten.
  });

  test("each event-free stretch collapses into one gap row", async ({
    page,
  }) => {
    // Populated days in the window are +0, +7 and +13, so the two event-free
    // runs are +1..+6 (six days) and +8..+12 (five days). Eleven empty days
    // therefore have to collapse to exactly two rows.
    const gaps = page.getByRole("group", { name: /nothing scheduled/i });
    await expect(gaps).toHaveCount(2);
    for (const gap of await gaps.all()) {
      await expect(gap).not.toHaveAttribute("tabindex");
    }

    const today = parseLocalDate(getTodayDateString());
    const spoken = (offset: number) =>
      format(addDays(today, offset), "EEEE MMMM d, yyyy");
    await expect(
      page.getByRole("group", {
        name: `${spoken(1)} to ${spoken(6)}, nothing scheduled`,
      }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("group", {
        name: `${spoken(8)} to ${spoken(12)}, nothing scheduled`,
      }),
    ).toHaveCount(1);
  });

  test("event rows show the member and resolve the coloured border", async ({
    page,
  }) => {
    const row = page.getByRole("button", { name: /Event day 0/ });
    await expect(row).toContainText("Alice");
    // The *resolved* value, not `element.style` — reading the inline
    // declaration back would still pass if `border-l-4` were dropped and the
    // border rendered at zero width, or if another rule won the cascade.
    const actual = await row.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        color: style.borderLeftColor,
        width: style.borderLeftWidth,
      };
    });
    const expected = await page.evaluate((hex) => {
      const probe = document.createElement("div");
      probe.style.borderLeftColor = hex;
      return probe.style.borderLeftColor;
    }, colorMap.coral.hex);
    expect(actual.color).toBe(expected);
    expect(actual.width).toBe("4px");
  });

  test("selecting a Schedule row opens EventDetailModal", async ({ page }) => {
    await page.getByRole("button", { name: /Event day 0/ }).click();
    await expect(
      page.getByRole("dialog").filter({ hasText: "Event day 0" }),
    ).toBeVisible();
  });

  test("pages a 14-day window by exactly 7 days and back", async ({ page }) => {
    const day = (offset: number) =>
      page.getByText(`Event day ${offset}`, { exact: true });

    // Initial window is offsets 0..13. Day +14 is absent even though the query
    // fetches through +14, so the *rendered* window is exactly 14 days.
    // Each block asserts what must be present before what must be absent, so a
    // still-loading surface can never satisfy it.
    await expect(day(0)).toBeVisible();
    await expect(day(7)).toBeVisible();
    await expect(day(13)).toBeVisible();
    await expect(day(14)).toHaveCount(0);
    await expect(day(20)).toHaveCount(0);

    await page.getByRole("button", { name: "Next" }).click();
    await waitForScheduleLoaded(page);

    // The next window is offsets 7..20. Day +20 present forces start >= 7 and
    // day +7 present forces start <= 7, so the step is exactly 7 — not merely
    // "somewhere between 7 and 13". Days +7 and +13 appearing in both windows
    // are the 7 of 14 overlapping days.
    await expect(day(7)).toBeVisible();
    await expect(day(13)).toBeVisible();
    await expect(day(14)).toBeVisible();
    await expect(day(20)).toBeVisible();
    await expect(day(0)).toHaveCount(0);

    await page.getByRole("button", { name: "Previous" }).click();
    await waitForScheduleLoaded(page);

    await expect(day(0)).toBeVisible();
    await expect(day(7)).toBeVisible();
    await expect(day(13)).toBeVisible();
    await expect(day(14)).toHaveCount(0);
    await expect(day(20)).toHaveCount(0);
  });
});
