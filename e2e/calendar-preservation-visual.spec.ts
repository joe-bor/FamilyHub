import { mkdir } from "node:fs/promises";
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

const preservationOut = process.env.PRESERVATION_OUT_DIR;
test.skip(!preservationOut, "Set PRESERVATION_OUT_DIR for parity evidence");

// Byte-identical comparison needs deterministic rasterisation. Without this,
// `daily-769x1024` differed from ITSELF across runs of origin/main by a single
// pixel at +/-1 per channel — subpixel text anti-aliasing, not a code change.
// These live in the spec, not playwright.config.ts, because the preservation
// runner copies only this file into the origin/main worktree; a config-level
// flag would apply to one side of the comparison only.
test.use({
  launchOptions: {
    args: [
      "--disable-lcd-text",
      "--force-color-profile=srgb",
      "--disable-font-subpixel-positioning",
      "--disable-partial-raster",
      "--disable-skia-runtime-opts",
    ],
  },
});

const preservedCases = [
  ["monthly", 375, 812],
  ["monthly", 768, 1024],
  ["monthly", 769, 1024],
  ["schedule", 375, 812],
  ["schedule", 768, 1024],
  ["schedule", 769, 1024],
  ["weekly", 375, 812],
  ["weekly", 768, 1024],
  ["weekly", 769, 1024],
  ["daily", 375, 812],
  ["daily", 768, 1024],
  ["daily", 769, 1024],
] as const;

/**
 * Hold until every scroller has stopped moving.
 *
 * Day and Week auto-scroll to "now" on mount, and `useAutoScrollToNow` passes
 * `behavior: "smooth"` unconditionally — it does not consult reduced-motion the
 * way its sibling `useAutoScrollToMinutes` does. Emulating reduced motion
 * therefore does not stop it, and a capture taken two frames after load lands
 * at a different point along the easing curve each run: `daily-769x1024`
 * differed between two runs of identical source by a 3px vertical offset.
 * Without this the gate is unreliable in both directions — it could equally
 * hide a real regression behind a scroll that had not finished.
 */
async function waitForScrollSettled(page: import("@playwright/test").Page) {
  let previous = "";
  let stableSamples = 0;
  await expect
    .poll(
      async () => {
        const signature = await page.evaluate(() =>
          Array.from(document.querySelectorAll("*"))
            .filter(
              (element) => element.scrollTop > 0 || element.scrollLeft > 0,
            )
            .map((element) => `${element.scrollTop}:${element.scrollLeft}`)
            .join("|"),
        );
        stableSamples = signature === previous ? stableSamples + 1 : 0;
        previous = signature;
        return stableSamples;
      },
      { timeout: 15_000, intervals: [120, 120, 120, 200, 200, 400] },
    )
    .toBeGreaterThanOrEqual(3);
}

const desktopLabels = {
  monthly: "Month",
  schedule: "Schedule",
  weekly: "Week",
  daily: "Day",
} as const;
const mobileLabels = {
  monthly: "Monthly view",
  schedule: "Schedule view",
  weekly: "Weekly view",
  daily: "Daily view",
} as const;

for (const [view, width, height] of preservedCases) {
  test(`${view} is pixel-identical at ${width}x${height}`, async ({
    page,
    request,
  }) => {
    if (!preservationOut) {
      throw new Error("PRESERVATION_OUT_DIR is required");
    }

    await page.clock.setFixedTime(new Date(2026, 7, 15, 12, 0, 0));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await clearStorage(page);

    const reg = await registerFamily(request, {
      familyName: "Calendar Preservation",
      members: [{ name: "Alice", color: "coral" }],
    });
    await createCalendarEvent(request, reg.token, {
      title: "Baseline event",
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
    await switchCalendarView(page, view);

    const desktopButton = page
      .getByTestId("view-switcher")
      .getByRole("button", { name: desktopLabels[view] });
    if (await desktopButton.isVisible().catch(() => false)) {
      await expect(desktopButton).toHaveClass(/bg-background/);
    } else {
      await expect(
        page.getByRole("button", { name: mobileLabels[view] }),
      ).toHaveClass(/bg-primary/);
    }
    await expect(page.getByText("Baseline event").first()).toBeVisible();

    await page.evaluate(() => document.fonts.ready);
    await waitForScrollSettled(page);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await mkdir(preservationOut, { recursive: true });
    await page.screenshot({
      path: `${preservationOut}/${view}-${width}x${height}.png`,
      fullPage: true,
    });
  });
}
