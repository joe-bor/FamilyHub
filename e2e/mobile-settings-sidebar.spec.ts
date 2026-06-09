import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  safeClick,
  waitForHydration,
} from "./helpers/test-helpers";

test.describe("Mobile menu + More overflow", () => {
  test.beforeEach(async ({ page, request, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");

    await page.goto("/");
    await clearStorage(page);
    const reg = await registerFamily(request, {
      familyName: "Menu Test Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    await seedBrowserAuth(page, reg);
    await page.reload();
    await waitForHydration(page);
  });

  test("More overflow reaches Recipes and closes the sheet", async ({
    page,
  }) => {
    const nav = page.getByRole("navigation", { name: /primary/i });
    // Recipes is an overflow module — not present in the bar.
    await expect(nav.getByRole("button", { name: /^recipes$/i })).toHaveCount(
      0,
    );

    await safeClick(nav.getByRole("button", { name: /^more$/i }));

    const moreSheet = page.getByRole("dialog", { name: /more/i });
    await expect(moreSheet).toBeVisible();

    await safeClick(moreSheet.getByRole("button", { name: /^recipes$/i }));

    // Selecting an overflow module switches the module and closes the sheet.
    await expect(moreSheet).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Recipes", level: 1 }),
    ).toBeVisible();
  });

  test("menu opens from the header and closes via Escape", async ({ page }) => {
    await safeClick(page.getByRole("button", { name: /^menu$/i }));

    // Scope to the side sheet dialog — the family name also appears in the
    // header, so an unscoped text query would match two elements.
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    await expect(menu.getByText("Menu Test Family")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  });
});
