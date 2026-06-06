import { expect, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  safeClick,
  waitForHydration,
} from "./helpers/test-helpers";

test.describe("Mobile Meals", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only tests");

    await page.goto("/");
    await clearStorage(page);
  });

  test("plans quick meals and recipe-backed meals from the weekly board", async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);

    const registration = await registerFamily(request, {
      familyName: "Weekly Planner Crew",
      members: [{ name: "Sam", color: "teal" }],
    });

    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);

    const nav = page.getByRole("navigation", { name: /primary/i });
    await safeClick(nav.getByRole("button", { name: "Meals" }));

    await expect(
      page.getByRole("heading", { name: "Meals", level: 1, exact: true }),
    ).toBeVisible();
    await safeClick(
      page.getByRole("button", { name: "Add dinner meal" }).first(),
    );

    const quickMealSheet = page.getByRole("dialog", { name: "Plan Dinner" });
    await expect(quickMealSheet).toBeVisible();
    await quickMealSheet.getByLabel("Meal name").fill("Leftovers");
    await quickMealSheet
      .getByRole("button", { name: "Create quick meal" })
      .click();

    await expect(quickMealSheet).toBeHidden();
    await expect(
      page.getByRole("button", { name: /open dinner: leftovers/i }),
    ).toBeVisible();

    await safeClick(nav.getByRole("button", { name: "Recipes" }));
    await expect(
      page.getByRole("heading", { name: "Recipes", level: 1, exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Add recipe" }).click();
    const addRecipeSheet = page.getByRole("dialog", { name: "Add Recipe" });
    await expect(addRecipeSheet).toBeVisible();
    await addRecipeSheet
      .getByRole("button", { name: "Create manually" })
      .click();

    const createRecipeSheet = page.getByRole("dialog", {
      name: "Create Recipe",
    });
    await expect(createRecipeSheet).toBeVisible();
    await createRecipeSheet.getByLabel("Title").fill("Sunday Pancakes");
    await createRecipeSheet.getByLabel("Ingredient 1").fill("1 cup flour");
    await createRecipeSheet
      .getByLabel("Instruction 1")
      .fill("Whisk and griddle");
    await createRecipeSheet.getByLabel("Tag 1").fill("Breakfast");
    await createRecipeSheet
      .getByRole("button", { name: "Save recipe" })
      .click();

    await expect(createRecipeSheet).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Sunday Pancakes" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Add to Meals" }).click();
    await expect(
      page.getByRole("heading", { name: "Meals", level: 1, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Choose a meal slot for Sunday Pancakes"),
    ).toBeVisible();

    await safeClick(
      page.getByRole("button", { name: "Add recipe to lunch" }).first(),
    );
    const recipeMealSheet = page.getByRole("dialog", { name: "Plan Lunch" });
    await expect(recipeMealSheet).toBeVisible();
    await recipeMealSheet
      .getByRole("button", { name: "Add recipe to slot" })
      .click();

    await expect(recipeMealSheet).toBeHidden();
    await expect(
      page.getByRole("button", { name: /open lunch: sunday pancakes/i }),
    ).toBeVisible();
  });
});
