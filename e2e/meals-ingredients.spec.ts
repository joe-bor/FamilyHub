import { expect, type Page, test } from "@playwright/test";
import { formatLocalDate, getWeekStartSunday } from "../src/lib/time-utils";
import {
  createRecipe,
  planMealSlot,
  registerFamily,
  seedBrowserAuth,
} from "./helpers/api-helpers";
import {
  clearStorage,
  safeClick,
  waitForHydration,
  waitForSheetSettled,
} from "./helpers/test-helpers";

/**
 * Released-contract E2E for Meals → "Add ingredients to grocery list".
 *
 * Exercises the whole journey against the published backend release (resolved
 * by CI; `BE_IMAGE_TAG=1.9.0` locally, which exposes
 * `POST /api/lists/{listId}/items/bulk`):
 *   1. Two recipe-backed dinners + one quick dinner planned in the current week.
 *   2. Open "Add ingredients": rows grouped per meal with VERBATIM ingredient
 *      text, and the quick meal under "No recipe ingredients".
 *   3. Edit one ingredient row, remove another.
 *   4. No grocery list exists yet → create one in-flow.
 *   5. Confirm "Add to list" exactly once → success + "View list".
 *   6. Open the grocery list and assert the selected/edited rows are present.
 *      The bulk response preserves request order, but same-batch items can tie
 *      on createdAt, so this asserts membership only — never a strict read-back
 *      order.
 */

// The board is keyed by the current week's Sunday start, computed exactly as
// MealsView does, so the API-seeded slots land on the week the board opens to.
const CURRENT_WEEK_START = formatLocalDate(getWeekStartSunday(new Date()));

// Fixed day indexes (0=Sunday) keep the review-sheet weekday labels
// deterministic regardless of which day the suite runs on. All three sit in
// the current (editable) week, so the "Add ingredients" action is offered.
const MONDAY = 1;
const WEDNESDAY = 3;
const FRIDAY = 5;

const PASTA_RECIPE = {
  title: "Weeknight Pasta",
  ingredients: ["1 lb spaghetti", "2 cups marinara sauce", "1/4 cup parmesan"],
};
const TACO_RECIPE = {
  title: "Sheet Pan Tacos",
  ingredients: ["1 lb ground beef", "8 corn tortillas", "1 lime"],
};
const QUICK_MEAL_TITLE = "Order Pizza";

const GROCERY_LIST_NAME = "This Week's Groceries";

// Group labels are "<Weekday> · <Meal> — <title>" (meal-ingredient-extraction).
const PASTA_GROUP = `Monday · Dinner — ${PASTA_RECIPE.title}`;
const TACO_GROUP = `Wednesday · Dinner — ${TACO_RECIPE.title}`;
const QUICK_GROUP = `Friday · Dinner — ${QUICK_MEAL_TITLE}`;

/**
 * Navigate to the weekly Meals board via the bottom-nav "More" sheet. Mirrors
 * mobile-meals.spec.ts — the active view is not persisted across reloads.
 */
async function openMealsBoard(page: Page) {
  const nav = page.getByRole("navigation", { name: /primary/i });
  await safeClick(nav.getByRole("button", { name: "More" }));
  const moreSheet = page.getByRole("dialog", { name: "More" });
  await waitForSheetSettled(moreSheet);
  await safeClick(moreSheet.getByRole("button", { name: "Meals" }));
  await expect(moreSheet).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Meals", level: 1, exact: true }),
  ).toBeVisible();
}

test.describe("Meals ingredients → grocery list", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    // The "Add ingredients" flow renders in a MobileSheet, so this is a
    // mobile-only journey like the other meals specs.
    test.skip(!isMobile, "Mobile-only tests");

    await page.goto("/");
    await clearStorage(page);
  });

  test("adds reviewed recipe ingredients from planned dinners to a grocery list", async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);

    const registration = await registerFamily(request, {
      familyName: "Ingredients To Grocery Family",
      members: [{ name: "Sam", color: "teal" }],
    });

    // Two recipes that store ingredients, planned as recipe-backed dinners, plus
    // one quick-meal dinner — all in the current week, all seeded via the real
    // API so the UI journey below starts from a realistic board.
    const pasta = await createRecipe(request, registration.token, {
      title: PASTA_RECIPE.title,
      ingredients: PASTA_RECIPE.ingredients,
      instructions: ["Boil pasta. Simmer sauce. Combine."],
      tags: ["Dinner"],
      favorite: false,
    });
    const tacos = await createRecipe(request, registration.token, {
      title: TACO_RECIPE.title,
      ingredients: TACO_RECIPE.ingredients,
      instructions: ["Roast on a sheet pan. Assemble tacos."],
      tags: ["Dinner"],
      favorite: false,
    });

    await planMealSlot(request, registration.token, {
      weekStartDate: CURRENT_WEEK_START,
      dayIndex: MONDAY,
      mealType: "dinner",
      recipeId: pasta.id,
      title: pasta.title,
    });
    await planMealSlot(request, registration.token, {
      weekStartDate: CURRENT_WEEK_START,
      dayIndex: WEDNESDAY,
      mealType: "dinner",
      recipeId: tacos.id,
      title: tacos.title,
    });
    await planMealSlot(request, registration.token, {
      weekStartDate: CURRENT_WEEK_START,
      dayIndex: FRIDAY,
      mealType: "dinner",
      title: QUICK_MEAL_TITLE,
    });

    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);

    await openMealsBoard(page);

    // ---- Open the review sheet --------------------------------------------
    await safeClick(page.getByRole("button", { name: "Add ingredients" }));
    const sheet = page.getByRole("dialog", {
      name: "Add ingredients to grocery list",
    });
    await waitForSheetSettled(sheet);

    // Recipe detail fetches resolve, then the review model renders.
    await expect(sheet.getByText("Loading recipe ingredients…")).toBeHidden();

    // ---- Rows grouped per meal, verbatim ingredient text ------------------
    await expect(
      sheet.getByRole("heading", { name: PASTA_GROUP }),
    ).toBeVisible();
    await expect(
      sheet.getByRole("heading", { name: TACO_GROUP }),
    ).toBeVisible();

    // Every verbatim ingredient appears as an editable, pre-selected row.
    for (const ingredient of [
      ...PASTA_RECIPE.ingredients,
      ...TACO_RECIPE.ingredients,
    ]) {
      const rowInput = sheet.getByRole("textbox", {
        name: `Edit ${ingredient}`,
      });
      await expect(rowInput).toHaveValue(ingredient);
      await expect(
        sheet.getByRole("checkbox", { name: `Include ${ingredient}` }),
      ).toBeChecked();
    }

    // ---- Quick meal lands under "No recipe ingredients" -------------------
    await expect(
      sheet.getByRole("heading", { name: "No recipe ingredients" }),
    ).toBeVisible();
    await expect(sheet.getByText(QUICK_GROUP)).toBeVisible();
    // Its only affordance is a manual add; it contributes no ingredient rows.
    await expect(
      sheet.getByRole("button", { name: `Add item for ${QUICK_GROUP}` }),
    ).toBeVisible();

    // ---- Edit one row, remove another -------------------------------------
    const EDITED_FROM = "2 cups marinara sauce";
    const EDITED_TO = "3 cups marinara sauce";
    const REMOVED = "1 lime";

    const editInput = sheet.getByRole("textbox", {
      name: `Edit ${EDITED_FROM}`,
    });
    await editInput.fill(EDITED_TO);
    // The row's accessible name tracks its text, so it re-labels after editing.
    await expect(
      sheet.getByRole("textbox", { name: `Edit ${EDITED_TO}` }),
    ).toHaveValue(EDITED_TO);

    await safeClick(sheet.getByRole("button", { name: `Remove ${REMOVED}` }));
    await expect(
      sheet.getByRole("textbox", { name: `Edit ${REMOVED}` }),
    ).toBeHidden();

    // ---- No grocery list yet → create one in-flow -------------------------
    // Confirm is blocked until a target grocery list exists.
    const addToListButton = sheet.getByRole("button", { name: "Add to list" });
    await expect(addToListButton).toBeDisabled();

    await sheet.getByLabel("Grocery list name").fill(GROCERY_LIST_NAME);
    await safeClick(sheet.getByRole("button", { name: "Create grocery list" }));

    // Once the list is created it becomes the sole target ("Adding to <name>.")
    // and the confirm unlocks.
    await expect(
      sheet.getByText(GROCERY_LIST_NAME, { exact: false }),
    ).toBeVisible();
    await expect(addToListButton).toBeEnabled();

    // ---- Confirm the append exactly once ----------------------------------
    await safeClick(addToListButton);

    // ---- Success + View list ----------------------------------------------
    await expect(
      sheet.getByText("Ingredients added to your grocery list."),
    ).toBeVisible();
    const viewListButton = sheet.getByRole("button", { name: "View list" });
    await expect(viewListButton).toBeVisible();

    // ---- Open the grocery list and assert the selected rows are present ----
    await safeClick(viewListButton);
    await expect(sheet).toBeHidden();

    await expect(
      page.getByRole("heading", { name: GROCERY_LIST_NAME }),
    ).toBeVisible();

    // Kept rows (including the edited one) landed in the list. Membership only —
    // same-batch createdAt ties mean read-back order is not guaranteed.
    const expectedItems = [
      "1 lb spaghetti",
      EDITED_TO,
      "1/4 cup parmesan",
      "1 lb ground beef",
      "8 corn tortillas",
    ];
    for (const itemText of expectedItems) {
      await expect(page.getByText(itemText, { exact: true })).toBeVisible();
    }

    // The removed ingredient and the un-edited original must NOT be present.
    await expect(page.getByText(REMOVED, { exact: true })).toHaveCount(0);
    await expect(page.getByText(EDITED_FROM, { exact: true })).toHaveCount(0);
    // The quick meal contributed no manual rows, so its title is not an item.
    await expect(page.getByText(QUICK_MEAL_TITLE, { exact: true })).toHaveCount(
      0,
    );
  });
});
