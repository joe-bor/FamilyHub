import { expect, type Page, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  safeClick,
  waitForHydration,
  waitForSheetSettled,
} from "./helpers/test-helpers";

/**
 * Navigate to the weekly Meals board via the bottom-nav "More" sheet — Meals is
 * not a top-level tab on mobile (mobile-meals.spec.ts:18-28).
 */
async function openMealsBoard(page: Page) {
  const nav = page.getByRole("navigation", { name: /primary/i });
  await safeClick(nav.getByRole("button", { name: "More" }));
  const moreSheet = page.getByRole("dialog", { name: "More" });
  await waitForSheetSettled(moreSheet);
  await safeClick(moreSheet.getByRole("button", { name: "Meals" }));
  await expect(moreSheet).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Meals", level: 1, exact: true }),
  ).toBeVisible();
}

test.describe("mobile meals lands on today", () => {
  test.beforeEach(async ({ page, request, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");

    await page.goto("/");
    await clearStorage(page);

    const reg = await registerFamily(request, {
      familyName: "Test Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    await seedBrowserAuth(page, reg);

    await page.reload();
    await waitForHydration(page);
  });

  test("opens with today's card in view and the week still starting Sunday", async ({
    page,
  }) => {
    await openMealsBoard(page);

    const dayCards = page.locator('section[aria-labelledby^="meal-day-"]');
    // Gate on the loaded stack before asserting geometry — an absent card would
    // otherwise make the viewport check vacuous.
    await expect(dayCards.first()).toBeVisible();
    await expect(dayCards).toHaveCount(7);

    const todayCard = page.locator('[aria-current="date"]').first();
    await expect(todayCard).toBeVisible();
    await expect(todayCard).toBeInViewport();

    // It is genuinely today's card, not just any marked card.
    const todayWeekday = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });
    await expect(todayCard).toContainText(todayWeekday);

    // The visible week must still begin on Sunday — the cross-stack BE contract.
    await expect(dayCards.first()).toContainText("Sunday");
  });
});
