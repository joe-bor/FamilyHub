import type {
  BulkCreateListItemsRequest,
  MealBoard,
  MealSlotEntry,
  RecipeDetail,
} from "@/lib/types";

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export interface PlannedEntryRef {
  dayIndex: number;
  mealType: string;
  entry: MealSlotEntry;
}

export interface ReviewRow {
  id: string; // stable per (entry, ingredient index) or manual row id
  text: string;
  selected: boolean;
}

export interface RecipeGroup {
  key: string;
  label: string;
  rows: ReviewRow[];
}

export interface NoIngredientGroup {
  key: string;
  label: string;
  manualRows: ReviewRow[]; // starts empty; the UI appends manual rows
}

// A recipe-backed meal whose detail fetch failed for a non-404 reason. Rendered as a
// retryable per-meal error row; it contributes no ingredient rows and no manual rows.
export interface ErrorGroup {
  key: string;
  label: string;
  recipeId: string;
}

// Per-recipe fetch outcome the UI passes in (built by useRecipeDetails in Task 5):
//   loaded  → detail available
//   missing → 404 (deleted recipe) → honest "no recipe ingredients"
//   error   → non-404 failure → retryable per-meal error row
export type RecipeResolution =
  | { status: "loaded"; detail: RecipeDetail }
  | { status: "missing" }
  | { status: "error" };

export interface ReviewModel {
  recipeGroups: RecipeGroup[];
  noIngredientGroups: NoIngredientGroup[];
  errorGroups: ErrorGroup[];
}

function isRecipeBacked(entry: MealSlotEntry): boolean {
  return entry.sourceType === "recipe" && entry.recipeId !== null;
}

export function collectPlannedEntries(board: MealBoard): PlannedEntryRef[] {
  const refs: PlannedEntryRef[] = [];
  for (const day of board.days) {
    for (const slot of day.slots) {
      const entries = [slot.primary, ...slot.extras].filter(
        (e): e is MealSlotEntry => e !== null,
      );
      for (const entry of entries) {
        refs.push({ dayIndex: day.dayIndex, mealType: slot.mealType, entry });
      }
    }
  }
  return refs;
}

export function hasRecipeBackedEntry(board: MealBoard): boolean {
  return collectPlannedEntries(board).some((ref) => isRecipeBacked(ref.entry));
}

export function distinctRecipeIds(board: MealBoard): string[] {
  const ids = new Set<string>();
  for (const ref of collectPlannedEntries(board)) {
    if (isRecipeBacked(ref.entry) && ref.entry.recipeId)
      ids.add(ref.entry.recipeId);
  }
  return [...ids];
}

function label(ref: PlannedEntryRef): string {
  return `${WEEKDAY_LABELS[ref.dayIndex]} · ${MEAL_LABELS[ref.mealType]} — ${ref.entry.title}`;
}

function groupKey(ref: PlannedEntryRef): string {
  return `${ref.dayIndex}:${ref.mealType}:${ref.entry.id}`;
}

export function buildReviewModel(
  board: MealBoard,
  resolutionsById: Record<string, RecipeResolution | undefined>,
): ReviewModel {
  const recipeGroups: RecipeGroup[] = [];
  const noIngredientGroups: NoIngredientGroup[] = [];
  const errorGroups: ErrorGroup[] = [];

  for (const ref of collectPlannedEntries(board)) {
    const key = groupKey(ref);

    // Quick meals (and any entry without a recipe id) never have recipe ingredients.
    if (!isRecipeBacked(ref.entry) || !ref.entry.recipeId) {
      noIngredientGroups.push({ key, label: label(ref), manualRows: [] });
      continue;
    }

    const resolution = resolutionsById[ref.entry.recipeId];

    // Non-404 failure (or an unresolved id) → retryable error row; never silently dropped
    // and never treated as "no recipe ingredients".
    if (resolution === undefined || resolution.status === "error") {
      errorGroups.push({
        key,
        label: label(ref),
        recipeId: ref.entry.recipeId,
      });
      continue;
    }

    // 404 (deleted recipe) → honest "no recipe ingredients".
    if (resolution.status === "missing") {
      noIngredientGroups.push({ key, label: label(ref), manualRows: [] });
      continue;
    }

    // Loaded: one verbatim row per ingredient, or the no-ingredient section when empty.
    const ingredients = resolution.detail.ingredients;
    if (ingredients.length > 0) {
      recipeGroups.push({
        key,
        label: label(ref),
        rows: ingredients.map((text, index) => ({
          id: `${key}#${index}`,
          text,
          selected: true,
        })),
      });
    } else {
      noIngredientGroups.push({ key, label: label(ref), manualRows: [] });
    }
  }

  return { recipeGroups, noIngredientGroups, errorGroups };
}

export function toBulkItemsRequest(
  model: ReviewModel,
): BulkCreateListItemsRequest {
  const rows: ReviewRow[] = [
    ...model.recipeGroups.flatMap((g) => g.rows),
    ...model.noIngredientGroups.flatMap((g) => g.manualRows),
  ];
  return {
    items: rows
      .filter((row) => row.selected && row.text.trim().length > 0)
      .map((row) => ({ text: row.text.trim() })), // uncategorized in v1
  };
}
