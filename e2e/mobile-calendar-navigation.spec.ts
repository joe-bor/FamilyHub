import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  switchCalendarView,
  waitForCalendarReady,
  waitForHydration,
} from "./helpers/test-helpers";

// Schedule has no swipe at all (calendar-module.tsx:546), so prev/next is the
// only navigation affordance for the mobile smart-default view.
test.describe("mobile calendar period navigation", () => {
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
    await waitForCalendarReady(page);
  });

  for (const view of ["daily", "weekly", "monthly", "schedule"] as const) {
    test(`prev/next change the context label in ${view}`, async ({ page }) => {
      await switchCalendarView(page, view);

      const label = page.locator(
        '[data-testid="app-header-context"][data-module="calendar"]',
      );
      const before = (await label.textContent())?.trim() ?? "";

      await page.getByRole("button", { name: "Next" }).click();
      await expect(label).not.toHaveText(before);

      await page.getByRole("button", { name: "Previous" }).click();
      await expect(label).toHaveText(before);
    });
  }
});
