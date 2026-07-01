import type {
  MealBoard,
  MealEntryRequest,
  MealPlanningScope,
  MealSlot,
  MealSlotEntry,
  MealType,
  SaveMealPlanRequest,
} from "@/lib/types";

const MEAL_TYPES: readonly MealType[] = ["breakfast", "lunch", "dinner"];

export interface MealPlanningTarget {
  dayIndex: number;
  mealType: MealType;
}

export interface MealPlanningDraft {
  target: MealPlanningTarget;
  displayTitle: string;
  displayImageUrl: string | null;
  displayNote: string | null;
  primary: MealEntryRequest;
  note: string | null;
}

function targetKey(target: MealPlanningTarget) {
  return `${target.dayIndex}:${target.mealType}`;
}

function isEmptySlot(slot: MealSlot) {
  return slot.primary === null && slot.extras.length === 0;
}

function findSlot(
  board: MealBoard,
  target: MealPlanningTarget,
): MealSlot | undefined {
  return board.days
    .find((day) => day.dayIndex === target.dayIndex)
    ?.slots.find((slot) => slot.mealType === target.mealType);
}

function sortedBoardDayIndexes(board: MealBoard) {
  return board.days.map((day) => day.dayIndex).sort((a, b) => a - b);
}

function selectedDayIndexes(dayIndexes: number[]) {
  return Array.from(new Set(dayIndexes)).sort((a, b) => a - b);
}

function targetsForScope(
  board: MealBoard,
  scope: MealPlanningScope,
): MealPlanningTarget[] {
  if (scope.kind === "empty_dinners") {
    return sortedBoardDayIndexes(board).map((dayIndex) => ({
      dayIndex,
      mealType: "dinner",
    }));
  }

  const dayIndexes =
    scope.kind === "selected_days"
      ? selectedDayIndexes(scope.dayIndexes)
      : sortedBoardDayIndexes(board);

  return dayIndexes.flatMap((dayIndex) =>
    MEAL_TYPES.map((mealType) => ({ dayIndex, mealType })),
  );
}

export function buildPlanningQueue(
  board: MealBoard,
  scope: MealPlanningScope,
): MealSlot[] {
  return targetsForScope(board, scope)
    .map((target) => findSlot(board, target))
    .filter((slot): slot is MealSlot => Boolean(slot))
    .filter(isEmptySlot);
}

function draftPrimaryEntry(draft: MealPlanningDraft): MealSlotEntry {
  return {
    id: `draft-${targetKey(draft.target)}`,
    role: "primary",
    sourceType: draft.primary.sourceType,
    recipeId: draft.primary.recipeId,
    title: draft.displayTitle,
    imageUrl: draft.displayImageUrl,
    note: draft.displayNote,
  };
}

function latestDraftsByTarget(drafts: MealPlanningDraft[]) {
  return new Map(drafts.map((draft) => [targetKey(draft.target), draft]));
}

export function applyPlanningDraftsToBoard(
  board: MealBoard,
  drafts: MealPlanningDraft[],
): MealBoard {
  const draftsByTarget = latestDraftsByTarget(drafts);

  return {
    ...board,
    days: board.days.map((day) => ({
      ...day,
      slots: day.slots.map((slot) => {
        const draft = draftsByTarget.get(targetKey(slot));
        if (!draft) {
          return {
            ...slot,
            extras: slot.extras.map((extra) => ({ ...extra })),
            primary: slot.primary ? { ...slot.primary } : null,
          };
        }

        return {
          ...slot,
          primary: draftPrimaryEntry(draft),
          extras: [],
          note: draft.note,
        };
      }),
    })),
  };
}

export function toSaveMealPlanRequest(
  weekStartDate: string,
  drafts: MealPlanningDraft[],
): SaveMealPlanRequest {
  return {
    weekStartDate,
    slots: Array.from(latestDraftsByTarget(drafts).values()).map((draft) => ({
      dayIndex: draft.target.dayIndex,
      mealType: draft.target.mealType,
      primary: draft.primary,
      extras: [],
      note: draft.note,
    })),
  };
}

export function getConflictedDraftTargets(
  board: MealBoard,
  drafts: MealPlanningDraft[],
): MealPlanningTarget[] {
  return drafts
    .filter((draft) => {
      const slot = findSlot(board, draft.target);
      return !slot || !isEmptySlot(slot);
    })
    .map((draft) => draft.target);
}
