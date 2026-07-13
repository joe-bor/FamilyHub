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
        table.locator('[role="columnheader"][aria-current="date"]'),
      ).toHaveCount(1);

      const geometry = await table.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const root = document.documentElement;

        return {
          tableRight: box.right,
          viewportWidth: window.innerWidth,
          tableScrollWidth: element.scrollWidth,
          tableClientWidth: element.clientWidth,
          documentClientWidth: root.clientWidth,
          documentScrollWidth: root.scrollWidth,
        };
      });

      expect(geometry.tableScrollWidth).toBeLessThanOrEqual(
        geometry.tableClientWidth + 1,
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

  test("fills the viewport height and floors row height on short screens", async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);
    const registration = await registerFamily(request, {
      familyName: "Meals Vertical Fill",
      members: [{ name: "Sam", color: "teal" }],
    });
    await authenticateAndOpenMeals(page, registration);
    const table = page.getByRole("table", { name: "Weekly meals" });

    // Tall viewports: board bottom lands within section bottom padding.
    for (const [width, height] of [
      [1280, 800],
      [1440, 900],
      [1920, 1080],
    ] as const) {
      await page.setViewportSize({ width, height });
      await expect(table).toBeVisible();
      const box = await table.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeGreaterThanOrEqual(height - 40);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
    }

    // Rail: ~36px wide, vertical labels.
    const rail = table.getByRole("rowheader", { name: "Breakfast" });
    const railBox = await rail.boundingBox();
    expect(railBox).not.toBeNull();
    expect(railBox!.width).toBeGreaterThanOrEqual(35);
    expect(railBox!.width).toBeLessThanOrEqual(40);
    const railOrientation = await rail.locator("span").evaluate((label) => {
      const style = window.getComputedStyle(label);
      return {
        writingMode: style.writingMode,
        rotate: style.rotate,
      };
    });
    expect(railOrientation.writingMode).toBe("vertical-rl");
    expect(railOrientation.rotate).toBe("180deg");

    // Short viewport: rows floor at 170px and module scrolls.
    await page.setViewportSize({ width: 1280, height: 560 });
    const bodyRows = table
      .locator('[role="rowgroup"]')
      .nth(1)
      .locator('[role="row"]');
    await expect(bodyRows).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      const rowBox = await bodyRows.nth(index).boundingBox();
      expect(rowBox).not.toBeNull();
      expect(rowBox!.height).toBeGreaterThanOrEqual(169);
    }
    const section = page.locator("section", { has: table });
    const scrollGeometry = await section.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        overflowY: style.overflowY,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      };
    });
    expect(["auto", "scroll"]).toContain(scrollGeometry.overflowY);
    expect(scrollGeometry.scrollHeight).toBeGreaterThan(
      scrollGeometry.clientHeight + 1,
    );

    const scrollTop = await section.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return element.scrollTop;
    });
    expect(scrollTop).toBeGreaterThan(0);
    const lastRowReachability = await bodyRows.last().evaluate((row) => {
      const section = row.closest("section");
      if (!section) return null;

      const rowBox = row.getBoundingClientRect();
      const sectionBox = section.getBoundingClientRect();
      return {
        rowTop: rowBox.top,
        rowBottom: rowBox.bottom,
        sectionTop: sectionBox.top,
        sectionBottom: sectionBox.bottom,
      };
    });
    expect(lastRowReachability).not.toBeNull();
    expect(lastRowReachability!.rowTop).toBeGreaterThanOrEqual(
      lastRowReachability!.sectionTop - 1,
    );
    expect(lastRowReachability!.rowBottom).toBeLessThanOrEqual(
      lastRowReachability!.sectionBottom + 1,
    );
    await section.evaluate((element) => {
      element.scrollTop = 0;
    });
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
        table.locator('[role="columnheader"][aria-current="date"]'),
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
        table.locator('[role="columnheader"][aria-current="date"]'),
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
    const containedTitle =
      "A deliberately very long breakfast name for day 1 that must truncate inside one fixed-height card";
    await upsertMealSlot(request, longNames.token, {
      weekStartDate: currentWeekStart(),
      dayIndex: 0,
      mealType: "breakfast",
      primary: {
        sourceType: "quick",
        recipeId: null,
        title: containedTitle,
        imageUrl: null,
        note: "A primary note that yields before the pinned extras tray",
      },
      extras: [
        {
          sourceType: "quick",
          recipeId: null,
          title: "Extra-long garlic bread accompaniment",
          imageUrl: null,
          note: null,
        },
        {
          sourceType: "quick",
          recipeId: null,
          title: "Extra-long seasonal salad accompaniment",
          imageUrl: null,
          note: null,
        },
        {
          sourceType: "quick",
          recipeId: null,
          title: "Juice",
          imageUrl: null,
          note: null,
        },
      ],
      note: "A slot note that stays in the bounded notes region",
      collisionMode: "replace_primary",
    });
    await authenticateAndOpenMeals(page, longNames);
    await page.setViewportSize({ width: 1024, height: 768 });
    const boardTable = page.getByRole("table", { name: "Weekly meals" });
    await expect(
      boardTable.getByRole("rowheader", { name: "Breakfast" }),
    ).toHaveCount(1);
    await expect(
      boardTable.getByText("Breakfast", { exact: true }),
    ).toHaveCount(1); // rail only — cards carry no eyebrow

    const longTitle = boardTable
      .locator('[role="cell"] p.line-clamp-2')
      .first();
    const longTitleMetrics = await longTitle.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        lineHeight: Number.parseFloat(style.lineHeight),
      };
    });
    // Clamped: content overflows, and the visible box is exactly two lines.
    expect(longTitleMetrics.scrollHeight).toBeGreaterThan(
      longTitleMetrics.clientHeight,
    );
    expect(longTitleMetrics.clientHeight).toBeGreaterThanOrEqual(
      longTitleMetrics.lineHeight * 2 - 2,
    );
    expect(longTitleMetrics.clientHeight).toBeLessThanOrEqual(
      longTitleMetrics.lineHeight * 2 + 2,
    );

    // At an acceptance viewport, notes yield at least one complete line and
    // remain bounded above the pinned extras tray.
    const longContentCard = boardTable.getByRole("button", {
      name: `Open breakfast, Sunday: ${containedTitle}`,
    });
    await expect(
      longContentCard.locator('[data-slot="meal-notes"]'),
    ).toBeVisible();
    const noteContainment = await longContentCard.evaluate((card) => {
      const notes = card.querySelector('[data-slot="meal-notes"]');
      const firstNote = notes?.querySelector("p") ?? null;
      const overflow = Array.from(card.querySelectorAll("span")).find(
        (element) => element.textContent?.trim() === "+1 more",
      );
      const tray = overflow?.parentElement ?? null;
      const bounds = (element: Element | null) => {
        const box = element?.getBoundingClientRect();
        return box
          ? {
              top: box.top,
              right: box.right,
              bottom: box.bottom,
              left: box.left,
            }
          : null;
      };

      return {
        card: bounds(card),
        notes: bounds(notes),
        firstNote: bounds(firstNote),
        firstNoteLineHeight: firstNote
          ? Number.parseFloat(window.getComputedStyle(firstNote).lineHeight)
          : null,
        tray: bounds(tray),
      };
    });
    expect(noteContainment.card).not.toBeNull();
    expect(noteContainment.notes).not.toBeNull();
    expect(noteContainment.firstNote).not.toBeNull();
    expect(noteContainment.firstNoteLineHeight).not.toBeNull();
    expect(noteContainment.tray).not.toBeNull();
    const visibleNoteTop = Math.max(
      noteContainment.notes!.top,
      noteContainment.firstNote!.top,
    );
    const visibleNoteBottom = Math.min(
      noteContainment.notes!.bottom,
      noteContainment.firstNote!.bottom,
    );
    expect(visibleNoteBottom - visibleNoteTop).toBeGreaterThanOrEqual(
      noteContainment.firstNoteLineHeight! - 1,
    );
    expect(noteContainment.notes!.top).toBeGreaterThanOrEqual(
      noteContainment.card!.top - 1,
    );
    expect(noteContainment.notes!.right).toBeLessThanOrEqual(
      noteContainment.card!.right + 1,
    );
    expect(noteContainment.notes!.bottom).toBeLessThanOrEqual(
      noteContainment.card!.bottom + 1,
    );
    expect(noteContainment.notes!.left).toBeGreaterThanOrEqual(
      noteContainment.card!.left - 1,
    );
    expect(noteContainment.notes!.bottom).toBeLessThanOrEqual(
      noteContainment.tray!.top + 1,
    );

    // At the 170px row floor, the full title and extras tray stay in the card.
    await page.setViewportSize({ width: 1280, height: 560 });
    const constrainedCard = boardTable.getByRole("button", {
      name: `Open breakfast, Sunday: ${containedTitle}`,
    });
    const constrainedCell = constrainedCard.locator(
      'xpath=ancestor::*[@role="cell"]',
    );
    const constrainedRow = constrainedCell.locator(
      'xpath=ancestor::*[@role="row"]',
    );
    const overflowChip = constrainedCard.getByText("+1 more", { exact: true });
    await expect(overflowChip).toBeVisible();
    const extrasTray = overflowChip.locator("..");
    await expect(extrasTray.locator(":scope > *")).toHaveCount(3);
    const [cellBox, rowBox] = await Promise.all([
      constrainedCell.boundingBox(),
      constrainedRow.boundingBox(),
    ]);
    expect(cellBox).not.toBeNull();
    expect(rowBox).not.toBeNull();
    expect(rowBox!.height).toBeLessThanOrEqual(171);
    const containment = await constrainedCard.evaluate((card) => {
      const title = card.querySelector("p.line-clamp-2");
      const overflow = Array.from(card.querySelectorAll("span")).find(
        (element) => element.textContent?.trim() === "+1 more",
      );
      const tray = overflow?.parentElement ?? null;
      const bounds = (element: Element | null) => {
        const box = element?.getBoundingClientRect();
        return box
          ? {
              top: box.top,
              right: box.right,
              bottom: box.bottom,
              left: box.left,
            }
          : null;
      };

      return {
        card: bounds(card),
        title: bounds(title),
        tray: bounds(tray),
        trayItems: tray
          ? Array.from(tray.children).map((item) => bounds(item))
          : [],
      };
    });
    expect(containment.card).not.toBeNull();
    expect(containment.title).not.toBeNull();
    expect(containment.tray).not.toBeNull();
    expect(containment.card!.top).toBeGreaterThanOrEqual(cellBox!.y - 1);
    expect(containment.card!.right).toBeLessThanOrEqual(
      cellBox!.x + cellBox!.width + 1,
    );
    expect(containment.card!.bottom).toBeLessThanOrEqual(
      cellBox!.y + cellBox!.height + 1,
    );
    expect(containment.card!.left).toBeGreaterThanOrEqual(cellBox!.x - 1);
    for (const box of [
      containment.title,
      containment.tray,
      ...containment.trayItems,
    ]) {
      expect(box).not.toBeNull();
      expect(box!.top).toBeGreaterThanOrEqual(containment.card!.top - 1);
      expect(box!.right).toBeLessThanOrEqual(containment.card!.right + 1);
      expect(box!.bottom).toBeLessThanOrEqual(containment.card!.bottom + 1);
      expect(box!.left).toBeGreaterThanOrEqual(containment.card!.left - 1);
    }

    for (const width of SCREENSHOT_WIDTHS) {
      await page.setViewportSize({
        width,
        height: width === 1024 ? 768 : 900,
      });
      await expect(
        page
          .getByRole("table", { name: "Weekly meals" })
          .locator('[role="columnheader"][aria-current="date"]'),
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
        .locator('[role="columnheader"][aria-current="date"]'),
    ).toHaveCount(0);

    for (const width of SCREENSHOT_WIDTHS) {
      await attachBoardScreenshot(page, "past-week", width);
    }
  });
});
