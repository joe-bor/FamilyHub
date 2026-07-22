import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  createCalendarEvent,
  registerFamily,
  seedBrowserAuth,
} from "./helpers/api-helpers";
import {
  clearStorage,
  switchCalendarView,
  waitForCalendarReady,
  waitForHydration,
} from "./helpers/test-helpers";

const evidenceRoot = process.env.CALENDAR_VISUAL_OUT_DIR;
test.skip(!evidenceRoot, "Set CALENDAR_VISUAL_OUT_DIR for visual evidence");

const monthViewports = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 769, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
] as const;

/** The two large-screen widths every scenario is photographed at. */
const scenarioViewports = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
] as const;

/** Mirrors month-capacity.ts; kept local so the browser proves the real DOM. */
const MONTH_ROW_GAP = 8;
const MONTH_MIN_ROW_HEIGHT = 96;

async function settleAndCapture(
  page: import("@playwright/test").Page,
  relativePath: string,
  // "state" is for the loading/error surfaces, which have no grid to measure
  // and have each asserted their own state before calling.
  options: { surface?: "grid" | "state" } = {},
) {
  if (!evidenceRoot) throw new Error("CALENDAR_VISUAL_OUT_DIR is required");
  const directory = `${evidenceRoot}/${relativePath.substring(0, relativePath.lastIndexOf("/"))}`;
  await mkdir(directory, { recursive: true });
  if (options.surface !== "state") {
    // Two separate races make an immediate capture dishonest:
    //  1. crossing the 1024px gate changes the fetched range, so the surface is
    //     briefly the loading skeleton — an earlier revision of this harness
    //     photographed exactly that at 1024x768 and called it the month grid;
    //  2. a resize does not reach the DOM until the ResizeObserver callback and
    //     the resulting React render have run, so the cells still carry the
    //     previous viewport's row height.
    // Settle on a *stable* row height rather than on the height formula: when
    // the rows overflow, the container is content-sized and the formula holds
    // for the stale layout too (see waitForMeasuredRowHeight).
    let previous = Number.NaN;
    let stableSamples = 0;
    await expect
      .poll(
        async () => {
          const state = await page.evaluate(() => {
            const cell = document.querySelector<HTMLElement>(
              '[role="grid"] [role="rowgroup"] [role="gridcell"]',
            );
            return {
              loading: Boolean(
                document.querySelector(
                  '[role="status"][aria-label="Loading month"]',
                ),
              ),
              // Below 1024px Month renders the compact/mobile path, which has
              // no measured rowgroup at all.
              isLargeScreen: window.matchMedia("(min-width: 1024px)").matches,
              height: cell ? cell.getBoundingClientRect().height : -1,
            };
          });
          if (state.loading) {
            stableSamples = 0;
            previous = Number.NaN;
            return 0;
          }
          if (!state.isLargeScreen) return 2;
          stableSamples =
            state.height > 0 && state.height === previous
              ? stableSamples + 1
              : 0;
          previous = state.height;
          return stableSamples;
        },
        { timeout: 15_000, intervals: [120, 120, 120, 200, 200, 400] },
      )
      .toBeGreaterThanOrEqual(2);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({
    path: `${evidenceRoot}/${relativePath}`,
    fullPage: true,
  });
}

async function renderedTextContrast(
  locator: import("@playwright/test").Locator,
  backgroundAncestor?: string,
): Promise<number> {
  return locator.evaluate((element, ancestorSelector) => {
    const requestedBackground = ancestorSelector
      ? element.closest(ancestorSelector)
      : element;
    if (!requestedBackground) {
      throw new Error("Contrast background was not found");
    }

    type Rgba = [number, number, number, number];
    const rgba = (cssColor: string): Rgba => {
      // Canvas converts rgb()/oklch()/other supported CSS colours to sRGB and
      // preserves alpha. Normalize all four channels before compositing.
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("2D canvas is unavailable");
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = cssColor;
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue, alpha] = Array.from(
        context.getImageData(0, 0, 1, 1).data,
      );
      return [red / 255, green / 255, blue / 255, alpha / 255];
    };
    const over = (foreground: Rgba, backdrop: Rgba): Rgba => {
      const alpha = foreground[3] + backdrop[3] * (1 - foreground[3]);
      if (alpha === 0) return [0, 0, 0, 0];
      return [
        (foreground[0] * foreground[3] +
          backdrop[0] * backdrop[3] * (1 - foreground[3])) /
          alpha,
        (foreground[1] * foreground[3] +
          backdrop[1] * backdrop[3] * (1 - foreground[3])) /
          alpha,
        (foreground[2] * foreground[3] +
          backdrop[2] * backdrop[3] * (1 - foreground[3])) /
          alpha,
        alpha,
      ];
    };
    const luminance = (color: Rgba): number => {
      const linear = color
        .slice(0, 3)
        .map((value) =>
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
        );
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };

    // Resolve translucent surfaces against every ancestor. The app currently
    // supports a light canvas, so opaque white is the final page backdrop.
    const layers: Rgba[] = [];
    // Start at the text element so any translucent intermediate wrapper before
    // the requested surface is included too.
    for (let node: Element | null = element; node; node = node.parentElement) {
      layers.push(rgba(getComputedStyle(node).backgroundColor));
    }
    let renderedBackground: Rgba = [1, 1, 1, 1];
    for (let index = layers.length - 1; index >= 0; index--) {
      renderedBackground = over(layers[index], renderedBackground);
    }
    const renderedForeground = over(
      rgba(getComputedStyle(element).color),
      renderedBackground,
    );
    const foregroundLuminance = luminance(renderedForeground);
    const backgroundLuminance = luminance(renderedBackground);
    return (
      (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
    );
  }, backgroundAncestor);
}

/**
 * Block until the measured row height the ResizeObserver produced has actually
 * reached the DOM, then prove the observer-to-render wiring.
 *
 * Counting slots straight after `setViewportSize` reads the *previous*
 * viewport's layout: the observer callback, the React state update and the
 * re-render all land after the resize returns.
 *
 * The wait is a stability check, deliberately NOT the height formula. When the
 * rows overflow, the weeks container is content-sized, so
 * `monthRowHeight(containerHeight)` is self-consistent at *any* row height —
 * including the stale one — and a formula-based wait returns true immediately
 * on the previous viewport's layout. That is exactly how a 2560px measurement
 * leaked into the 1024x768 capacity count. Settle first, then assert the
 * formula as a proof rather than using it as the gate.
 */
async function waitForMeasuredRowHeight(
  grid: import("@playwright/test").Locator,
  weekCount: number,
): Promise<number> {
  let previous = Number.NaN;
  let stableSamples = 0;
  await expect
    .poll(
      async () => {
        const height = await grid.evaluate((element) => {
          const cell = element.querySelector<HTMLElement>(
            '[role="rowgroup"] [role="gridcell"]',
          );
          return cell ? cell.getBoundingClientRect().height : -1;
        });
        stableSamples =
          height > 0 && height === previous ? stableSamples + 1 : 0;
        previous = height;
        return stableSamples;
      },
      { timeout: 15_000, intervals: [120, 120, 120, 200, 200, 400] },
    )
    .toBeGreaterThanOrEqual(2);

  const proof = await grid.evaluate(
    (element, { weeks, rowGap, minRowHeight }) => {
      const rowgroup = element.querySelector('[role="rowgroup"]');
      const cell = rowgroup?.querySelector<HTMLElement>('[role="gridcell"]');
      if (!rowgroup || !cell) return null;
      const containerHeight = rowgroup.getBoundingClientRect().height;
      return {
        rendered: cell.getBoundingClientRect().height,
        expected: Math.max(
          minRowHeight,
          Math.floor((containerHeight - rowGap * (weeks - 1)) / weeks),
        ),
        renderedWeeks: rowgroup.querySelectorAll(':scope > [role="row"]')
          .length,
      };
    },
    {
      weeks: weekCount,
      rowGap: MONTH_ROW_GAP,
      minRowHeight: MONTH_MIN_ROW_HEIGHT,
    },
  );
  expect(proof).not.toBeNull();
  const { rendered, expected, renderedWeeks } = proof as {
    rendered: number;
    expected: number;
    renderedWeeks: number;
  };
  expect(renderedWeeks).toBe(weekCount);
  expect(Math.abs(rendered - expected)).toBeLessThanOrEqual(1);
  expect(rendered).toBeGreaterThanOrEqual(MONTH_MIN_ROW_HEIGHT);
  return rendered;
}

async function renderedOpacity(
  locator: import("@playwright/test").Locator,
): Promise<number> {
  return locator.evaluate((element) => {
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) {
      opacity *= Number.parseFloat(getComputedStyle(node).opacity);
    }
    return opacity;
  });
}

test("Month viewport matrix and measured capacity proof", async ({
  page,
  request,
}) => {
  await page.clock.setFixedTime(new Date(2026, 7, 15, 12, 0, 0));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await clearStorage(page);

  const reg = await registerFamily(request, {
    familyName: "Calendar Visual Matrix",
    members: [
      { name: "Alice", color: "coral" },
      { name: "Bob", color: "teal" },
      { name: "Charlie", color: "purple" },
    ],
  });

  for (const date of ["2026-08-15", "2026-04-15"]) {
    for (let index = 0; index < 10; index++) {
      await createCalendarEvent(request, reg.token, {
        title:
          index === 0
            ? "A deliberately very long family event title for visual truncation"
            : `Busy event ${index}`,
        date,
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        memberId: reg.family.members[index % 3].id,
        isAllDay: false,
      });
    }
  }
  await createCalendarEvent(request, reg.token, {
    title: "Family trip",
    date: "2026-08-07",
    endDate: "2026-08-11",
    startTime: "12:00 AM",
    endTime: "11:59 PM",
    memberId: reg.family.members[0].id,
    isAllDay: true,
  });
  await createCalendarEvent(request, reg.token, {
    title: "Daily medicine",
    date: "2026-08-03",
    startTime: "8:00 AM",
    endTime: "8:15 AM",
    memberId: reg.family.members[1].id,
    isAllDay: false,
    // Released backend v1.9.0 accepts UNTIL but not COUNT.
    recurrenceRule: "FREQ=DAILY;UNTIL=20260805",
  });
  await createCalendarEvent(request, reg.token, {
    title: "Adjacent month event",
    date: "2026-07-31",
    startTime: "4:00 PM",
    endTime: "5:00 PM",
    memberId: reg.family.members[0].id,
    isAllDay: false,
  });

  await seedBrowserAuth(page, reg);
  await page.reload();
  await waitForHydration(page);
  await waitForCalendarReady(page);
  await switchCalendarView(page, "monthly");

  for (const viewport of monthViewports) {
    await page.setViewportSize(viewport);
    await settleAndCapture(
      page,
      `month/${viewport.width}x${viewport.height}/busy.png`,
    );
  }

  await page.setViewportSize({ width: 1024, height: 768 });
  const augustGrid = page.getByRole("grid", { name: "August 2026" });
  await expect(
    augustGrid.locator('[role="rowgroup"] > [role="row"]'),
  ).toHaveCount(6);
  const sixWeekRowHeight = await waitForMeasuredRowHeight(augustGrid, 6);
  const augustCell = augustGrid.locator('[data-date="2026-08-15"]');
  const adjacentChip = augustGrid
    .locator('[data-date="2026-07-31"]')
    .getByTestId("month-event-chip")
    .filter({ hasText: "Adjacent month event" });
  await expect(adjacentChip).toBeVisible();
  expect(await renderedOpacity(adjacentChip)).toBeCloseTo(1, 5);
  const sixWeekCapacity = await augustCell
    .locator(
      '[data-testid="month-event-chip"], [data-testid="month-slot-blank"], [data-testid="month-overflow-summary"]',
    )
    .count();
  const overflowSummary = augustCell.getByTestId("month-overflow-summary");
  await expect(overflowSummary).toBeVisible();
  expect(
    await renderedTextContrast(overflowSummary, '[role="gridcell"]'),
  ).toBeGreaterThanOrEqual(4.5);

  // Six weeks at 1024x768 sit on the MONTH_MIN_ROW_HEIGHT floor (asserted by
  // waitForMeasuredRowHeight) and therefore overflow. That is the spec's
  // accepted trade — but only while the overflow stays *reachable*: the grid
  // has to scroll to the last week rather than clip it away permanently.
  const sixWeekOverflow = await augustGrid.evaluate((element) => {
    const scroller = element as HTMLElement;
    const before = scroller.scrollTop;
    scroller.scrollTop = scroller.scrollHeight;
    const reached = scroller.scrollTop;
    scroller.scrollTop = before;
    return {
      overflows: scroller.scrollHeight > scroller.clientHeight,
      canScroll: reached > 0,
    };
  });
  if (sixWeekOverflow.overflows) {
    expect(sixWeekOverflow.canScroll).toBe(true);
  }

  for (let step = 0; step < 4; step++) {
    await page.getByRole("button", { name: "Previous" }).click();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const aprilGrid = page.getByRole("grid", { name: "April 2026" });
  await expect(
    aprilGrid.locator('[role="rowgroup"] > [role="row"]'),
  ).toHaveCount(5);
  const fiveWeekRowHeight = await waitForMeasuredRowHeight(aprilGrid, 5);
  const aprilCell = aprilGrid.locator('[data-date="2026-04-15"]');
  const fiveWeekCapacity = await aprilCell
    .locator(
      '[data-testid="month-event-chip"], [data-testid="month-slot-blank"], [data-testid="month-overflow-summary"]',
    )
    .count();
  // Both days carry ten events, so each cell saturates its measured capacity
  // and these counts are the observed capacity rather than the event count.
  expect(fiveWeekCapacity).toBeGreaterThan(sixWeekCapacity);

  // Five weeks at 1440x900 must consume the height rather than leave dead
  // space under the last week — the whole point of measuring the container.
  const fiveWeekFill = await aprilGrid.evaluate((element) => {
    const rows = element.querySelectorAll('[role="rowgroup"] > [role="row"]');
    const last = rows[rows.length - 1];
    if (!last) return null;
    return {
      lastBottom: last.getBoundingClientRect().bottom,
      gridBottom: element.getBoundingClientRect().bottom,
    };
  });
  expect(fiveWeekFill).not.toBeNull();
  const { lastBottom, gridBottom } = fiveWeekFill as {
    lastBottom: number;
    gridBottom: number;
  };
  expect(lastBottom).toBeGreaterThanOrEqual(gridBottom - 24);
  expect(lastBottom).toBeLessThanOrEqual(gridBottom + 2);
  await settleAndCapture(page, "month/1440x900/five-week-capacity.png");

  if (!evidenceRoot) throw new Error("CALENDAR_VISUAL_OUT_DIR is required");
  await writeFile(
    `${evidenceRoot}/month/capacity.json`,
    `${JSON.stringify(
      {
        sixWeek: {
          month: "August 2026",
          viewport: "1024x768",
          rowHeight: sixWeekRowHeight,
          slots: sixWeekCapacity,
        },
        fiveWeek: {
          month: "April 2026",
          viewport: "1440x900",
          rowHeight: fiveWeekRowHeight,
          slots: fiveWeekCapacity,
        },
      },
      null,
      2,
    )}\n`,
  );
});

test("Month sparse", async ({ page, request }) => {
  await page.clock.setFixedTime(new Date(2026, 7, 15, 12, 0, 0));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await clearStorage(page);

  const reg = await registerFamily(request, {
    familyName: "Calendar Sparse",
    members: [{ name: "Alice", color: "coral" }],
  });
  await createCalendarEvent(request, reg.token, {
    title: "Dentist",
    date: "2026-08-15",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
    memberId: reg.family.members[0].id,
    isAllDay: false,
  });

  await seedBrowserAuth(page, reg);
  await page.reload();
  await waitForHydration(page);
  await waitForCalendarReady(page);
  await switchCalendarView(page, "monthly");

  const cell = page.locator('[role="gridcell"][data-date="2026-08-15"]');
  await expect(cell.getByTestId("month-event-chip")).toHaveCount(1);
  await expect(cell.getByTestId("month-overflow-summary")).toHaveCount(0);

  for (const viewport of scenarioViewports) {
    await page.setViewportSize(viewport);
    await settleAndCapture(
      page,
      `month/${viewport.width}x${viewport.height}/sparse.png`,
    );
  }
});

test("Month four-row February", async ({ page, request }) => {
  await page.clock.setFixedTime(new Date(2026, 1, 15, 12, 0, 0));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await clearStorage(page);

  const reg = await registerFamily(request, {
    familyName: "Calendar February",
    members: [{ name: "Alice", color: "coral" }],
  });
  await createCalendarEvent(request, reg.token, {
    title: "Valentine brunch",
    date: "2026-02-14",
    startTime: "10:00 AM",
    endTime: "11:00 AM",
    memberId: reg.family.members[0].id,
    isAllDay: false,
  });

  await seedBrowserAuth(page, reg);
  await page.reload();
  await waitForHydration(page);
  await waitForCalendarReady(page);
  await switchCalendarView(page, "monthly");

  const februaryGrid = page.getByRole("grid", { name: "February 2026" });
  // 2026-02-01 is a Sunday and 2026-02-28 a Saturday: exactly four rows, with
  // no leading or trailing adjacent-month cells at all.
  await expect(
    februaryGrid.locator('[role="rowgroup"] > [role="row"]'),
  ).toHaveCount(4);
  await expect(februaryGrid.getByRole("gridcell")).toHaveCount(28);

  for (const viewport of scenarioViewports) {
    await page.setViewportSize(viewport);
    await settleAndCapture(
      page,
      `month/${viewport.width}x${viewport.height}/february-four-rows.png`,
    );
  }
});

test("Month overflow popover", async ({ page, request }) => {
  await page.clock.setFixedTime(new Date(2026, 7, 15, 12, 0, 0));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await clearStorage(page);

  const reg = await registerFamily(request, {
    familyName: "Calendar Overflow",
    members: [
      { name: "Alice", color: "coral" },
      { name: "Bob", color: "teal" },
    ],
  });
  for (let index = 0; index < 10; index++) {
    await createCalendarEvent(request, reg.token, {
      title: `Busy event ${index}`,
      date: "2026-08-15",
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      memberId: reg.family.members[index % 2].id,
      isAllDay: false,
    });
  }

  await seedBrowserAuth(page, reg);
  await page.reload();
  await waitForHydration(page);
  await waitForCalendarReady(page);
  await switchCalendarView(page, "monthly");

  for (const viewport of scenarioViewports) {
    await page.setViewportSize(viewport);
    const cell = page.locator('[role="gridcell"][data-date="2026-08-15"]');
    await expect(cell.getByTestId("month-overflow-summary")).toBeVisible();
    await cell.click();
    const dialog = page.getByRole("dialog", { name: /events for/i });
    await expect(dialog).toBeVisible();
    // The popover is the complete day: all ten events plus "Open in Day view".
    await expect(
      dialog.getByRole("button", { name: /Busy event/ }),
    ).toHaveCount(10);
    await expect(
      dialog.getByRole("button", { name: /open in day view/i }),
    ).toBeVisible();

    // "Complete event list" means reachable, not merely rendered. Anchored to a
    // mid-grid cell the popover opens upward, and without a height bound it ran
    // off the top of the window and cut off its own date heading.
    //
    // Measure only once Radix has positioned and animated it: a boundingBox
    // read straight after toBeVisible() catches the pre-position frame and
    // reports a wildly off-screen origin that is not what renders.
    await dialog.evaluate((element) =>
      Promise.all(
        element.getAnimations({ subtree: true }).map((a) => a.finished),
      ).then(() => undefined),
    );
    const geometry = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height };
    });
    console.log(
      `POPOVER ${viewport.width}x${viewport.height}: top=${geometry.top} bottom=${geometry.bottom} height=${geometry.height}`,
    );
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom).toBeLessThanOrEqual(viewport.height);

    await settleAndCapture(
      page,
      `month/${viewport.width}x${viewport.height}/overflow-popover.png`,
    );
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  }
});

test("Month missing-member fallback", async ({ page, request }) => {
  await page.clock.setFixedTime(new Date(2026, 7, 15, 12, 0, 0));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await clearStorage(page);

  // A real family stays mounted throughout: the authenticated shell routes a
  // family with no members to onboarding, so a zero-member Calendar screenshot
  // would be a fabrication.
  //
  // The plan reached this state by rewriting one event's memberId to a random
  // UUID, but that is unreachable in the shipped app: calendar-module filters
  // on `filter.selectedMembers.includes(event.memberId)`, and selectedMembers
  // is seeded from the family, so an id that was never a member is dropped
  // before any chip renders. The genuinely reachable window is the stale one
  // the contract actually names — the family loses a member while the
  // persisted filter still holds that member's id. family-filter-pills only
  // re-initialises when NO selected id survives, so with Alice still present
  // Bob's id stays selected and his event keeps rendering without a member.
  const reg = await registerFamily(request, {
    familyName: "Calendar Missing Member",
    members: [
      { name: "Alice", color: "coral" },
      { name: "Bob", color: "teal" },
    ],
  });
  const bob = reg.family.members[1];
  await createCalendarEvent(request, reg.token, {
    title: "Missing member fixture",
    date: "2026-08-15",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
    memberId: bob.id,
    isAllDay: false,
  });

  await seedBrowserAuth(page, reg);
  await page.reload();
  await waitForHydration(page);
  await waitForCalendarReady(page);
  await switchCalendarView(page, "monthly");

  // Baseline: while Bob is a member the chip names him normally. This is what
  // makes the fallback below a real transition rather than a starting state.
  const chip = page
    .getByTestId("month-event-chip")
    .filter({ hasText: "Missing member fixture" });
  await expect(chip.getByTestId("month-chip-member")).toHaveText("Bob");

  // Bob leaves the family. Three things have to line up for the reload to see
  // that, and only the calendar filter may survive it:
  //  1. the API stops returning Bob;
  //  2. useFamily's localStorage `initialData` seed stops returning Bob;
  //  3. the persisted IndexedDB query cache is dropped — it rehydrates ahead of
  //     initialData with a fresh dataUpdatedAt, and useFamily's 5-minute
  //     staleTime then suppresses the corrective refetch entirely.
  // The Zustand-persisted calendar filter lives in localStorage and is left
  // alone, which is what keeps Bob's id selected.
  await page.route("**/api/family**", async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as {
      data: { members: Array<{ id: string }> };
    };
    body.data.members = body.data.members.filter(
      (member) => member.id !== bob.id,
    );
    await route.fulfill({ response, json: body });
  });
  await page.evaluate(
    async ({ familyKey, departedId, dbName }) => {
      const raw = localStorage.getItem(familyKey);
      if (raw) {
        const stored = JSON.parse(raw) as {
          state?: { family?: { members?: Array<{ id: string }> } };
        };
        const members = stored.state?.family?.members;
        if (members) {
          stored.state.family.members = members.filter(
            (member) => member.id !== departedId,
          );
          localStorage.setItem(familyKey, JSON.stringify(stored));
        }
      }
      await new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      });
    },
    {
      familyKey: "family-hub-family",
      departedId: bob.id,
      dbName: "family-hub-offline",
    },
  );
  await page.reload();
  await waitForHydration(page);
  await waitForCalendarReady(page);
  await switchCalendarView(page, "monthly");

  await expect(chip).toHaveClass(/bg-muted/);
  await expect(chip).toHaveClass(/text-foreground/);
  expect(await renderedTextContrast(chip)).toBeGreaterThanOrEqual(4.5);
  // Member identity is never colour-only: the stale row still names itself.
  await expect(chip.getByTestId("month-chip-member")).toHaveText("Unknown");

  for (const viewport of scenarioViewports) {
    await page.setViewportSize(viewport);
    await settleAndCapture(
      page,
      `month/${viewport.width}x${viewport.height}/missing-member.png`,
    );
  }
});

test("Month empty", async ({ page, request }) => {
  await page.clock.setFixedTime(new Date(2026, 7, 15, 12, 0, 0));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await clearStorage(page);

  const reg = await registerFamily(request, {
    familyName: "Calendar Empty",
    members: [
      { name: "Alice", color: "coral" },
      { name: "Bob", color: "teal" },
      { name: "Charlie", color: "purple" },
    ],
  });

  await seedBrowserAuth(page, reg);
  await page.reload();
  await waitForHydration(page);
  await waitForCalendarReady(page);
  await switchCalendarView(page, "monthly");

  // A cached empty response is valid data: the normal grid renders, never the
  // offline cold-cache copy.
  const grid = page.getByRole("grid", { name: "August 2026" });
  await expect(grid).toBeVisible();
  await expect(page.getByTestId("month-event-chip")).toHaveCount(0);
  await expect(page.getByText(/isn't cached/i)).toHaveCount(0);

  for (const viewport of scenarioViewports) {
    await page.setViewportSize(viewport);
    await settleAndCapture(
      page,
      `month/${viewport.width}x${viewport.height}/empty.png`,
    );
  }
});

test("Month loading", async ({ page, request }) => {
  await page.clock.setFixedTime(new Date(2026, 7, 15, 12, 0, 0));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await clearStorage(page);

  const reg = await registerFamily(request, {
    familyName: "Calendar Loading",
    members: [{ name: "Alice", color: "coral" }],
  });

  let release: (() => void) | undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/calendar/events?**", async (route) => {
    await held;
    await route.continue();
  });

  try {
    await seedBrowserAuth(page, reg);
    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);
    await switchCalendarView(page, "monthly");

    await expect(
      page.getByRole("status", { name: /loading month/i }),
    ).toBeVisible();
    for (const viewport of scenarioViewports) {
      await page.setViewportSize(viewport);
      await settleAndCapture(
        page,
        `month/${viewport.width}x${viewport.height}/loading.png`,
        { surface: "state" },
      );
    }
  } finally {
    release?.();
  }
});

test("Month error and retry", async ({ page, request }) => {
  await page.clock.setFixedTime(new Date(2026, 7, 15, 12, 0, 0));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await clearStorage(page);

  const reg = await registerFamily(request, {
    familyName: "Calendar Error",
    members: [{ name: "Alice", color: "coral" }],
  });

  // Online HTTP 500 is where "Try again" is a real action; the offline
  // cold-cache path deliberately does not offer it.
  await page.route("**/api/calendar/events?**", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "Internal Server Error" }),
    });
  });

  await seedBrowserAuth(page, reg);
  await page.reload();
  await waitForHydration(page);
  await waitForCalendarReady(page);
  await switchCalendarView(page, "monthly");

  const retry = page.getByRole("button", { name: /try again/i });
  await expect(retry).toBeVisible({ timeout: 30_000 });

  for (const viewport of scenarioViewports) {
    await page.setViewportSize(viewport);
    await settleAndCapture(
      page,
      `month/${viewport.width}x${viewport.height}/error.png`,
      { surface: "state" },
    );
  }
});
