import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from "@playwright/test";
import { formatLocalDate, getWeekStartSunday } from "../src/lib/time-utils";
import {
  createRecipe,
  registerFamily,
  seedBrowserAuth,
  upsertMealSlot,
} from "./helpers/api-helpers";
import {
  clearStorage,
  safeClick,
  waitForHydration,
} from "./helpers/test-helpers";

const FIXED_NOW = new Date(2026, 6, 5, 8, 0, 0);
const ACCEPTANCE_WIDTHS = [1024, 1280, 1440, 1920];
const SCREENSHOT_WIDTHS = [1024, 1440, 1920];
const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

function currentWeekStart() {
  return formatLocalDate(getWeekStartSunday(FIXED_NOW));
}

function titleFor(mealType: (typeof MEAL_TYPES)[number], dayIndex: number) {
  return `${mealType} meal ${dayIndex + 1}`;
}

async function openMealsBoard(page: Page) {
  const nav = page.getByRole("navigation", { name: "Primary" });
  await safeClick(nav.getByRole("button", { name: "Meals", exact: true }));
  await expect(
    page.getByRole("heading", { name: "Meals", level: 1, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table", { name: "Weekly meals" })).toBeVisible();
}

async function seedFilledWeek(
  request: APIRequestContext,
  token: string,
  title = titleFor,
) {
  const weekStartDate = currentWeekStart();

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    for (const mealType of MEAL_TYPES) {
      await upsertMealSlot(request, token, {
        weekStartDate,
        dayIndex,
        mealType,
        primary: {
          sourceType: "quick",
          recipeId: null,
          title: title(mealType, dayIndex),
          imageUrl: null,
          note: null,
        },
        extras: [],
        note: null,
        collisionMode: null,
      });
    }
  }
}

async function authenticateAndOpenMeals(
  page: Page,
  registration: Awaited<ReturnType<typeof registerFamily>>,
) {
  await clearStorage(page);
  await page.evaluate(async () => {
    if (!indexedDB.databases) return;

    let databases: IDBDatabaseInfo[];
    try {
      databases = await indexedDB.databases();
    } catch {
      return;
    }
    if (!databases.some((database) => database.name === "family-hub-offline")) {
      return;
    }

    await new Promise<void>((resolve) => {
      const request = indexedDB.open("family-hub-offline");
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
      request.onsuccess = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("query-cache")) {
          database.close();
          resolve();
          return;
        }

        try {
          const transaction = database.transaction("query-cache", "readwrite");
          transaction.objectStore("query-cache").clear();
          const finish = () => {
            database.close();
            resolve();
          };
          transaction.oncomplete = finish;
          transaction.onerror = finish;
          transaction.onabort = finish;
        } catch {
          database.close();
          resolve();
        }
      };
    });
  });
  await seedBrowserAuth(page, registration);
  await page.reload();
  await waitForHydration(page);
  await openMealsBoard(page);
}

async function attachBoardScreenshot(page: Page, name: string, width: number) {
  await page.setViewportSize({
    width,
    height: width === 1024 ? 768 : 900,
  });
  const table = page.getByRole("table", { name: "Weekly meals" });
  await expect(table).toBeVisible();
  const section = page.locator("section", { has: table });
  await expect(section).toBeVisible();
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

test.describe("Large-screen Meals", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, "Large-screen only");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.clock.setFixedTime(FIXED_NOW);
    await page.goto("/");
    await clearStorage(page);
  });

  test("keeps the current empty week inside the viewport at all accepted widths", async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: ACCEPTANCE_WIDTHS[0], height: 768 });

    const registration = await registerFamily(request, {
      familyName: "Large Meals Geometry",
      members: [{ name: "Sam", color: "teal" }],
    });

    await authenticateAndOpenMeals(page, registration);
    const table = page.getByRole("table", { name: "Weekly meals" });

    for (const width of ACCEPTANCE_WIDTHS) {
      await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
      await expect(table).toBeVisible();
      await expect(table.getByRole("columnheader")).toHaveCount(8);
      await expect(table.getByRole("rowheader")).toHaveCount(3);
      await expect(
        table.locator('th[scope="col"][aria-current="date"]'),
      ).toHaveCount(1);

      const geometry = await table.evaluate((element) => {
        const scroller = element.parentElement;
        const tableBox = element.getBoundingClientRect();
        const root = document.documentElement;

        return {
          tableRight: tableBox.right,
          viewportWidth: window.innerWidth,
          scrollerClientWidth: scroller?.clientWidth ?? 0,
          scrollerScrollWidth: scroller?.scrollWidth ?? 0,
          documentClientWidth: root.clientWidth,
          documentScrollWidth: root.scrollWidth,
        };
      });

      expect(geometry.scrollerScrollWidth).toBeLessThanOrEqual(
        geometry.scrollerClientWidth + 1,
      );
      expect(geometry.documentScrollWidth).toBeLessThanOrEqual(
        geometry.documentClientWidth + 1,
      );
      expect(geometry.tableRight).toBeLessThanOrEqual(
        geometry.viewportWidth + 1,
      );
    }

    await page.setViewportSize({ width: 1024, height: 768 });
    const compactTableBox = await table.boundingBox();
    expect(compactTableBox).not.toBeNull();
    expect(compactTableBox!.y + compactTableBox!.height).toBeLessThanOrEqual(
      768,
    );

    await page.setViewportSize({ width: 1920, height: 900 });
    const wideTableBox = await table.boundingBox();
    const sectionBox = await page
      .locator("section", { has: table })
      .boundingBox();
    expect(wideTableBox).not.toBeNull();
    expect(sectionBox).not.toBeNull();
    expect(wideTableBox!.width).toBeLessThanOrEqual(1600);
    expect(
      Math.abs(
        wideTableBox!.x -
          sectionBox!.x -
          (sectionBox!.width -
            wideTableBox!.width -
            (wideTableBox!.x - sectionBox!.x)),
      ),
    ).toBeLessThanOrEqual(1);
  });

  test("keeps the day-card actions below the large-screen breakpoint", async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    const registration = await registerFamily(request, {
      familyName: "Meals Breakpoint Cards",
      members: [{ name: "Sam", color: "teal" }],
    });

    await seedBrowserAuth(page, registration);
    await page.reload();
    await waitForHydration(page);

    const nav = page.getByRole("navigation", { name: "Primary" });
    await safeClick(nav.getByRole("button", { name: "Meals", exact: true }));
    await expect(
      page.getByRole("heading", { name: "Meals", level: 1, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("table", { name: "Weekly meals" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Add dinner meal" }),
    ).toHaveCount(7);

    const fillEmptySlots = page.getByRole("button", {
      name: "Fill empty slots",
    });
    await expect(fillEmptySlots).toBeVisible();
    await expect(
      page
        .locator('[data-slot="week-header"]')
        .getByRole("button", { name: "Fill empty slots" }),
    ).toHaveCount(0);
  });

  test("captures the large-screen meals visual matrix", async ({
    page,
    request,
  }) => {
    test.setTimeout(120000);

    const fullWeek = await registerFamily(request, {
      familyName: "Meals Full Week Matrix",
      members: [{ name: "Sam", color: "teal" }],
    });
    await seedFilledWeek(request, fullWeek.token);
    const recipe = await createRecipe(request, fullWeek.token, {
      title: "Sheet Pan Chicken",
      ingredients: ["1 lb chicken"],
      instructions: ["Roast until cooked through."],
      tags: ["Dinner"],
      favorite: false,
    });
    await upsertMealSlot(request, fullWeek.token, {
      weekStartDate: currentWeekStart(),
      dayIndex: 0,
      mealType: "dinner",
      primary: {
        sourceType: "recipe",
        recipeId: recipe.id,
        title: recipe.title,
        imageUrl: null,
        note: null,
      },
      extras: [],
      note: null,
      collisionMode: "replace_primary",
    });
    await authenticateAndOpenMeals(page, fullWeek);

    for (const width of SCREENSHOT_WIDTHS) {
      await page.setViewportSize({
        width,
        height: width === 1024 ? 768 : 900,
      });
      const table = page.getByRole("table", { name: "Weekly meals" });
      await expect(
        table.locator('th[scope="col"][aria-current="date"]'),
      ).toHaveCount(1);
      await expect(
        page
          .locator('[data-slot="week-header"]')
          .getByRole("button", { name: "Add ingredients" }),
      ).toBeVisible();
      await expect(
        page
          .locator('[data-slot="week-header"]')
          .getByRole("button", { name: "Fill empty slots" }),
      ).toBeVisible();
      await expect(table.getByRole("button")).toHaveCount(21);
      await attachBoardScreenshot(page, "full-week", width);
    }

    const emptyWeek = await registerFamily(request, {
      familyName: "Meals Empty Week Matrix",
      members: [{ name: "Sam", color: "teal" }],
    });
    await authenticateAndOpenMeals(page, emptyWeek);

    for (const width of SCREENSHOT_WIDTHS) {
      await page.setViewportSize({
        width,
        height: width === 1024 ? 768 : 900,
      });
      const table = page.getByRole("table", { name: "Weekly meals" });
      await expect(
        table.locator('th[scope="col"][aria-current="date"]'),
      ).toHaveCount(1);
      await expect(
        table.getByRole("button", {
          name: /^Add (breakfast|lunch|dinner) meal, /,
        }),
      ).toHaveCount(21);
      await attachBoardScreenshot(page, "empty-week", width);
    }

    const longNames = await registerFamily(request, {
      familyName: "Meals Long Names Matrix",
      members: [{ name: "Sam", color: "teal" }],
    });
    await seedFilledWeek(
      request,
      longNames.token,
      (mealType, dayIndex) =>
        `A deliberately very long ${mealType} name for day ${dayIndex + 1} that must truncate inside one fixed-height card`,
    );
    await authenticateAndOpenMeals(page, longNames);
    await page.setViewportSize({ width: 1024, height: 768 });
    const longEyebrow = page
      .getByRole("table", { name: "Weekly meals" })
      .locator(
        "p.text-xs.font-semibold.uppercase.tracking-wide.text-muted-foreground",
      )
      .first();
    const longEyebrowMetrics = await longEyebrow.evaluate((element) => {
      const card = element.closest("button");
      return {
        eyebrowRight: element.getBoundingClientRect().right,
        cardRight: card?.getBoundingClientRect().right ?? 0,
        overflow: window.getComputedStyle(element).overflow,
        whiteSpace: window.getComputedStyle(element).whiteSpace,
      };
    });
    expect(longEyebrowMetrics.eyebrowRight).toBeLessThanOrEqual(
      longEyebrowMetrics.cardRight + 1,
    );
    expect(longEyebrowMetrics.overflow).toBe("hidden");
    expect(longEyebrowMetrics.whiteSpace).toBe("nowrap");
    const longTitle = page
      .getByRole("table", { name: "Weekly meals" })
      .locator("p.truncate")
      .first();
    const longTitleMetrics = await longTitle.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        height: element.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(style.lineHeight),
      };
    });
    expect(longTitleMetrics.scrollWidth).toBeGreaterThan(
      longTitleMetrics.clientWidth,
    );
    expect(longTitleMetrics.height).toBeCloseTo(longTitleMetrics.lineHeight, 4);

    for (const width of SCREENSHOT_WIDTHS) {
      await page.setViewportSize({
        width,
        height: width === 1024 ? 768 : 900,
      });
      await expect(
        page
          .getByRole("table", { name: "Weekly meals" })
          .locator('th[scope="col"][aria-current="date"]'),
      ).toHaveCount(1);
      await attachBoardScreenshot(page, "long-names", width);
    }

    const pastWeek = await registerFamily(request, {
      familyName: "Meals Past Week Matrix",
      members: [{ name: "Sam", color: "teal" }],
    });
    await authenticateAndOpenMeals(page, pastWeek);
    await safeClick(page.getByRole("button", { name: "Previous week" }));
    await expect(page.getByText("Review only", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add ingredients" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Fill empty slots" }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole("table", { name: "Weekly meals" })
        .locator('th[scope="col"][aria-current="date"]'),
    ).toHaveCount(0);

    for (const width of SCREENSHOT_WIDTHS) {
      await attachBoardScreenshot(page, "past-week", width);
    }
  });
});
