import { formatLocalDate, parseLocalDate } from "@/lib/time-utils";
import type { MealBoard, MealSlot } from "@/lib/types";
import { testRecipeDetail } from "./recipes";

export const testWeekStartDate = "2026-06-07";

export function createEmptyMealsBoard(
  weekStartDate = testWeekStartDate,
): MealBoard {
  const start = parseLocalDate(weekStartDate);
  return {
    weekStartDate,
    days: Array.from({ length: 7 }, (_, dayIndex) => {
      const d = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + dayIndex,
      );
      return {
        date: formatLocalDate(d),
        dayIndex,
        slots: [
          createEmptyMealSlot(weekStartDate, dayIndex, "breakfast"),
          createEmptyMealSlot(weekStartDate, dayIndex, "lunch"),
          createEmptyMealSlot(weekStartDate, dayIndex, "dinner"),
        ],
      };
    }),
  };
}

export function createEmptyMealSlot(
  weekStartDate: string,
  dayIndex: number,
  mealType: "breakfast" | "lunch" | "dinner",
): MealSlot {
  return {
    id: null,
    weekStartDate,
    dayIndex,
    mealType,
    primary: null,
    extras: [],
    note: null,
  };
}

export function createOccupiedMealsBoard(): MealBoard {
  const board = createEmptyMealsBoard();
  board.days[1].slots[2] = {
    id: "slot-monday-dinner",
    weekStartDate: testWeekStartDate,
    dayIndex: 1,
    mealType: "dinner",
    primary: {
      id: "entry-pasta",
      role: "primary",
      sourceType: "quick",
      recipeId: null,
      title: "Pasta",
      imageUrl: null,
      note: "Use red sauce",
    },
    extras: [
      {
        id: "entry-salad",
        role: "extra",
        sourceType: "quick",
        recipeId: null,
        title: "Salad",
        imageUrl: null,
        note: null,
      },
    ],
    note: null,
  };
  board.days[2].slots[2] = {
    id: "slot-tuesday-dinner",
    weekStartDate: testWeekStartDate,
    dayIndex: 2,
    mealType: "dinner",
    primary: {
      id: "entry-soup",
      role: "primary",
      sourceType: "quick",
      recipeId: null,
      title: "Soup",
      imageUrl: null,
      note: null,
    },
    extras: [],
    note: null,
  };
  return board;
}

export function createExtrasOnlyMealsBoard(): MealBoard {
  const board = createEmptyMealsBoard();
  board.days[4].slots[2] = {
    id: "slot-extras-only-dinner",
    weekStartDate: testWeekStartDate,
    dayIndex: 4,
    mealType: "dinner",
    primary: null,
    extras: [
      {
        id: "entry-garlic-bread",
        role: "extra",
        sourceType: "quick",
        recipeId: null,
        title: "Garlic bread",
        imageUrl: null,
        note: null,
      },
    ],
    note: null,
  };
  return board;
}

export function createRecipeBackedMealsBoard(): MealBoard {
  const board = createEmptyMealsBoard();
  board.days[1].slots[2] = {
    id: "slot-recipe-dinner",
    weekStartDate: testWeekStartDate,
    dayIndex: 1,
    mealType: "dinner",
    primary: {
      id: "entry-recipe",
      role: "primary",
      sourceType: "recipe",
      recipeId: testRecipeDetail.id,
      title: "Snapshot Salmon",
      imageUrl: "https://example.com/old-salmon.jpg",
      note: "Snapshot note",
    },
    extras: [],
    note: null,
  };
  return board;
}
