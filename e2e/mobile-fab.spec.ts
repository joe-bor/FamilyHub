import { expect, type Page, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  safeClick,
  waitForHydration,
  waitForSheetSettled,
} from "./helpers/test-helpers";

async function expectFabClearsNav(page: Page, fabName: string) {
  const nav = page.getByRole("navigation", { name: /primary/i });
  const fab = page.getByRole("button", { name: fabName });
  await expect(fab).toBeVisible();

  const fabBox = await fab.boundingBox();
  const navBox = await nav.boundingBox();
  const viewport = page.viewportSize();
  if (!fabBox || !navBox || !viewport) {
    throw new Error("Could not read FAB/nav geometry");
  }

  // The FAB's tap target sits above the bottom nav (not occluded by it).
  expect(fabBox.y + fabBox.height / 2).toBeLessThan(navBox.y);
  // The FAB stays fully within the viewport horizontally.
  expect(fabBox.x + fabBox.width).toBeLessThanOrEqual(viewport.width);
}

test.describe("Mobile creation FAB", () => {
  test.beforeEach(async ({ page, request, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");
    await page.goto("/");
    await clearStorage(page);

    const registration = await registerFamily(request, {
      familyName: "FAB E2E Family",
      members: [{ name: "Robin", color: "coral" }],
    });
    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);
  });

  test("Lists landing FAB clears the bottom nav", async ({ page }) => {
    await page
      .getByRole("navigation", { name: /primary/i })
      .getByRole("button", { name: "Lists" })
      .click();
    await expectFabClearsNav(page, "Create list");
  });

  test("Chores FAB clears the bottom nav", async ({ page }) => {
    await page
      .getByRole("navigation", { name: /primary/i })
      .getByRole("button", { name: "Chores" })
      .click();
    await expectFabClearsNav(page, "Add recurring chore");
  });

  test("Recipes library FAB clears the bottom nav", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: /primary/i });
    await safeClick(nav.getByRole("button", { name: "More" }));
    const moreSheet = page.getByRole("dialog", { name: "More" });
    await waitForSheetSettled(moreSheet);
    await safeClick(moreSheet.getByRole("button", { name: "Recipes" }));
    await expect(moreSheet).toBeHidden();
    await expectFabClearsNav(page, "Add recipe");
  });
});
