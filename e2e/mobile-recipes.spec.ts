import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  safeClick,
  waitForHydration,
} from "./helpers/test-helpers";

test.describe("Mobile Recipes", () => {
  const IMPORTABLE_RECIPE_URL =
    "https://www.loveandlemons.com/pancakes-recipe/";

  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");

    await page.goto("/");
    await clearStorage(page);
  });

  test("creates a recipe, favorites it, filters the library, and imports from URL inside the add flow", async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);

    const registration = await registerFamily(request, {
      familyName: "Recipes E2E Family",
      members: [{ name: "Sam", color: "teal" }],
    });

    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);

    const nav = page.getByRole("navigation", { name: /primary/i });
    await safeClick(nav.getByRole("button", { name: "More" }));
    const moreSheet = page.getByRole("dialog", { name: "More" });
    await expect(moreSheet).toBeVisible();
    await safeClick(moreSheet.getByRole("button", { name: "Recipes" }));
    await expect(moreSheet).toBeHidden();

    await expect(
      // exact: true — the app-header h1 holds the family name "Recipes E2E
      // Family", which substring-matches "Recipes" once family data loads.
      page.getByRole("heading", { name: "Recipes", level: 1, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("No recipes yet")).toBeVisible();

    await page.getByRole("button", { name: "Add recipe" }).click();
    const addDialog = page.getByRole("dialog", { name: "Add Recipe" });
    await expect(addDialog).toBeVisible();
    await addDialog.getByRole("button", { name: "Create manually" }).click();

    const createDialog = page.getByRole("dialog", { name: "Create Recipe" });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel("Title").fill("Sunday Pancakes");
    await createDialog
      .getByRole("textbox", { name: "Ingredient 1" })
      .fill("1 cup flour");
    await createDialog
      .getByRole("textbox", { name: "Instruction 1" })
      .fill("Whisk and griddle");
    await createDialog
      .getByRole("textbox", { name: "Tag 1" })
      .fill("Breakfast");
    await createDialog.getByRole("button", { name: "Save recipe" }).click();

    await expect(createDialog).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Sunday Pancakes" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ingredients" }),
    ).toBeVisible();
    await expect(page.getByText("1 cup flour")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Instructions" }),
    ).toBeVisible();
    await expect(page.getByText("Whisk and griddle")).toBeVisible();

    const favoriteButton = page.getByRole("button", {
      name: "Favorite recipe: Sunday Pancakes",
    });
    await expect(favoriteButton).toHaveAttribute("aria-pressed", "false");
    await favoriteButton.click();
    await expect(favoriteButton).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Back to recipes" }).click();
    await expect(
      page.getByRole("button", { name: "Open recipe: Sunday Pancakes" }),
    ).toBeVisible();

    await page.getByLabel("Search recipes").fill("breakfast");
    await expect(
      page.getByRole("button", { name: "Open recipe: Sunday Pancakes" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Favorites only" }).click();
    await expect(
      page.getByRole("button", { name: "Open recipe: Sunday Pancakes" }),
    ).toBeVisible();

    await page.getByLabel("Search recipes").clear();
    await page.getByRole("button", { name: "Add recipe" }).click();
    const secondAddDialog = page.getByRole("dialog", { name: "Add Recipe" });
    await expect(secondAddDialog).toBeVisible();
    await secondAddDialog
      .getByRole("button", { name: "Import from URL" })
      .click();

    const importDialog = page.getByRole("dialog", { name: "Import Recipe" });
    await expect(importDialog).toBeVisible();
    await importDialog.getByLabel("Recipe URL").fill("not-a-url");
    await importDialog.getByRole("button", { name: "Import recipe" }).click();
    await expect(importDialog.getByText("Enter a valid URL")).toBeVisible();

    await importDialog.getByLabel("Recipe URL").fill(IMPORTABLE_RECIPE_URL);
    await importDialog.getByRole("button", { name: "Import recipe" }).click();

    await expect(importDialog).toBeHidden({ timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: /pancakes/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Back to recipes" }),
    ).toBeVisible();
  });
});
