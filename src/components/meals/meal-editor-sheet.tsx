import { useState } from "react";
import {
  useDuplicateMealSlot,
  useMoveMealSlot,
  useRecipe,
  useRemoveMealSlot,
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
import type {
  DuplicateMealSlotRequest,
  MealBoard,
  MealCollisionMode,
  MealSlot,
  MoveMealSlotRequest,
} from "@/lib/types";
import { formatMealType } from "./meal-type-utils";

type PendingCollision =
  | { kind: "move"; request: MoveMealSlotRequest }
  | { kind: "duplicate"; request: DuplicateMealSlotRequest };

interface MealEditorSheetProps {
  isOpen: boolean;
  slot: MealSlot | null;
  board: MealBoard | null;
  readOnly: boolean;
  onOpenChange: (open: boolean) => void;
}

function nextDayIndex(dayIndex: number) {
  return dayIndex === 6 ? 0 : dayIndex + 1;
}

function findDestinationSlot(board: MealBoard, slot: MealSlot) {
  const destinationDayIndex = nextDayIndex(slot.dayIndex);
  return board.days[destinationDayIndex].slots.find(
    (candidate) => candidate.mealType === slot.mealType,
  );
}

export function MealEditorSheet({
  isOpen,
  slot,
  board,
  readOnly,
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

  if (!slot || !board || !slot.primary) return null;

  const activeSlot = slot;
  const activeBoard = board;
  const activePrimary = slot.primary;
  const destinationSlot = findDestinationSlot(activeBoard, activeSlot);
  const actionDisabled =
    readOnly ||
    moveSlot.isPending ||
    duplicateSlot.isPending ||
    removeSlot.isPending;
  const mutationError =
    moveSlot.error ?? duplicateSlot.error ?? removeSlot.error ?? null;

  function baseMoveRequest(
    collisionMode: MealCollisionMode,
  ): MoveMealSlotRequest {
    return {
      sourceWeekStartDate: activeSlot.weekStartDate,
      sourceDayIndex: activeSlot.dayIndex,
      sourceMealType: activeSlot.mealType,
      destinationWeekStartDate: activeSlot.weekStartDate,
      destinationDayIndex: nextDayIndex(activeSlot.dayIndex),
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
              {activeSlot.extras.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {activeSlot.extras.map((extra) => (
                    <span
                      key={extra.id}
                      className="rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {extra.title}
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
        <DialogContent aria-describedby={undefined}>
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
