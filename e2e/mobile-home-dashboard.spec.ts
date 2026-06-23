import { expect, test } from "@playwright/test";
import {
  createCalendarEvent,
  registerFamily,
  seedBrowserAuth,
} from "./helpers/api-helpers";
import {
  clearStorage,
  getTodayDateString,
  safeClick,
  waitForHydration,
} from "./helpers/test-helpers";

function getRelativeDateString(daysFromToday: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test.describe("Mobile Home Dashboard", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");

    await page.goto("/");
    await clearStorage(page);
  });

  test("replaces the launcher grid and filters hero, today, and coming up by focused member", async ({
    page,
    request,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "Dashboard Family",
      members: [
        { name: "Alice", color: "coral" },
        { name: "Bob", color: "teal" },
      ],
    });
    const [alice, bob] = registration.family.members;
    const today = getTodayDateString();
    const tomorrow = getRelativeDateString(1);

    await createCalendarEvent(request, registration.token, {
      title: "Alice breakfast",
      startTime: "12:00 AM",
      endTime: "11:59 PM",
      date: today,
      memberId: alice.id,
      isAllDay: true,
    });
    await createCalendarEvent(request, registration.token, {
      title: "Alice pickup",
      startTime: "12:00 AM",
      endTime: "11:59 PM",
      date: today,
      memberId: alice.id,
      isAllDay: true,
    });
    await createCalendarEvent(request, registration.token, {
      title: "Bob practice",
      startTime: "12:00 AM",
      endTime: "11:59 PM",
      date: today,
      memberId: bob.id,
      isAllDay: true,
    });
    await createCalendarEvent(request, registration.token, {
      title: "Bob pickup",
      startTime: "12:00 AM",
      endTime: "11:59 PM",
      date: today,
      memberId: bob.id,
      isAllDay: true,
    });
    await createCalendarEvent(request, registration.token, {
      title: "Bob swim",
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      date: tomorrow,
      memberId: bob.id,
    });

    await seedBrowserAuth(page, registration);

    await page.reload();
    await waitForHydration(page);

    await expect(page.getByTestId("dashboard-header")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Focus on Alice's events" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Focus on Bob's events" }),
    ).toBeVisible();
    await expect(page.getByText("What would you like to do?")).toBeHidden();
    await expect(
      page.getByRole("button", { name: /connect google calendar/i }),
    ).not.toBeVisible();

    await safeClick(
      page.getByRole("button", { name: "Focus on Bob's events" }),
    );

    await expect(
      page.getByRole("button", {
        name: /today: bob (practice|pickup) details/i,
      }),
    ).toBeVisible();
    await expect(page.getByText("Bob pickup")).toBeVisible();
    await expect(page.getByText("Bob swim")).toBeVisible();
    await expect(page.getByText("Alice breakfast")).not.toBeVisible();
    await expect(page.getByText("Alice pickup")).not.toBeVisible();
  });

  test("reuses the existing add-event flow from Home with focused-member defaults", async ({
    page,
    request,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "Home Add Family",
      members: [
        { name: "Alice", color: "coral" },
        { name: "Bob", color: "teal" },
      ],
    });

    await seedBrowserAuth(page, registration);

    await page.reload();
    await waitForHydration(page);

    const nav = page.getByRole("navigation", { name: /primary/i });
    await expect(nav).toBeVisible();

    const bobFocusButton = page.getByRole("button", {
      name: "Focus on Bob's events",
    });
    await safeClick(bobFocusButton);
    await expect(bobFocusButton).toHaveAttribute("aria-pressed", "true");

    await safeClick(page.getByRole("button", { name: "Add event" }));

    const dialog = page.getByRole("dialog", { name: "Add Event" });
    await expect(dialog).toBeVisible();

    await page.getByLabel("Event Name").fill("Bob homework");
    await page.getByRole("switch").click();
    await dialog.getByRole("button", { name: /add event/i }).click();
    await expect(dialog).toBeHidden();

    await expect(
      page.getByRole("button", {
        name: /today: bob homework details/i,
      }),
    ).toBeVisible();

    await nav.getByRole("button", { name: "Calendar" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Add event" })).toBeVisible();

    await nav.getByRole("button", { name: "Home" }).click();
    await expect(page).toHaveURL(/\/$/);
    // Target the agenda entry specifically: the event title now also appears in
    // the "Since you last opened" activity feed (a just-added event surfaces as a
    // calendar change), so a bare getByText("Bob homework") is no longer unique.
    await expect(
      page.getByRole("button", { name: /today: bob homework details/i }),
    ).toBeVisible();
  });
});
