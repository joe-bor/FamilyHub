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

    await expect(page.getByRole("heading", { name: "My Lists" })).toBeVisible();
    await page.getByRole("button", { name: "New List" }).click();
    await page.getByLabel("List name").fill("Trader Joe's Run");
    await page.getByRole("radio", { name: "Grocery" }).click();
    await page.getByRole("button", { name: "Create list" }).click();

    await expect(
      page.getByRole("heading", { name: "Trader Joe's Run" }),
    ).toBeVisible();
    await expect(page.getByLabel("Categories")).toHaveValue("grouped");

    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByLabel("Item text").fill("Bananas");
    await page
      .getByRole("combobox", { name: "Category" })
      .selectOption({ label: "Produce" });
    // Wait for the create to be confirmed server-side before triggering the
    // next list mutation; otherwise the category-mode update below can refetch
    // an item-less list and clobber the just-added item.
    const createItemResponse = page.waitForResponse(
      (response) =>
        /\/lists\/[^/]+\/items$/.test(new URL(response.url()).pathname) &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save item" }).click();
    await createItemResponse;

    await expect(page.getByRole("heading", { name: "Produce" })).toBeVisible();
    await expect(page.getByText("Bananas")).toBeVisible();

    // Wait for the list-level update to settle so its response cannot overwrite
    // the subsequent item-completion toggle.
    const updateListResponse = page.waitForResponse((response) => {
      const { pathname } = new URL(response.url());
      return (
        /\/lists\/[^/]+$/.test(pathname) &&
        !pathname.endsWith("/preferences") &&
        response.request().method() === "PATCH"
      );
    });
    await page.getByLabel("Categories").selectOption("flat");
    await updateListResponse;
    await expect(page.getByRole("heading", { name: "Produce" })).toBeHidden();

    await page.getByRole("button", { name: /^Bananas$/ }).click();
    await expect(page.getByText("Bananas")).toHaveCSS(
      "text-decoration-line",
      "line-through",
    );

    await page.getByRole("button", { name: "Remove all completed" }).click();
    await expect(page.getByText("Bananas")).toBeHidden();
  });
});
