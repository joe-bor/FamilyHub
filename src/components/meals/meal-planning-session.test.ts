import { describe, expect, it } from "vitest";
import type { MealEntryRequest, MealSlot } from "@/lib/types";
import {
  createEmptyMealsBoard,
  createExtrasOnlyMealsBoard,
  createOccupiedMealsBoard,
  testWeekStartDate,
} from "@/test/fixtures/meals";
import {
  applyPlanningDraftsToBoard,
  buildPlanningQueue,
  getConflictedDraftTargets,
  type MealPlanningDraft,
  toSaveMealPlanRequest,
} from "./meal-planning-session";

function slotKey(slot: Pick<MealSlot, "dayIndex" | "mealType">) {
  return `${slot.dayIndex}:${slot.mealType}`;
}

function quickMeal(title: string): MealEntryRequest {
  return {
    sourceType: "quick",
    recipeId: null,
    title,
    imageUrl: null,
    note: null,
  };
}

const recipePrimary: MealEntryRequest = {
  sourceType: "recipe",
  recipeId: "11111111-1111-4111-8111-111111111111",
  title: null,
  imageUrl: null,
  note: null,
};

function createDraft(
  overrides: Partial<MealPlanningDraft> = {},
): MealPlanningDraft {
  return {
    target: { dayIndex: 2, mealType: "dinner" },
    displayTitle: "Recipe Lasagna",
    displayImageUrl: "https://example.com/lasagna.jpg",
    displayNote: "Selected recipe note",
    primary: recipePrimary,
    note: "Prep the sauce ahead",
    ...overrides,
  };
}

describe("buildPlanningQueue", () => {
  it("returns empty dinners in day order by default scope", () => {
    const queue = buildPlanningQueue(createOccupiedMealsBoard(), {
      kind: "empty_dinners",
    });

    expect(queue.map(slotKey)).toEqual([
      "0:dinner",
      "3:dinner",
      "4:dinner",
      "5:dinner",
      "6:dinner",
    ]);
  });

  it("returns every empty slot across the week in day and meal order", () => {
    const queue = buildPlanningQueue(createEmptyMealsBoard(), {
      kind: "all_empty_slots",
    });

    expect(queue).toHaveLength(21);
    expect(queue[0]).toMatchObject({ dayIndex: 0, mealType: "breakfast" });
    expect(queue[20]).toMatchObject({ dayIndex: 6, mealType: "dinner" });
  });

  it("returns breakfast, lunch, and dinner for selected days in day order", () => {
    const queue = buildPlanningQueue(createEmptyMealsBoard(), {
      kind: "selected_days",
      dayIndexes: [2, 4],
    });

    expect(queue.map(slotKey)).toEqual([
      "2:breakfast",
      "2:lunch",
      "2:dinner",
      "4:breakfast",
      "4:lunch",
      "4:dinner",
    ]);
  });

  it("excludes extras-only slots from the empty dinner queue", () => {
    const queue = buildPlanningQueue(createExtrasOnlyMealsBoard(), {
      kind: "empty_dinners",
    });

    expect(queue.map(slotKey)).not.toContain("4:dinner");
    expect(queue).toHaveLength(6);
  });
});

describe("applyPlanningDraftsToBoard", () => {
  it("projects drafts into a new board without mutating the source", () => {
    const board = createEmptyMealsBoard();
    const original = structuredClone(board);
    const draft = createDraft();

    const projected = applyPlanningDraftsToBoard(board, [draft]);

    expect(board).toEqual(original);
    expect(projected).not.toBe(board);
    expect(projected.days).not.toBe(board.days);
    expect(projected.days[2].slots[2]).toMatchObject({
      id: null,
      weekStartDate: testWeekStartDate,
      dayIndex: 2,
      mealType: "dinner",
      primary: {
        id: "draft-2:dinner",
        role: "primary",
        sourceType: "recipe",
        recipeId: recipePrimary.recipeId,
        title: "Recipe Lasagna",
        imageUrl: "https://example.com/lasagna.jpg",
        note: "Selected recipe note",
      },
      extras: [],
      note: "Prep the sauce ahead",
    });
  });

  it("does not share extras entry objects with the source board", () => {
    const board = createOccupiedMealsBoard();
    const projected = applyPlanningDraftsToBoard(board, []);
    const sourceExtra = board.days[1].slots[2].extras[0];
    const projectedExtra = projected.days[1].slots[2].extras[0];

    expect(projectedExtra).toEqual(sourceExtra);
    expect(projectedExtra).not.toBe(sourceExtra);
  });
});

describe("toSaveMealPlanRequest", () => {
  it("converts planning drafts to backend batch save requests", () => {
    const drafts = [
      createDraft({
        target: { dayIndex: 1, mealType: "lunch" },
        primary: quickMeal("Turkey sandwiches"),
        displayTitle: "Turkey sandwiches",
        displayImageUrl: null,
        displayNote: null,
        note: null,
      }),
      createDraft({
        target: { dayIndex: 3, mealType: "dinner" },
        note: "Serve with salad",
      }),
    ];

    expect(toSaveMealPlanRequest(testWeekStartDate, drafts)).toEqual({
      weekStartDate: testWeekStartDate,
      slots: [
        {
          dayIndex: 1,
          mealType: "lunch",
          primary: quickMeal("Turkey sandwiches"),
          extras: [],
          note: null,
        },
        {
          dayIndex: 3,
          mealType: "dinner",
          primary: recipePrimary,
          extras: [],
          note: "Serve with salad",
        },
      ],
    });
  });

  it("uses the latest draft when duplicate targets are converted to save requests", () => {
    const firstDraft = createDraft({
      target: { dayIndex: 5, mealType: "dinner" },
      primary: quickMeal("First idea"),
      displayTitle: "First idea",
      displayImageUrl: null,
      displayNote: null,
      note: "Early note",
    });
    const latestDraft = createDraft({
      target: { dayIndex: 5, mealType: "dinner" },
      primary: quickMeal("Latest idea"),
      displayTitle: "Latest idea",
      displayImageUrl: null,
      displayNote: null,
      note: "Latest note",
    });

    expect(
      toSaveMealPlanRequest(testWeekStartDate, [firstDraft, latestDraft]).slots,
    ).toEqual([
      {
        dayIndex: 5,
        mealType: "dinner",
        primary: quickMeal("Latest idea"),
        extras: [],
        note: "Latest note",
      },
    ]);
  });
});

describe("getConflictedDraftTargets", () => {
  it("returns draft targets that are missing or no longer empty after a board refetch", () => {
    const board = createEmptyMealsBoard();
    board.days[0].slots[2] = {
      ...board.days[0].slots[2],
      id: "slot-sunday-dinner",
      primary: {
        id: "entry-chili",
        role: "primary",
        sourceType: "quick",
        recipeId: null,
        title: "Chili",
        imageUrl: null,
        note: null,
      },
    };
    board.days[3].slots = board.days[3].slots.filter(
      (slot) => slot.mealType !== "breakfast",
    );

    const conflicts = getConflictedDraftTargets(board, [
      createDraft({ target: { dayIndex: 0, mealType: "dinner" } }),
      createDraft({ target: { dayIndex: 3, mealType: "breakfast" } }),
      createDraft({ target: { dayIndex: 6, mealType: "lunch" } }),
    ]);

    expect(conflicts).toEqual([
      { dayIndex: 0, mealType: "dinner" },
      { dayIndex: 3, mealType: "breakfast" },
    ]);
  });
});
