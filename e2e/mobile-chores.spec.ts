import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import { clearStorage, waitForHydration } from "./helpers/test-helpers";

test.describe("Mobile Chores", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");

    await page.goto("/");
    await clearStorage(page);
  });

  test("family can create, complete, uncomplete, and archive a recurring chore", async ({
    page,
    request,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "Chore Test Family",
      members: [
        { name: "Leo", color: "coral" },
        { name: "Maya", color: "teal" },
      ],
    });

    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);

    const nav = page.getByRole("navigation", { name: /primary/i });
    await nav.getByRole("button", { name: "Chores" }).click();
    await expect(
      page.getByRole("heading", { name: "Chores", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("No recurring chores yet")).toBeVisible();

    await page.getByRole("button", { name: "Add recurring chore" }).click();
    const dialog = page.getByRole("dialog", { name: "New Chore" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/chore name/i).fill("Take out trash");
    await dialog.getByRole("button", { name: "Weekly" }).click();
    await dialog.getByRole("button", { name: "Save Chore" }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Week" }).click();
    await expect(page.getByRole("region", { name: "This Week" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "This Week" })).toHaveCount(
      0,
    );
    await expect(page.getByText("1 left of 1")).toBeVisible();

    const row = page
      .locator('[data-testid^="chore-row-"]')
      .filter({ hasText: "Take out trash" })
      .first();
    await expect(row).toBeVisible();

    await page
      .getByRole("button", { name: /mark take out trash complete/i })
      .click();
    await expect(row.locator("p").first()).toHaveClass(/line-through/);

    await page
      .getByRole("button", { name: /mark take out trash incomplete/i })
      .click();
    await expect(row.locator("p").first()).not.toHaveClass(/line-through/);

    await page.getByRole("button", { name: /archive take out trash/i }).click();
    await expect(row).toBeHidden();
    await expect(page.getByText("No recurring chores yet")).toBeVisible();
  });
});
