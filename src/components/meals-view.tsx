import { useEffect, useMemo, useState } from "react";
import { useMealsBoard, useRecipes } from "@/api";
import {
  MealComposerSheet,
  type MealSlotSelection,
} from "@/components/meals/meal-composer-sheet";
import { MealDayCard } from "@/components/meals/meal-day-card";
import { MealEditorSheet } from "@/components/meals/meal-editor-sheet";
import { MealGrid } from "@/components/meals/meal-grid";
import { WeekHeader } from "@/components/meals/week-header";
import { useMediaQuery } from "@/hooks";
import {
  formatLocalDate,
  getWeekStartSunday,
  isPastWeek,
} from "@/lib/time-utils";
import type { MealBoard } from "@/lib/types";
import type { MealPlacementDraft } from "@/stores";
import { useAppStore } from "@/stores";

export function MealsView() {
  const [visibleWeekStartDate, setVisibleWeekStartDate] = useState(() =>
    formatLocalDate(getWeekStartSunday(new Date())),
  );
  const [selectedSlot, setSelectedSlot] = useState<MealSlotSelection | null>(
    null,
  );
  const [editingSlot, setEditingSlot] = useState<MealSlotSelection | null>(
    null,
  );
  const [editingBoard, setEditingBoard] = useState<MealBoard | null>(null);
  const [placementDraft, setPlacementDraft] =
    useState<MealPlacementDraft | null>(null);
  const board = useMealsBoard(visibleWeekStartDate);
  const recipes = useRecipes();
  const pendingPlacementDraft = useAppStore(
    (state) => state.mealPlacementDraft,
  );
  const consumeMealPlacementDraft = useAppStore(
    (state) => state.consumeMealPlacementDraft,
  );
  const readOnly = isPastWeek(visibleWeekStartDate);
  const showGrid = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    if (!pendingPlacementDraft) return;

    setVisibleWeekStartDate(pendingPlacementDraft.requestedAtWeekStartDate);
    setPlacementDraft(pendingPlacementDraft);
    consumeMealPlacementDraft();
  }, [consumeMealPlacementDraft, pendingPlacementDraft]);

  useEffect(() => {
    if (!placementDraft || placementDraft.source.kind !== "meals-slot") return;
    const source = placementDraft.source;
    const day = board.data?.data.days[source.dayIndex];
    const slot = day?.slots.find(
      (candidate) => candidate.mealType === source.mealType,
    );
    if (!slot) return;

    setSelectedSlot({
      ...slot,
      seededRecipeId: placementDraft.recipeId,
    });
    setPlacementDraft(null);
  }, [board.data?.data.days, placementDraft]);

  const placementRecipe = useMemo(() => {
    if (!placementDraft) return null;
    return (
      recipes.data?.data.find(
        (recipe) => recipe.id === placementDraft.recipeId,
      ) ?? null
    );
  }, [placementDraft, recipes.data?.data]);

  const pendingRecipeId =
    placementDraft?.source.kind === "recipes-library"
      ? placementDraft.recipeId
      : null;

  function selectSlot(slot: MealSlotSelection) {
    if (slot.primary && !pendingRecipeId) {
      setEditingSlot(slot);
      setEditingBoard(board.data?.data ?? null);
      return;
    }

    setSelectedSlot(
      pendingRecipeId
        ? {
            ...slot,
            seededRecipeId: pendingRecipeId,
          }
        : slot,
    );
    if (pendingRecipeId) {
      setPlacementDraft(null);
    }
  }

  return (
    <section className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <WeekHeader
          weekStartDate={visibleWeekStartDate}
          readOnly={readOnly}
          onWeekChange={(weekStartDate) => {
            setVisibleWeekStartDate(weekStartDate);
            setSelectedSlot(null);
            setEditingSlot(null);
            setEditingBoard(null);
          }}
        />

        {placementRecipe ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm font-medium text-primary">
            Choose a meal slot for {placementRecipe.title}
          </div>
        ) : null}

        {board.isLoading ? (
          <p className="text-sm font-medium text-muted-foreground">
            Loading meals...
          </p>
        ) : null}

        {board.isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <h2 className="text-base font-semibold text-foreground">
              Meals could not be loaded
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {board.error instanceof Error
                ? board.error.message
                : "Try again in a moment."}
            </p>
          </div>
        ) : null}

        {board.data?.data && !showGrid ? (
          <div className="space-y-4">
            {board.data.data.days.map((day) => (
              <MealDayCard
                key={day.date}
                day={day}
                readOnly={readOnly}
                pendingRecipeId={pendingRecipeId}
                onSelectSlot={selectSlot}
              />
            ))}
          </div>
        ) : null}

        {board.data?.data && showGrid ? (
          <MealGrid
            board={board.data.data}
            readOnly={readOnly}
            pendingRecipeId={pendingRecipeId}
            onSelectSlot={selectSlot}
          />
        ) : null}
      </div>

      <MealComposerSheet
        isOpen={selectedSlot !== null}
        slot={selectedSlot}
        readOnly={readOnly}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSlot(null);
          }
        }}
      />

      <MealEditorSheet
        isOpen={editingSlot !== null}
        slot={editingSlot}
        board={editingBoard}
        readOnly={readOnly}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSlot(null);
            setEditingBoard(null);
          }
        }}
      />
    </section>
  );
}
