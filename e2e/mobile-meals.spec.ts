import { expect, type Locator, type Page, test } from "@playwright/test";
import { registerFamily, seedBrowserAuth } from "./helpers/api-helpers";
import {
  clearStorage,
  safeClick,
  waitForHydration,
  waitForSheetSettled,
} from "./helpers/test-helpers";

/**
 * Navigate to the weekly Meals board via the bottom-nav "More" sheet. The active
 * view is not persisted, so this is re-run after a reload to return to Meals.
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

/**
 * Wait for a Radix dialog's open animation to finish before measuring its
 * geometry. `data-state="open"` (and visibility) flip at animation frame 0, so
 * the box is still mid `zoom-in-95`/`slide-in` transform when first visible —
 * boundingBox would read the off-screen start frame, not the settled position.
 */
async function waitForDialogAnimationsSettled(dialog: Locator) {
  await dialog.evaluate((el) =>
    Promise.all(
      el
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => undefined)),
    ).then(() => undefined),
  );
}

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
    await safeClick(nav.getByRole("button", { name: "More" }));
    const mealsMoreSheet = page.getByRole("dialog", { name: "More" });
    await waitForSheetSettled(mealsMoreSheet);
    await safeClick(mealsMoreSheet.getByRole("button", { name: "Meals" }));
    await expect(mealsMoreSheet).toBeHidden();

    await expect(
      page.getByRole("heading", { name: "Meals", level: 1, exact: true }),
    ).toBeVisible();
    await safeClick(
      page.getByRole("button", { name: "Add dinner meal" }).first(),
    );

    const quickMealSheet = page.getByRole("dialog", { name: "Plan Dinner" });
    await waitForSheetSettled(quickMealSheet);
    await quickMealSheet.getByLabel("Meal name").fill("Leftovers");
    await quickMealSheet
      .getByRole("button", { name: "Create quick meal" })
      .click();

    await expect(quickMealSheet).toBeHidden();
    await expect(
      page.getByRole("button", { name: /open dinner: leftovers/i }),
    ).toBeVisible();

    await safeClick(nav.getByRole("button", { name: "More" }));
    const recipesMoreSheet = page.getByRole("dialog", { name: "More" });
    await waitForSheetSettled(recipesMoreSheet);
    await safeClick(recipesMoreSheet.getByRole("button", { name: "Recipes" }));
    await expect(recipesMoreSheet).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Recipes", level: 1, exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Add recipe" }).click();
    const addRecipeSheet = page.getByRole("dialog", { name: "Add Recipe" });
    await waitForSheetSettled(addRecipeSheet);
    await addRecipeSheet
      .getByRole("button", { name: "Create manually" })
      .click();

    const createRecipeSheet = page.getByRole("dialog", {
      name: "Create Recipe",
    });
    await waitForSheetSettled(createRecipeSheet);
    await createRecipeSheet.getByLabel("Title").fill("Sunday Pancakes");
    await createRecipeSheet
      .getByRole("textbox", { name: "Ingredient 1" })
      .fill("1 cup flour");
    await createRecipeSheet
      .getByRole("textbox", { name: "Instruction 1" })
      .fill("Whisk and griddle");
    await createRecipeSheet
      .getByRole("textbox", { name: "Tag 1" })
      .fill("Breakfast");
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
    await waitForSheetSettled(recipeMealSheet);
    await recipeMealSheet
      .getByRole("button", { name: "Add recipe to slot" })
      .click();

    await expect(recipeMealSheet).toBeHidden();
    await expect(
      page.getByRole("button", { name: /open lunch: sunday pancakes/i }),
    ).toBeVisible();
  });

  test("removes a planned meal and it stays removed after a board reload", async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);

    const registration = await registerFamily(request, {
      familyName: "Meal Removers",
      members: [{ name: "Sam", color: "teal" }],
    });

    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);

    await openMealsBoard(page);

    // Plan a quick dinner so there is a populated slot to remove.
    await safeClick(
      page.getByRole("button", { name: "Add dinner meal" }).first(),
    );
    const planSheet = page.getByRole("dialog", { name: "Plan Dinner" });
    await waitForSheetSettled(planSheet);
    await planSheet.getByLabel("Meal name").fill("Leftovers");
    await planSheet.getByRole("button", { name: "Create quick meal" }).click();

    await expect(planSheet).toBeHidden();
    const plannedMeal = page.getByRole("button", {
      name: /open dinner: leftovers/i,
    });
    await expect(plannedMeal).toBeVisible();

    // Remove it from the editor.
    await safeClick(plannedMeal.first());
    const editorSheet = page.getByRole("dialog", { name: "Dinner Plan" });
    await waitForSheetSettled(editorSheet);
    await editorSheet.getByRole("button", { name: "Remove meal" }).click();

    // The editor closes only after a successful removal, and the slot is empty.
    await expect(editorSheet).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Add dinner meal" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /open dinner: leftovers/i }),
    ).toBeHidden();

    // Reload to force a fresh board fetch from the backend. The removal persisted
    // only if the DELETE used the backend's request-body contract.
    await page.reload();
    await waitForHydration(page);
    await openMealsBoard(page);

    await expect(
      page.getByRole("button", { name: "Add dinner meal" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /open dinner: leftovers/i }),
    ).toBeHidden();
  });

  test("keeps the occupied-slot collision dialog within narrow viewports", async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);

    const registration = await registerFamily(request, {
      familyName: "Collision Crew",
      members: [{ name: "Pat", color: "teal" }],
    });

    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);

    await openMealsBoard(page);

    // Occupy a dinner slot so the next placement collides with its primary.
    await safeClick(
      page.getByRole("button", { name: "Add dinner meal" }).first(),
    );
    const planSheet = page.getByRole("dialog", { name: "Plan Dinner" });
    await waitForSheetSettled(planSheet);
    await planSheet.getByLabel("Meal name").fill("Leftovers");
    await planSheet.getByRole("button", { name: "Create quick meal" }).click();
    await expect(planSheet).toBeHidden();

    const occupiedSlot = page
      .getByRole("button", { name: /open dinner: leftovers/i })
      .first();
    await expect(occupiedSlot).toBeVisible();

    // Open the editor, choose Replace, then place a new meal — placing onto an
    // occupied primary raises the shared collision dialog.
    await safeClick(occupiedSlot);
    const editorSheet = page.getByRole("dialog", { name: "Dinner Plan" });
    await waitForSheetSettled(editorSheet);
    await editorSheet.getByRole("button", { name: "Replace meal" }).click();

    const replaceSheet = page.getByRole("dialog", { name: "Plan Dinner" });
    await waitForSheetSettled(replaceSheet);
    await replaceSheet.getByLabel("Meal name").fill("Pasta");
    await replaceSheet
      .getByRole("button", { name: "Create quick meal" })
      .click();

    const collisionDialog = page.getByRole("dialog", {
      name: "That slot already has a meal",
    });
    await expect(collisionDialog).toBeVisible();
    await waitForDialogAnimationsSettled(collisionDialog);

    // The dialog and all three actions must stay fully on-screen and tappable
    // across the narrowest supported widths (issue #249).
    for (const width of [320, 360]) {
      await page.setViewportSize({ width, height: 800 });

      const dialogBox = await collisionDialog.boundingBox();
      expect(dialogBox).not.toBeNull();
      expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
      expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(width);

      for (const name of ["Cancel", "Add as extra", "Replace primary"]) {
        const action = collisionDialog.getByRole("button", { name });
        await expect(action).toBeVisible();
        const actionBox = await action.boundingBox();
        expect(actionBox).not.toBeNull();
        expect(actionBox!.height).toBeGreaterThanOrEqual(44);
        expect(actionBox!.x).toBeGreaterThanOrEqual(0);
        expect(actionBox!.x + actionBox!.width).toBeLessThanOrEqual(width);
      }
    }
  });
});
