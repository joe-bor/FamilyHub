import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import { clearStorage, waitForHydration } from "./helpers/test-helpers";

test.describe("PWA offline banner", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearStorage(page);
  });

  test("appears when offline and clears on reconnect", async ({
    page,
    context,
    request,
  }) => {
    const reg = await registerFamily(request, {
      familyName: "Offline Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    await seedBrowserAuth(page, reg);

    await page.reload();
    await waitForHydration(page);

    const banner = page.getByText(/you're offline/i);
    await expect(banner).toBeHidden();

    await context.setOffline(true);
    await expect(banner).toBeVisible({ timeout: 2000 });
    await expect(banner).toHaveText(/won't save/i);

    await context.setOffline(false);
    await expect(banner).toBeHidden({ timeout: 2000 });
  });
});
