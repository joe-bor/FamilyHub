import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useDuplicateMealSlot,
  useMoveMealSlot,
  useRecipe,
  useRemoveMealSlot,
  useUpsertMealSlot,
} from "@/api";
import { RecipeDetailView } from "@/components/recipes/recipe-detail-view";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import {
  addWeeksLocal,
  formatLocalDate,
  parseLocalDate,
} from "@/lib/time-utils";
import type {
  DuplicateMealSlotRequest,
  MealBoard,
  MealCollisionMode,
  MealEntryRequest,
  MealSlot,
  MealSlotEntry,
  MoveMealSlotRequest,
  UpsertMealSlotRequest,
} from "@/lib/types";
import { formatMealType } from "./meal-type-utils";

function entryToRequest(entry: MealSlotEntry): MealEntryRequest {
  if (entry.sourceType === "recipe" && entry.recipeId) {
    return {
      sourceType: "recipe",
      recipeId: entry.recipeId,
      title: null,
      imageUrl: null,
      note: null,
    };
  }
  // quick entries, or recipe entries whose source was deleted: preserve the
  // stored snapshot as a quick entry so re-saving never drops content.
  return {
    sourceType: "quick",
    recipeId: null,
    title: entry.title,
    imageUrl: entry.imageUrl,
    note: entry.note,
  };
}

type PendingCollision =
  | { kind: "move"; request: MoveMealSlotRequest }
  | { kind: "duplicate"; request: DuplicateMealSlotRequest };

interface MealEditorSheetProps {
  isOpen: boolean;
  slot: MealSlot | null;
  board: MealBoard | null;
  readOnly: boolean;
  onReplace?: (slot: MealSlot) => void;
  onAddExtra?: (slot: MealSlot) => void;
  onOpenChange: (open: boolean) => void;
}

function getDestination(slot: MealSlot): {
  dayIndex: number;
  weekStartDate: string;
} {
  if (slot.dayIndex === 6) {
    return {
      dayIndex: 0,
      weekStartDate: formatLocalDate(
        addWeeksLocal(parseLocalDate(slot.weekStartDate), 1),
      ),
    };
  }
  return { dayIndex: slot.dayIndex + 1, weekStartDate: slot.weekStartDate };
}

function findDestinationSlot(
  board: MealBoard,
  slot: MealSlot,
): MealSlot | undefined {
  const dest = getDestination(slot);
  if (dest.weekStartDate !== board.weekStartDate) return undefined;
  return board.days[dest.dayIndex]?.slots.find(
    (candidate) => candidate.mealType === slot.mealType,
  );
}

export function MealEditorSheet({
  isOpen,
  slot,
  board,
  readOnly,
  onReplace,
  onAddExtra,
  onOpenChange,
}: MealEditorSheetProps) {
  const [pendingCollision, setPendingCollision] =
    useState<PendingCollision | null>(null);
  const [showRecipe, setShowRecipe] = useState(false);
  const recipeId = slot?.primary?.recipeId ?? null;
  const recipe = useRecipe(showRecipe ? recipeId : null);
  const moveSlot = useMoveMealSlot({
    onSuccess: () => onOpenChange(false),
  });
  const duplicateSlot = useDuplicateMealSlot({
    onSuccess: () => onOpenChange(false),
  });
  const removeSlot = useRemoveMealSlot({
    onSuccess: () => onOpenChange(false),
  });
  const [workingExtras, setWorkingExtras] = useState<MealSlotEntry[]>(
    slot?.extras ?? [],
  );
  useEffect(() => {
    setWorkingExtras(slot?.extras ?? []);
  }, [slot]);
  const upsertSlot = useUpsertMealSlot({
    onError: () => setWorkingExtras(slot?.extras ?? []),
  });

  if (!slot || !board || !slot.primary) return null;

  const activeSlot = slot;
  const activeBoard = board;
  const activePrimary = slot.primary;
  const destinationSlot = findDestinationSlot(activeBoard, activeSlot);
  const actionDisabled =
    readOnly ||
    moveSlot.isPending ||
    duplicateSlot.isPending ||
    removeSlot.isPending ||
    upsertSlot.isPending;
  const mutationError =
    moveSlot.error ??
    duplicateSlot.error ??
    removeSlot.error ??
    upsertSlot.error ??
    null;

  function saveComposition(
    nextExtras: MealSlotEntry[],
    nextNote: string | null,
  ) {
    const request: UpsertMealSlotRequest = {
      weekStartDate: activeSlot.weekStartDate,
      dayIndex: activeSlot.dayIndex,
      mealType: activeSlot.mealType,
      primary: entryToRequest(activePrimary),
      extras: nextExtras.map(entryToRequest),
      note: nextNote,
      collisionMode: "replace_primary",
    };
    upsertSlot.mutate(request);
  }

  function handleRemoveExtra(extraId: string) {
    const nextExtras = workingExtras.filter((extra) => extra.id !== extraId);
    setWorkingExtras(nextExtras);
    saveComposition(nextExtras, activeSlot.note);
  }

  function baseMoveRequest(
    collisionMode: MealCollisionMode,
  ): MoveMealSlotRequest {
    const dest = getDestination(activeSlot);
    return {
      sourceWeekStartDate: activeSlot.weekStartDate,
      sourceDayIndex: activeSlot.dayIndex,
      sourceMealType: activeSlot.mealType,
      destinationWeekStartDate: dest.weekStartDate,
      destinationDayIndex: dest.dayIndex,
      destinationMealType: activeSlot.mealType,
      collisionMode,
    };
  }

  function handleMove() {
    const request = baseMoveRequest("replace_primary");
    if (destinationSlot?.primary) {
      setPendingCollision({ kind: "move", request });
      return;
    }

    moveSlot.mutate(request);
  }

  function handleDuplicate() {
    const request = baseMoveRequest("replace_primary");
    if (destinationSlot?.primary) {
      setPendingCollision({ kind: "duplicate", request });
      return;
    }

    duplicateSlot.mutate(request);
  }

  function resolveCollision(collisionMode: MealCollisionMode) {
    if (!pendingCollision) return;
    const request = { ...pendingCollision.request, collisionMode };

    if (pendingCollision.kind === "move") {
      moveSlot.mutate(request);
    } else {
      duplicateSlot.mutate(request);
    }
    setPendingCollision(null);
  }

  return (
    <>
      <MobileSheet
        isOpen={isOpen}
        onClose={() => onOpenChange(false)}
        title={`${formatMealType(activeSlot.mealType)} Plan`}
      >
        {showRecipe ? (
          recipe.data?.data ? (
            <RecipeDetailView
              recipe={recipe.data.data}
              onBack={() => setShowRecipe(false)}
              onAddToMeals={() => undefined}
              onEdit={() => undefined}
              onToggleFavorite={() => undefined}
            />
          ) : recipe.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading recipe...</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Recipe could not be loaded.
            </p>
          )
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Primary
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">
                {activePrimary.title}
              </h2>
              {activePrimary.note ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {activePrimary.note}
                </p>
              ) : null}
              {workingExtras.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {workingExtras.map((extra) => (
                    <span
                      key={extra.id}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {extra.title}
                      {!readOnly ? (
                        <button
                          type="button"
                          aria-label={`Remove extra: ${extra.title}`}
                          className="rounded-full p-0.5 hover:bg-secondary-foreground/10"
                          disabled={actionDisabled}
                          onClick={() => handleRemoveExtra(extra.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={actionDisabled}
                onClick={() => onReplace?.(activeSlot)}
              >
                Replace meal
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={actionDisabled}
                onClick={() => onAddExtra?.(activeSlot)}
              >
                Add extra or side
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={actionDisabled}
                onClick={handleMove}
              >
                Move meal
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={actionDisabled}
                onClick={handleDuplicate}
              >
                Duplicate meal
              </Button>
              {recipeId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRecipe(true)}
                >
                  View recipe
                </Button>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                disabled={actionDisabled}
                onClick={() =>
                  removeSlot.mutate({
                    weekStartDate: activeSlot.weekStartDate,
                    dayIndex: activeSlot.dayIndex,
                    mealType: activeSlot.mealType,
                  })
                }
              >
                Remove meal
              </Button>
            </div>

            {mutationError ? (
              <p className="text-sm text-destructive" role="alert">
                {mutationError instanceof Error
                  ? mutationError.message
                  : "Action failed. Try again."}
              </p>
            ) : null}
          </div>
        )}
      </MobileSheet>

      <Dialog
        open={pendingCollision !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCollision(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>That slot already has a meal</DialogTitle>
            <DialogDescription>
              Choose whether to replace the primary meal or add this meal as an
              extra.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPendingCollision(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => resolveCollision("add_as_extra")}
            >
              Add as extra
            </Button>
            <Button
              type="button"
              onClick={() => resolveCollision("replace_primary")}
            >
              Replace primary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
