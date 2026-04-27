import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import { clearStorage, waitForHydration } from "./helpers/test-helpers";

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

    await page.getByRole("button", { name: "Calendar" }).click();
    await expect(page.getByRole("button", { name: "Add event" })).toBeVisible();

    await page.getByRole("button", { name: "Home" }).click();
    await expect(
      page.getByRole("heading", { name: "Home", level: 1 }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Lists" }).click();
    await expect(page.getByRole("heading", { name: "My Lists" })).toBeVisible();

    await page.getByRole("button", { name: "Chores" }).click();
    await expect(
      page.getByRole("heading", { name: "Today's Chores" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Meals" }).click();
    await expect(
      page.getByRole("heading", { name: "Meal Planning" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Photos" }).click();
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

  test("is absent on onboarding/setup", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("family-hub-auth-token", "setup-only-token");
    });

    await page.reload();
    await waitForHydration(page);

    await expect(
      page.getByRole("heading", { name: "Welcome to FamilyHub" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: /primary/i }),
    ).not.toBeVisible();
  });
});
