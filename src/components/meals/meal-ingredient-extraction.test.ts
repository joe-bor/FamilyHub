import { describe, expect, it } from "vitest";
import type { MealBoard, RecipeDetail } from "@/lib/types";
import {
  buildReviewModel,
  distinctRecipeIds,
  hasRecipeBackedEntry,
  toBulkItemsRequest,
} from "./meal-ingredient-extraction";

function board(): MealBoard {
  // Wed(3) dinner recipe r1; Thu(4) dinner recipe r1 (same recipe); Fri(5) dinner quick.
  const empty = (dayIndex: number) => ({
    date: "",
    dayIndex,
    slots: (["breakfast", "lunch", "dinner"] as const).map((mealType) => ({
      id: null,
      weekStartDate: "2026-07-05",
      dayIndex,
      mealType,
      primary: null,
      extras: [],
      note: null,
    })),
  });
  const b: MealBoard = {
    weekStartDate: "2026-07-05",
    days: [0, 1, 2, 3, 4, 5, 6].map(empty),
  };
  b.days[3].slots[2].primary = {
    id: "e1",
    role: "primary",
    sourceType: "recipe",
    recipeId: "r1",
    title: "Sheet Pan Chicken",
    imageUrl: null,
    note: null,
  };
  b.days[4].slots[2].primary = {
    id: "e2",
    role: "primary",
    sourceType: "recipe",
    recipeId: "r1",
    title: "Sheet Pan Chicken",
    imageUrl: null,
    note: null,
  };
  b.days[5].slots[2].primary = {
    id: "e3",
    role: "primary",
    sourceType: "quick",
    recipeId: null,
    title: "Taco night",
    imageUrl: null,
    note: null,
  };
  return b;
}

const recipeR1: RecipeDetail = {
  id: "r1",
  title: "Sheet Pan Chicken",
  imageUrl: null,
  favorite: false,
  tags: [],
  updatedAt: "",
  ingredients: ["2 chicken breasts", "1 tbsp olive oil"],
  instructions: [],
  note: null,
  sourceUrl: null,
};

describe("hasRecipeBackedEntry", () => {
  it("is true when any slot has a recipe-backed entry", () => {
    expect(hasRecipeBackedEntry(board())).toBe(true);
  });
  it("is false for a board with only quick/empty slots", () => {
    const b = board();
    b.days[3].slots[2].primary = null;
    b.days[4].slots[2].primary = null;
    expect(hasRecipeBackedEntry(b)).toBe(false);
  });
});

describe("distinctRecipeIds", () => {
  it("dedupes recipe fetch ids across meals", () => {
    expect(distinctRecipeIds(board())).toEqual(["r1"]);
  });
});

describe("buildReviewModel", () => {
  it("makes one verbatim row per ingredient, grouped by meal, and routes quick meals to the no-ingredient section", () => {
    const model = buildReviewModel(board(), {
      r1: { status: "loaded", detail: recipeR1 },
    });
    expect(model.recipeGroups).toHaveLength(2); // Wed + Thu, both from r1
    expect(model.recipeGroups[0].label).toBe(
      "Wednesday · Dinner — Sheet Pan Chicken",
    );
    expect(model.recipeGroups[0].rows.map((r) => r.text)).toEqual([
      "2 chicken breasts",
      "1 tbsp olive oil",
    ]);
    expect(model.recipeGroups[0].rows.every((r) => r.selected)).toBe(true);
    expect(model.noIngredientGroups.map((g) => g.label)).toEqual([
      "Friday · Dinner — Taco night",
    ]);
    expect(model.errorGroups).toHaveLength(0);
  });

  it("routes an empty-ingredient recipe and a 404 (deleted) recipe to the no-ingredient section", () => {
    const b = board();
    b.days[4].slots[2].primary = {
      id: "e2",
      role: "primary",
      sourceType: "recipe",
      recipeId: "r2",
      title: "Grandma's stew",
      imageUrl: null,
      note: null,
    };
    const model = buildReviewModel(b, {
      r1: { status: "loaded", detail: { ...recipeR1, ingredients: [] } }, // no ingredients
      r2: { status: "missing" }, // 404 → deleted/unavailable
    });
    const labels = model.noIngredientGroups.map((g) => g.label);
    expect(labels).toContain("Wednesday · Dinner — Sheet Pan Chicken");
    expect(labels).toContain("Thursday · Dinner — Grandma's stew");
    expect(model.recipeGroups).toHaveLength(0);
    expect(model.errorGroups).toHaveLength(0);
  });

  it("routes a non-404 fetch error to a retryable error group, not the no-ingredient section", () => {
    const model = buildReviewModel(board(), { r1: { status: "error" } });
    expect(model.errorGroups.map((g) => g.label)).toEqual([
      "Wednesday · Dinner — Sheet Pan Chicken",
      "Thursday · Dinner — Sheet Pan Chicken",
    ]);
    expect(model.errorGroups.every((g) => g.recipeId === "r1")).toBe(true);
    expect(model.recipeGroups).toHaveLength(0);
    expect(model.noIngredientGroups.map((g) => g.label)).toEqual([
      "Friday · Dinner — Taco night",
    ]);
  });

  it("emits a distinct recipe group for a recipe-backed extra alongside its primary in the same slot", () => {
    const b = board();
    // Wed(3) dinner keeps primary r1 and gains a recipe-backed extra r3.
    b.days[3].slots[2].extras = [
      {
        id: "e4",
        role: "extra",
        sourceType: "recipe",
        recipeId: "r3",
        title: "Garlic Bread",
        imageUrl: null,
        note: null,
      },
    ];
    const recipeR3: RecipeDetail = {
      id: "r3",
      title: "Garlic Bread",
      imageUrl: null,
      favorite: false,
      tags: [],
      updatedAt: "",
      ingredients: ["1 baguette", "2 tbsp butter"],
      instructions: [],
      note: null,
      sourceUrl: null,
    };

    // The extra's recipe id is collected for fetching alongside the primary's.
    expect(distinctRecipeIds(b)).toEqual(["r1", "r3"]);

    const model = buildReviewModel(b, {
      r1: { status: "loaded", detail: recipeR1 },
      r3: { status: "loaded", detail: recipeR3 },
    });

    // Wed primary + Wed extra + Thu primary → three recipe groups.
    const wednesday = model.recipeGroups.filter((g) =>
      g.label.startsWith("Wednesday · Dinner"),
    );
    expect(wednesday.map((g) => g.label)).toEqual([
      "Wednesday · Dinner — Sheet Pan Chicken",
      "Wednesday · Dinner — Garlic Bread",
    ]);
    // Same day/meal prefix, but the primary and extra are distinct groups (distinct keys).
    expect(wednesday[0].key).not.toBe(wednesday[1].key);
    expect(wednesday[0].rows.map((r) => r.text)).toEqual([
      "2 chicken breasts",
      "1 tbsp olive oil",
    ]);
    expect(wednesday[1].rows.map((r) => r.text)).toEqual([
      "1 baguette",
      "2 tbsp butter",
    ]);
  });
});

describe("toBulkItemsRequest", () => {
  it("sends only selected rows, verbatim, uncategorized, in order", () => {
    const model = buildReviewModel(board(), {
      r1: { status: "loaded", detail: recipeR1 },
    });
    model.recipeGroups[0].rows[1].selected = false; // deselect "1 tbsp olive oil" on Wed
    const request = toBulkItemsRequest(model);
    expect(request).toEqual({
      items: [
        { text: "2 chicken breasts" },
        { text: "2 chicken breasts" },
        { text: "1 tbsp olive oil" },
      ],
    });
  });
});
