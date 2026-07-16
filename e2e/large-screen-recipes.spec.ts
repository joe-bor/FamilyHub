import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from "@playwright/test";
import {
  createRecipe,
  registerFamily,
  seedBrowserAuth,
} from "./helpers/api-helpers";
import {
  clearStorage,
  safeClick,
  waitForHydration,
} from "./helpers/test-helpers";

const ACCEPTANCE_WIDTHS = [
  { width: 1024, columns: 2 },
  { width: 1280, columns: 3 },
  { width: 1440, columns: 4 },
] as const;
const LOCAL_RECIPE_IMAGE = "http://localhost:5173/icons/icon-512.png";

async function openRecipes(page: Page) {
  const nav = page.getByRole("navigation", { name: "Primary" });
  await safeClick(nav.getByRole("button", { name: "Recipes", exact: true }));
  await expect(
    page.getByRole("heading", { name: "Recipes", level: 1, exact: true }),
  ).toBeVisible();
}

async function authenticateAndOpenRecipes(
  page: Page,
  registration: Awaited<ReturnType<typeof registerFamily>>,
) {
  await clearStorage(page);
  await seedBrowserAuth(page, registration);
  await page.reload();
  await waitForHydration(page);
  await openRecipes(page);
}

async function attachRecipesScreenshot(
  page: Page,
  name: string,
  width: number,
) {
  await page.setViewportSize({
    width,
    height: width === 1024 ? 768 : 900,
  });
  const container = page.getByTestId("recipes-view-container");
  await expect(container).toBeVisible();
  const section = page.locator("section", { has: container });
  await expect(section).toBeVisible();
  await section.evaluate((element) => element.scrollTo({ top: 0 }));
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => undefined)),
    ).then(() => undefined),
  );
  await test.info().attach(`${name}-${width}`, {
    body: await section.screenshot(),
    contentType: "image/png",
  });
}

async function expectGridColumns(
  page: Page,
  expectedColumns: number,
  expectedCards: number,
) {
  const grid = page.getByTestId("recipe-library-grid");
  await expect(grid).toBeVisible();
  await expect(grid.getByRole("article")).toHaveCount(expectedCards);

  const geometry = await grid.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      columns: style.gridTemplateColumns.split(" ").length,
      width: element.getBoundingClientRect().width,
    };
  });

  expect(geometry.columns).toBe(expectedColumns);
  expect(geometry.width).toBeLessThanOrEqual(1201);
}

async function seedRemainingRecipes(request: APIRequestContext, token: string) {
  for (let index = 2; index <= 12; index += 1) {
    const recipeNumber = String(index).padStart(2, "0");
    const favorite = index % 3 === 0;
    await createRecipe(request, token, {
      title: `Recipe ${recipeNumber}`,
      imageUrl: index % 2 === 0 ? null : LOCAL_RECIPE_IMAGE,
      ingredients: [`Ingredient ${recipeNumber}`],
      instructions: [`Instruction ${recipeNumber}`],
      tags: [favorite ? "Favorite set" : "Weeknight", `Tag ${recipeNumber}`],
      favorite,
    });
  }
}

test.describe("Large-screen Recipes", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, "Large-screen only");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await clearStorage(page);
  });

  test("verifies the grid, toolbar, detail width, and visual state matrix", async ({
    page,
    request,
  }) => {
    test.setTimeout(120000);

    const registration = await registerFamily(request, {
      familyName: "Large Recipes Matrix",
      members: [{ name: "Sam", color: "teal" }],
    });
    await createRecipe(request, registration.token, {
      title: "Recipe 01",
      imageUrl: LOCAL_RECIPE_IMAGE,
      ingredients: ["Ingredient 01"],
      instructions: ["Instruction 01"],
      tags: ["Weeknight", "Tag 01"],
      favorite: false,
    });
    await authenticateAndOpenRecipes(page, registration);

    await page.setViewportSize({ width: 800, height: 768 });
    const tabletFocusRows = await page
      .getByTestId("recipes-desktop-toolbar")
      .evaluate((toolbar) =>
        Array.from(toolbar.querySelectorAll<HTMLElement>("input, button")).map(
          (element) => element.getBoundingClientRect().top,
        ),
      );
    expect(
      tabletFocusRows.every(
        (top, index) => index === 0 || top >= tabletFocusRows[index - 1] - 1,
      ),
    ).toBe(true);

    for (const { width, columns } of ACCEPTANCE_WIDTHS) {
      await page.setViewportSize({
        width,
        height: width === 1024 ? 768 : 900,
      });
      await expectGridColumns(page, columns, 1);

      const gridBox = await page
        .getByTestId("recipe-library-grid")
        .boundingBox();
      const cardBox = await page.getByRole("article").boundingBox();
      expect(gridBox).not.toBeNull();
      expect(cardBox).not.toBeNull();
      expect(cardBox!.width).toBeLessThan(gridBox!.width * 0.75);

      await attachRecipesScreenshot(page, "one-recipe", width);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await safeClick(
      page.getByRole("button", {
        name: "Open recipe: Recipe 01",
        exact: true,
      }),
    );
    await expect(
      page.getByRole("button", { name: "Back to recipes", exact: true }),
    ).toBeVisible();
    const detailContainerBox = await page
      .getByTestId("recipes-view-container")
      .boundingBox();
    expect(detailContainerBox).not.toBeNull();
    expect(detailContainerBox!.width).toBeLessThanOrEqual(769);
    await safeClick(
      page.getByRole("button", { name: "Back to recipes", exact: true }),
    );

    await seedRemainingRecipes(request, registration.token);
    await safeClick(
      page.getByRole("button", {
        name: "Open recipe: Recipe 01",
        exact: true,
      }),
    );
    const favoriteRecipe = page.getByRole("button", {
      name: "Favorite recipe: Recipe 01",
      exact: true,
    });
    await safeClick(favoriteRecipe);
    await expect(favoriteRecipe).toHaveAttribute("aria-pressed", "true");
    await safeClick(
      page.getByRole("button", { name: "Back to recipes", exact: true }),
    );
    await expect(page.getByRole("article")).toHaveCount(12);

    for (const { width, columns } of ACCEPTANCE_WIDTHS) {
      await page.setViewportSize({
        width,
        height: width === 1024 ? 768 : 900,
      });
      await expectGridColumns(page, columns, 12);

      const recipe11Card = page.getByRole("article", {
        name: "Recipe card: Recipe 11",
        exact: true,
      });
      const recipe12Card = page.getByRole("article", {
        name: "Recipe card: Recipe 12",
        exact: true,
      });
      const imageBox = await recipe11Card
        .getByRole("img", { name: "Recipe 11", exact: true })
        .locator("..")
        .boundingBox();
      const placeholderBox = await recipe12Card
        .getByText("No photo", { exact: true })
        .locator("..")
        .locator("..")
        .boundingBox();
      expect(imageBox).not.toBeNull();
      expect(placeholderBox).not.toBeNull();
      expect(imageBox!.width / imageBox!.height).toBeGreaterThan(1.3);
      expect(imageBox!.width / imageBox!.height).toBeLessThan(1.37);
      expect(placeholderBox!.width / placeholderBox!.height).toBeGreaterThan(
        1.3,
      );
      expect(placeholderBox!.width / placeholderBox!.height).toBeLessThan(1.37);

      const toolbarBox = await page
        .getByTestId("recipes-desktop-toolbar")
        .boundingBox();
      const searchBox = await page.getByLabel("Search recipes").boundingBox();
      const favoritesBox = await page
        .getByRole("button", { name: "Favorites only", exact: true })
        .boundingBox();
      const addRecipeBox = await page
        .getByRole("button", { name: "Add recipe", exact: true })
        .boundingBox();
      expect(toolbarBox).not.toBeNull();
      expect(searchBox).not.toBeNull();
      expect(favoritesBox).not.toBeNull();
      expect(addRecipeBox).not.toBeNull();
      expect(toolbarBox!.height).toBeLessThanOrEqual(48);
      expect(searchBox!.width).toBeGreaterThanOrEqual(250);
      expect(searchBox!.width).toBeLessThanOrEqual(258);
      expect(searchBox!.height).toBeGreaterThanOrEqual(44);
      expect(favoritesBox!.height).toBeGreaterThanOrEqual(44);
      expect(addRecipeBox!.height).toBeGreaterThanOrEqual(44);

      await attachRecipesScreenshot(page, "twelve-recipes", width);
    }

    await safeClick(
      page.getByRole("button", { name: "Favorites only", exact: true }),
    );
    await expect(page.getByRole("article")).toHaveCount(5);
    for (const { width } of ACCEPTANCE_WIDTHS) {
      await attachRecipesScreenshot(page, "favorites-only", width);
    }

    await page.getByLabel("Search recipes").fill("definitely-no-match");
    await expect(
      page.getByText("No recipes match those filters", { exact: true }),
    ).toBeVisible();
    for (const { width } of ACCEPTANCE_WIDTHS) {
      await attachRecipesScreenshot(page, "no-results", width);
    }
  });

  test("preserves the 375px horizontal cards and FAB", async ({
    browserName,
    page,
    request,
  }) => {
    const registration = await registerFamily(request, {
      familyName: "Recipes Mobile Regression",
      members: [{ name: "Sam", color: "teal" }],
    });
    await createRecipe(request, registration.token, {
      title: "Mobile Recipe",
      imageUrl: LOCAL_RECIPE_IMAGE,
      ingredients: ["Mobile ingredient"],
      instructions: ["Mobile instruction"],
      tags: ["Mobile", "Quick", "Dinner", "Family", "Weeknight", "Favorite"],
      favorite: false,
    });
    await authenticateAndOpenRecipes(page, registration);

    await page.setViewportSize({ width: 375, height: 812 });
    const mobileCard = page.getByRole("article", {
      name: "Recipe card: Mobile Recipe",
      exact: true,
    });
    await expect(mobileCard).toBeVisible();
    expect(
      await mobileCard.evaluate(
        (element) => window.getComputedStyle(element).flexDirection,
      ),
    ).toBe("row");
    await expect(
      page.getByRole("button", { name: "Add recipe", exact: true }),
    ).toBeVisible();

    const mobileFilterScroller = page
      .getByTestId("recipe-filter-bar")
      .locator(".overflow-x-auto");
    const mobileFilterOverflow = await mobileFilterScroller.evaluate(
      (element) => ({
        classNames: element.className.split(/\s+/),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        scrollbarWidth: window.getComputedStyle(element).scrollbarWidth,
      }),
    );
    expect(mobileFilterOverflow.scrollWidth).toBeGreaterThan(
      mobileFilterOverflow.clientWidth,
    );
    expect(mobileFilterOverflow.classNames).not.toContain("scrollbar-hide");
    if (browserName === "chromium") {
      expect(mobileFilterOverflow.scrollbarWidth).not.toBe("none");
    }

    await attachRecipesScreenshot(page, "mobile-regression", 375);
  });
});
