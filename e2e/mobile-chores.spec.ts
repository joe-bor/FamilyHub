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

  test("completing a chore updates immediately and persists after reload", async ({
    page,
    request,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "Optimistic Chore Family",
      members: [{ name: "Leo", color: "coral" }],
    });

    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);

    const nav = page.getByRole("navigation", { name: /primary/i });
    await nav.getByRole("button", { name: "Chores" }).click();
    await expect(
      page.getByRole("heading", { name: "Chores", level: 1 }),
    ).toBeVisible();

    // A daily routine lands in the default Today column, so no scope switch.
    await page.getByRole("button", { name: "Add recurring chore" }).click();
    const dialog = page.getByRole("dialog", { name: "New Chore" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/chore name/i).fill("Feed the cat");
    await dialog.getByRole("button", { name: "Daily" }).click();
    await dialog.getByRole("button", { name: "Save Chore" }).click();
    await expect(dialog).toBeHidden();

    const row = page
      .locator('[data-testid^="chore-row-"]')
      .filter({ hasText: "Feed the cat" })
      .first();
    await expect(row).toBeVisible();
    await expect(row.locator("p").first()).not.toHaveClass(/line-through/);

    // Hold the completion response open: for the next ~2.5s the only thing that
    // can flip the row to "done" is the optimistic cache update, not the server.
    await page.route(
      "**/chores/templates/*/current-period-completion",
      async (route) => {
        if (route.request().method() === "PUT") {
          await new Promise((resolve) => setTimeout(resolve, 2500));
        }
        await route.continue();
      },
    );
    const completionPersisted = page.waitForResponse(
      (response) =>
        response.url().includes("current-period-completion") &&
        response.request().method() === "PUT",
    );

    await page
      .getByRole("button", { name: /mark feed the cat complete/i })
      .click();

    // Immediate acknowledgment: the strikethrough shows well before the delayed
    // response. Without the optimistic update this assertion would time out.
    await expect(row.locator("p").first()).toHaveClass(/line-through/, {
      timeout: 1200,
    });

    // Let the real request settle so the completion is persisted server-side.
    await completionPersisted;
    await page.unroute("**/chores/templates/*/current-period-completion");

    // Eventual persistence: a fresh load from the backend still shows it done.
    // Reload drops back to the default view, so re-open Chores before asserting.
    await page.reload();
    await waitForHydration(page);
    await page
      .getByRole("navigation", { name: /primary/i })
      .getByRole("button", { name: "Chores" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Chores", level: 1 }),
    ).toBeVisible();

    const reloadedRow = page
      .locator('[data-testid^="chore-row-"]')
      .filter({ hasText: "Feed the cat" })
      .first();
    await expect(reloadedRow.locator("p").first()).toHaveClass(/line-through/);
  });
});
