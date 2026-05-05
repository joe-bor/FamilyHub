import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  createEvent,
  switchCalendarView,
  waitForCalendarReady,
  waitForHydration,
} from "./helpers/test-helpers";

test.describe("Mobile Bottom Navigation", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");

    await page.goto("/");
    await clearStorage(page);
  });

  test("is visible on authenticated mobile surfaces and switches Home/modules", async ({
    page,
    request,
  }) => {
    const reg = await registerFamily(request, {
      familyName: "Bottom Nav Family",
      members: [
        { name: "Alice", color: "coral" },
        { name: "Bob", color: "teal" },
      ],
    });
    await seedBrowserAuth(page, reg);

    await page.reload();
    await waitForHydration(page);

    const nav = page.getByRole("navigation", { name: /primary/i });
    await expect(nav).toBeVisible();

    const expectedTabs = [
      "Home",
      "Calendar",
      "Lists",
      "Chores",
      "Meals",
      "Photos",
    ];
    for (const tab of expectedTabs) {
      await expect(nav.getByRole("button", { name: tab })).toBeVisible();
    }

    await nav.getByRole("button", { name: "Calendar" }).click();
    await expect(page.getByRole("button", { name: "Add event" })).toBeVisible();

    await nav.getByRole("button", { name: "Home" }).click();
    await expect(page.getByTestId("dashboard-header")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Focus on Alice's events" }),
    ).toBeVisible();

    await nav.getByRole("button", { name: "Lists" }).click();
    await expect(page.getByRole("heading", { name: "My Lists" })).toBeVisible();

    await nav.getByRole("button", { name: "Chores" }).click();
    await expect(
      page.getByRole("heading", { name: "Chores", level: 1 }),
    ).toBeVisible();

    await nav.getByRole("button", { name: "Meals" }).click();
    await expect(
      page.getByRole("heading", { name: "Meal Planning" }),
    ).toBeVisible();

    await nav.getByRole("button", { name: "Photos" }).click();
    await expect(
      page.getByRole("heading", { name: "Family Photos" }),
    ).toBeVisible();

    await expect(nav).toBeVisible();
  });

  test("is absent on login", async ({ page }) => {
    await page.reload();
    await waitForHydration(page);

    await expect(page.getByText("Welcome Back!")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: /primary/i }),
    ).not.toBeVisible();
  });

  test("is absent on onboarding", async ({ page }) => {
    await page.reload();
    await waitForHydration(page);

    await page.getByRole("button", { name: "Create an account" }).click();

    await expect(
      page.getByRole("heading", { name: "Welcome to FamilyHub" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: /primary/i }),
    ).not.toBeVisible();
  });

  test("keeps lower weekly events tappable above the bottom nav and FAB", async ({
    page,
    request,
  }) => {
    const reg = await registerFamily(request, {
      familyName: "Calendar Clearance Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    await seedBrowserAuth(page, reg);

    await page.reload();
    await waitForHydration(page);
    await waitForCalendarReady(page);

    await createEvent(page, {
      title: "Saturday Soccer",
      recurrence: { frequency: "weekly-custom", customDays: ["SA"] },
    });

    await switchCalendarView(page, "weekly");

    const weeklyList = page.locator("main div.overflow-y-auto").last();
    await weeklyList.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    const eventCard = page.getByRole("button", { name: /Saturday Soccer/i });
    await expect(eventCard).toBeVisible();

    const box = await eventCard.boundingBox();
    expect(box).not.toBeNull();
    await page.touchscreen.tap(
      box!.x + box!.width / 2,
      box!.y + box!.height / 2,
    );

    await expect(
      page.getByRole("dialog", { name: "Saturday Soccer" }),
    ).toBeVisible();
  });
});
