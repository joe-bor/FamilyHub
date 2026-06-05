import type { MealBoard, MealSlot } from "@/lib/types";

export const testWeekStartDate = "2026-06-07";

export function createEmptyMealsBoard(
  weekStartDate = testWeekStartDate,
): MealBoard {
  return {
    weekStartDate,
    days: Array.from({ length: 7 }, (_, dayIndex) => ({
      date: `2026-06-${String(7 + dayIndex).padStart(2, "0")}`,
      dayIndex,
      slots: [
        createEmptyMealSlot(weekStartDate, dayIndex, "breakfast"),
        createEmptyMealSlot(weekStartDate, dayIndex, "lunch"),
        createEmptyMealSlot(weekStartDate, dayIndex, "dinner"),
      ],
    })),
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
  return board;
}
