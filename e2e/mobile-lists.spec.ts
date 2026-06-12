import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import { clearStorage, waitForHydration } from "./helpers/test-helpers";

test.describe("Mobile Lists", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");
    await page.goto("/");
    await clearStorage(page);
  });

  test("creates a grocery list, toggles categories, completes an item, and clears completed", async ({
    page,
    request,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "Lists E2E Family",
      members: [{ name: "Alice", color: "coral" }],
    });
    await seedBrowserAuth(page, registration);

    await page.reload();
    await waitForHydration(page);

    const nav = page.getByRole("navigation", { name: /primary/i });
    await nav.getByRole("button", { name: "Lists" }).click();

    await expect(
      page.getByRole("heading", { name: "Lists", level: 1, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "New List" }).click();
    await page.getByLabel("List name").fill("Trader Joe's Run");
    await page.getByRole("radio", { name: "Grocery" }).click();
    await page.getByRole("button", { name: "Create list" }).click();

    await expect(
      page.getByRole("heading", { name: "Trader Joe's Run" }),
    ).toBeVisible();

    // On mobile the set-once controls live behind the "List options" sheet.
    const optionsSheet = page.getByRole("dialog", { name: "List options" });
    const openOptions = async () => {
      await page.getByRole("button", { name: "List options" }).click();
      await expect(optionsSheet).toBeVisible();
      return optionsSheet;
    };

    let options = await openOptions();
    await expect(options.getByLabel("Categories")).toHaveValue("grouped");
    await options.getByRole("button", { name: "Cancel" }).click();
    await expect(optionsSheet).toBeHidden();

    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByLabel("Item text").fill("Bananas");
    await page
      .getByRole("combobox", { name: "Category" })
      .selectOption({ label: "Produce" });
    await page.getByRole("button", { name: "Save item" }).click();

    await expect(page.getByRole("heading", { name: "Produce" })).toBeVisible();
    await expect(page.getByText("Bananas")).toBeVisible();

    // Switch the category mode immediately — the item create may still be in
    // flight, so the list-level PATCH response must not clobber the new item.
    options = await openOptions();
    await options.getByLabel("Categories").selectOption("flat");
    await expect(page.getByRole("heading", { name: "Produce" })).toBeHidden();
    await options.getByRole("button", { name: "Cancel" }).click();
    await expect(optionsSheet).toBeHidden();
    await expect(page.getByText("Bananas")).toBeVisible();

    await page.getByRole("button", { name: /^Bananas$/ }).click();
    await expect(page.getByText("Bananas")).toHaveCSS(
      "text-decoration-line",
      "line-through",
    );

    // "Remove all completed" runs from inside the sheet, which stays open.
    options = await openOptions();
    await options.getByRole("button", { name: "Remove all completed" }).click();
    await expect(page.getByText("Bananas")).toBeHidden();
  });
});
