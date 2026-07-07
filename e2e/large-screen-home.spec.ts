import { expect, test } from "@playwright/test";
import {
  format24hTo12h,
  formatLocalDate,
  getWeekStartSunday,
} from "../src/lib/time-utils";
import {
  completeCurrentChore,
  createCalendarEvent,
  createChoreTemplate,
  createList,
  createListItem,
  registerFamily,
  seedBrowserAuth,
  upsertMealSlot,
} from "./helpers/api-helpers";
import {
  clearStorage,
  getTodayDateString,
  safeClick,
  waitForHydration,
  waitForOfflineCachePersisted,
} from "./helpers/test-helpers";

const FIXED_NOW = new Date(2026, 6, 5, 8, 0, 0);

function to24h(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function eventTime(minutesFromNow: number, durationMinutes = 60) {
  const start = new Date(FIXED_NOW);
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + minutesFromNow);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  return {
    date: formatLocalDate(start),
    startTime: format24hTo12h(to24h(start)),
    endTime: format24hTo12h(to24h(end)),
  };
}

function localDate(daysFromToday = 0) {
  const date = new Date(FIXED_NOW);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);
  return formatLocalDate(date);
}

function currentWeekStart() {
  return formatLocalDate(getWeekStartSunday(FIXED_NOW));
}

test.describe("Large-screen Home", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, "Large-screen only");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.clock.setFixedTime(FIXED_NOW);
    await page.goto("/");
    await clearStorage(page);
  });

  test("fresh launch lands on Home and routes event taps to Calendar", async ({
    page,
    request,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "Large Home Family",
      members: [
        { name: "Alice", color: "coral" },
        { name: "Bob", color: "teal" },
      ],
    });
    const [alice] = registration.family.members;
    const swimTime = eventTime(75);

    await createCalendarEvent(request, registration.token, {
      title: "Swim lesson",
      startTime: swimTime.startTime,
      endTime: swimTime.endTime,
      date: swimTime.date,
      memberId: alice.id,
      isAllDay: false,
    });

    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);

    // Default launch (activeModule: null) renders Home on desktop with no
    // redirect — this is the behavior under test on this branch.
    const home = page.getByTestId("large-home-dashboard");
    await expect(home).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Primary" }).getByRole("button", {
        name: "Home",
      }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("72°")).not.toBeVisible();
    await expect(home.getByText(/recipes/i)).not.toBeVisible();
    await expect(home.getByText(/photos/i)).not.toBeVisible();
    await expect(home.getByText("Swim lesson")).toBeVisible();

    await safeClick(page.getByRole("button", { name: /swim lesson/i }).first());

    await expect(
      page
        .getByRole("navigation", { name: "Primary" })
        .getByRole("button", { name: "Calendar" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("dialog")).toContainText("Swim lesson");
  });

  test("renders sparse and busy days with state-strip summaries routed to their modules", async ({
    page,
    request,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "Visual Matrix Family",
      members: [
        { name: "Alice", color: "coral" },
        { name: "Bob", color: "teal" },
      ],
    });
    const [alice, bob] = registration.family.members;
    const tomorrow = localDate(1);
    const weekStartDate = currentWeekStart();
    const longTitleTime = eventTime(30);
    const swimTime = eventTime(150);
    // The chores board scopes "today" to the real backend clock, not the
    // browser's fixed FIXED_NOW clock — seed activeFrom off the real date.
    const realToday = getTodayDateString();

    await createCalendarEvent(request, registration.token, {
      title:
        "Very long orchestra rehearsal title that should wrap without colliding",
      startTime: longTitleTime.startTime,
      endTime: longTitleTime.endTime,
      date: longTitleTime.date,
      memberId: alice.id,
      isAllDay: false,
    });
    await createCalendarEvent(request, registration.token, {
      title: "Swim lesson",
      startTime: swimTime.startTime,
      endTime: swimTime.endTime,
      date: swimTime.date,
      memberId: bob.id,
      isAllDay: false,
    });
    await createCalendarEvent(request, registration.token, {
      title: "Camp dropoff",
      startTime: "8:00 AM",
      endTime: "8:30 AM",
      date: tomorrow,
      memberId: alice.id,
      isAllDay: false,
    });
    await createChoreTemplate(request, registration.token, {
      title: "Unload dishwasher",
      assignedToMemberId: alice.id,
      cadence: "DAILY",
      activeFrom: realToday,
    });
    await upsertMealSlot(request, registration.token, {
      weekStartDate,
      dayIndex: FIXED_NOW.getDay(),
      mealType: "dinner",
      primary: {
        sourceType: "quick",
        recipeId: null,
        title: "Tacos",
        imageUrl: null,
        note: null,
      },
      extras: [],
      note: null,
      collisionMode: null,
    });
    const groceries = await createList(request, registration.token, {
      name: "Groceries",
      kind: "grocery",
    });
    await createListItem(request, registration.token, groceries.id, {
      text: "Milk",
    });
    await createListItem(request, registration.token, groceries.id, {
      text: "Apples",
    });

    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);

    const home = page.getByTestId("large-home-dashboard");
    await expect(home).toBeVisible();

    // Hero shows the soonest upcoming timed event (long title case).
    await expect(
      home.getByText(/orchestra rehearsal title that should wrap/i),
    ).toBeVisible();
    // Today rail carries the other timed event as a rest-of-day item.
    await expect(home.getByText("Swim lesson")).toBeVisible();
    // Tomorrow peek surfaces tomorrow's event under the "Tomorrow" heading.
    await expect(home.getByRole("heading", { name: "Tomorrow" })).toBeVisible();
    await expect(home.getByText("Camp dropoff")).toBeVisible();

    // State strip summaries route to their owning module.
    await expect(
      home.getByRole("button", { name: /open chores.*1 chore left/i }),
    ).toBeVisible();
    await expect(
      home.getByRole("button", { name: /open meals.*tacos tonight/i }),
    ).toBeVisible();
    await expect(
      home.getByRole("button", { name: /open lists.*2 grocery items/i }),
    ).toBeVisible();

    await safeClick(
      home.getByRole("button", { name: /open chores.*1 chore left/i }),
    );
    await expect(
      page
        .getByRole("navigation", { name: "Primary" })
        .getByRole("button", { name: "Chores" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("renders quiet all-clear states and survives offline with cached data", async ({
    page,
    request,
    context,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "Quiet Home Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    const [alice] = registration.family.members;
    // The chores board scopes "today" to the real backend clock, not the
    // browser's fixed FIXED_NOW clock — seed activeFrom/periodStartDate off
    // the real date.
    const realToday = getTodayDateString();
    const chore = await createChoreTemplate(request, registration.token, {
      title: "Wipe counters",
      assignedToMemberId: alice.id,
      cadence: "DAILY",
      activeFrom: realToday,
    });
    await completeCurrentChore(request, registration.token, chore.id, {
      scope: "TODAY",
      periodStartDate: realToday,
    });

    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);

    const home = page.getByTestId("large-home-dashboard");
    await expect(home).toBeVisible();
    // No events anywhere today: hero reads "All clear today".
    await expect(home.getByText("All clear today")).toBeVisible();
    await expect(home.getByText(/dinner not planned/i)).toBeVisible();
    await expect(home.getByText(/chores done/i)).toBeVisible();
    await expect(home.getByText(/lists quiet/i)).toBeVisible();

    await waitForOfflineCachePersisted(page);
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(home).toBeVisible();
    await expect(home.getByText("All clear today")).toBeVisible();
    await context.setOffline(false);
  });

  test("keeps the dashboard usable across horizontal-tablet, desktop, and large-display viewports", async ({
    page,
    request,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "Responsive Home Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    const [alice] = registration.family.members;
    const next = eventTime(60);
    await createCalendarEvent(request, registration.token, {
      title: "Piano lesson",
      startTime: next.startTime,
      endTime: next.endTime,
      date: next.date,
      memberId: alice.id,
      isAllDay: false,
    });

    await seedBrowserAuth(page, registration);

    for (const viewport of [
      { name: "horizontal-tablet", width: 1024, height: 768 },
      { name: "desktop", width: 1440, height: 900 },
      { name: "large-display", width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.reload();
      await waitForHydration(page);
      const home = page.getByTestId("large-home-dashboard");
      await expect(home).toBeVisible();
      await expect(home.getByText("Piano lesson")).toBeVisible();
    }
  });
});

test.describe("Mobile Home visual baseline", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile baseline only");
    await page.clock.setFixedTime(FIXED_NOW);
    await page.goto("/");
    await clearStorage(page);
  });

  test("keeps existing mobile Home dashboard unaffected by large-screen Home", async ({
    page,
    request,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "Mobile Baseline Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    const [alice] = registration.family.members;
    const next = eventTime(60);
    await createCalendarEvent(request, registration.token, {
      title: "Piano lesson",
      startTime: next.startTime,
      endTime: next.endTime,
      date: next.date,
      memberId: alice.id,
      isAllDay: false,
    });

    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);

    await expect(page.getByTestId("dashboard-header")).toBeVisible();
    await expect(page.getByTestId("large-home-dashboard")).not.toBeVisible();
  });
});
