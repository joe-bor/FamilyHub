import { useEffect, useMemo, useRef, useState } from "react";
import { useMealsBoard, useRecipes, useSaveMealPlan } from "@/api";
import { ApiException } from "@/api/client";
import { AddIngredientsContainer } from "@/components/meals/add-ingredients-container";
import {
  MealComposerSheet,
  type MealSlotSelection,
} from "@/components/meals/meal-composer-sheet";
import { MealDayCard } from "@/components/meals/meal-day-card";
import {
  MealEditorSheet,
  type MealSlotId,
} from "@/components/meals/meal-editor-sheet";
import { MealGrid } from "@/components/meals/meal-grid";
import { hasRecipeBackedEntry } from "@/components/meals/meal-ingredient-extraction";
import { MealPlanningPanel } from "@/components/meals/meal-planning-panel";
import { MealPlanningScopeDialog } from "@/components/meals/meal-planning-scope-dialog";
import {
  applyPlanningDraftsToBoard,
  buildPlanningQueue,
  getConflictedDraftTargets,
  type MealPlanningDraft,
  type MealPlanningTarget,
  toSaveMealPlanRequest,
} from "@/components/meals/meal-planning-session";
import { formatWeekRange, WeekHeader } from "@/components/meals/week-header";
import { OfflineUnavailable } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks";
import {
  formatLocalDate,
  getWeekStartSunday,
  isPastWeek,
  parseLocalDate,
} from "@/lib/time-utils";
import type { MealPlanningScope, MealSlot } from "@/lib/types";
import type { MealPlacementDraft } from "@/stores";
import { useAppStore } from "@/stores";

function samePlanningTarget(
  left: MealPlanningTarget,
  right: MealPlanningTarget,
) {
  return left.dayIndex === right.dayIndex && left.mealType === right.mealType;
}

function slotTarget(slot: Pick<MealSlot, "dayIndex" | "mealType">) {
  return { dayIndex: slot.dayIndex, mealType: slot.mealType };
}

function upsertPlanningDraft(
  drafts: MealPlanningDraft[],
  nextDraft: MealPlanningDraft,
) {
  return [
    ...drafts.filter(
      (draft) => !samePlanningTarget(draft.target, nextDraft.target),
    ),
    nextDraft,
  ];
}

function removePlanningTarget<T extends MealPlanningTarget>(
  targets: T[],
  targetToRemove: MealPlanningTarget,
) {
  return targets.filter(
    (target) => !samePlanningTarget(target, targetToRemove),
  );
}

function hasTarget(targets: MealPlanningTarget[], target: MealPlanningTarget) {
  return targets.some((candidate) => samePlanningTarget(candidate, target));
}

function hasDraftForTarget(
  drafts: MealPlanningDraft[],
  target: MealPlanningTarget,
) {
  return drafts.some((draft) => samePlanningTarget(draft.target, target));
}

function findQueueIndex(queue: MealSlot[], target: MealPlanningTarget) {
  return queue.findIndex((slot) =>
    samePlanningTarget(slotTarget(slot), target),
  );
}

function findNextQueueIndex(
  queue: MealSlot[],
  startIndex: number,
  drafts: MealPlanningDraft[],
  skippedTargets: MealPlanningTarget[],
) {
  for (let index = Math.max(0, startIndex); index < queue.length; index += 1) {
    const target = slotTarget(queue[index]);
    if (hasTarget(skippedTargets, target)) continue;
    if (hasDraftForTarget(drafts, target)) continue;
    return index;
  }

  return queue.length;
}

function findPreviousQueueIndex(
  queue: MealSlot[],
  startIndex: number,
  skippedTargets: MealPlanningTarget[],
) {
  for (
    let index = Math.min(startIndex, queue.length - 1);
    index >= 0;
    index -= 1
  ) {
    const target = slotTarget(queue[index]);
    if (!hasTarget(skippedTargets, target)) return index;
  }

  return -1;
}

function formatScopeDayLabel(date: string) {
  return parseLocalDate(date).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

export function MealsView() {
  const [visibleWeekStartDate, setVisibleWeekStartDate] = useState(() =>
    formatLocalDate(getWeekStartSunday(new Date())),
  );
  const [selectedSlot, setSelectedSlot] = useState<MealSlotSelection | null>(
    null,
  );
  const [editingSlotId, setEditingSlotId] = useState<MealSlotId | null>(null);
  const [placementDraft, setPlacementDraft] =
    useState<MealPlacementDraft | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [addIngredientsOpen, setAddIngredientsOpen] = useState(false);
  const [planningScope, setPlanningScope] = useState<MealPlanningScope | null>(
    null,
  );
  const [planningQueue, setPlanningQueue] = useState<MealSlot[]>([]);
  const [planningDrafts, setPlanningDrafts] = useState<MealPlanningDraft[]>([]);
  const [skippedPlanningTargets, setSkippedPlanningTargets] = useState<
    MealPlanningTarget[]
  >([]);
  const [currentPlanningIndex, setCurrentPlanningIndex] = useState(0);
  const [conflictedTargets, setConflictedTargets] = useState<
    MealPlanningTarget[]
  >([]);
  const [planningSaveError, setPlanningSaveError] = useState<Error | null>(
    null,
  );
  const [isResolvingPlanningConflicts, setIsResolvingPlanningConflicts] =
    useState(false);
  const submittedPlanningDraftsRef = useRef<MealPlanningDraft[]>([]);
  const board = useMealsBoard(visibleWeekStartDate);
  const recipes = useRecipes();
  const pendingPlacementDraft = useAppStore(
    (state) => state.mealPlacementDraft,
  );
  const consumeMealPlacementDraft = useAppStore(
    (state) => state.consumeMealPlacementDraft,
  );
  const pendingMealSlotIntent = useAppStore((state) => state.mealSlotIntent);
  const consumeMealSlotIntent = useAppStore(
    (state) => state.consumeMealSlotIntent,
  );
  const readOnly = isPastWeek(visibleWeekStartDate);
  const showGrid = useMediaQuery("(min-width: 1024px)");
  const persistedBoard = board.data?.data ?? null;
  // "Add ingredients" is offered only when the visible, editable week has at
  // least one recipe-backed planned meal to extract ingredients from.
  const canAddIngredients =
    !readOnly &&
    persistedBoard !== null &&
    hasRecipeBackedEntry(persistedBoard);
  const planningActive = planningScope !== null;
  const currentPlanningTarget =
    planningActive && currentPlanningIndex < planningQueue.length
      ? slotTarget(planningQueue[currentPlanningIndex])
      : null;
  const displayBoard = useMemo(() => {
    if (!persistedBoard) return null;
    return planningActive
      ? applyPlanningDraftsToBoard(persistedBoard, planningDrafts)
      : persistedBoard;
  }, [persistedBoard, planningActive, planningDrafts]);
  const saveMealPlan = useSaveMealPlan({
    onSuccess: () => resetPlanningSession(),
    onError: handlePlanningSaveError,
  });

  useEffect(() => {
    if (!pendingPlacementDraft) return;

    setVisibleWeekStartDate(pendingPlacementDraft.requestedAtWeekStartDate);
    setPlacementDraft(pendingPlacementDraft);
    consumeMealPlacementDraft();
  }, [consumeMealPlacementDraft, pendingPlacementDraft]);

  useEffect(() => {
    if (placementDraft?.source.kind !== "meals-slot") return;
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

  useEffect(() => {
    if (!pendingMealSlotIntent) return;
    setVisibleWeekStartDate(pendingMealSlotIntent.weekStartDate);
  }, [pendingMealSlotIntent]);

  useEffect(() => {
    if (!pendingMealSlotIntent || !persistedBoard) return;

    const day = persistedBoard.days[pendingMealSlotIntent.dayIndex];
    const slot = day?.slots.find(
      (candidate) => candidate.mealType === pendingMealSlotIntent.mealType,
    );
    if (!slot || slot.weekStartDate !== pendingMealSlotIntent.weekStartDate)
      return;

    if (slot.primary || slot.extras.length > 0) {
      setEditingSlotId({
        weekStartDate: slot.weekStartDate,
        dayIndex: slot.dayIndex,
        mealType: slot.mealType,
      });
    } else {
      setSelectedSlot(slot);
    }

    consumeMealSlotIntent();
  }, [consumeMealSlotIntent, pendingMealSlotIntent, persistedBoard]);

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

  function resetPlanningSession() {
    setScopeOpen(false);
    setPlanningScope(null);
    setPlanningQueue([]);
    setPlanningDrafts([]);
    setSkippedPlanningTargets([]);
    setCurrentPlanningIndex(0);
    setConflictedTargets([]);
    setPlanningSaveError(null);
    setIsResolvingPlanningConflicts(false);
    submittedPlanningDraftsRef.current = [];
  }

  async function handlePlanningSaveError(error: Error) {
    setCurrentPlanningIndex(planningQueue.length);

    if (ApiException.isApiException(error) && error.status === 409) {
      setIsResolvingPlanningConflicts(true);
      try {
        const submittedDrafts = submittedPlanningDraftsRef.current;
        const refreshedBoard = (await board.refetch()).data?.data ?? null;
        const conflicts = refreshedBoard
          ? getConflictedDraftTargets(refreshedBoard, submittedDrafts)
          : [];

        if (conflicts.length > 0) {
          setConflictedTargets(conflicts);
          setPlanningSaveError(error);
          return;
        }
      } finally {
        setIsResolvingPlanningConflicts(false);
      }
    }

    setConflictedTargets([]);
    setPlanningSaveError(error);
  }

  function startPlanningSession(scope: MealPlanningScope) {
    if (!persistedBoard) return;
    const nextQueue = buildPlanningQueue(persistedBoard, scope);
    setPlanningScope(scope);
    setPlanningQueue(nextQueue);
    setPlanningDrafts([]);
    setSkippedPlanningTargets([]);
    setCurrentPlanningIndex(0);
    setConflictedTargets([]);
    setPlanningSaveError(null);
    setScopeOpen(false);
    setSelectedSlot(null);
    setEditingSlotId(null);
  }

  function addPlanningDraft(draft: MealPlanningDraft) {
    const nextDrafts = upsertPlanningDraft(planningDrafts, draft);
    const nextSkippedTargets = removePlanningTarget(
      skippedPlanningTargets,
      draft.target,
    );

    setPlanningDrafts(nextDrafts);
    setSkippedPlanningTargets(nextSkippedTargets);
    setConflictedTargets(removePlanningTarget(conflictedTargets, draft.target));
    setPlanningSaveError(null);
    setCurrentPlanningIndex(
      findNextQueueIndex(
        planningQueue,
        currentPlanningIndex + 1,
        nextDrafts,
        nextSkippedTargets,
      ),
    );
  }

  function removePlanningDraft(target: MealPlanningTarget) {
    setPlanningDrafts((current) =>
      current.filter((draft) => !samePlanningTarget(draft.target, target)),
    );
    setConflictedTargets((current) => removePlanningTarget(current, target));
    setPlanningSaveError(null);
  }

  function skipPlanningSlot() {
    const currentSlot = planningQueue[currentPlanningIndex];
    if (!currentSlot) {
      setCurrentPlanningIndex(planningQueue.length);
      return;
    }

    const target = slotTarget(currentSlot);
    const nextSkippedTargets = hasTarget(skippedPlanningTargets, target)
      ? skippedPlanningTargets
      : [...skippedPlanningTargets, target];

    setSkippedPlanningTargets(nextSkippedTargets);
    setPlanningSaveError(null);
    setConflictedTargets([]);
    setCurrentPlanningIndex(
      findNextQueueIndex(
        planningQueue,
        currentPlanningIndex + 1,
        planningDrafts,
        nextSkippedTargets,
      ),
    );
  }

  function goBackInPlanningQueue() {
    const previousIndex = findPreviousQueueIndex(
      planningQueue,
      currentPlanningIndex - 1,
      skippedPlanningTargets,
    );
    if (previousIndex >= 0) {
      setPlanningSaveError(null);
      setConflictedTargets([]);
      setCurrentPlanningIndex(previousIndex);
    }
  }

  function reviewPlanningDrafts() {
    setPlanningSaveError(null);
    setConflictedTargets([]);
    setCurrentPlanningIndex(planningQueue.length);
  }

  function keepEditingPlanningDrafts() {
    const firstConflictedIndex = conflictedTargets
      .map((target) => findQueueIndex(planningQueue, target))
      .find((index) => index >= 0);
    setPlanningSaveError(null);
    setConflictedTargets([]);
    const nextIndex =
      firstConflictedIndex ??
      findNextQueueIndex(
        planningQueue,
        0,
        planningDrafts,
        skippedPlanningTargets,
      );
    setCurrentPlanningIndex(nextIndex < planningQueue.length ? nextIndex : 0);
  }

  function changePlanningDraft(target: MealPlanningTarget) {
    const index = findQueueIndex(planningQueue, target);
    if (index < 0) return;
    setPlanningSaveError(null);
    setConflictedTargets([]);
    setCurrentPlanningIndex(index);
  }

  function cancelPlanningSave() {
    setPlanningSaveError(null);
    setConflictedTargets([]);
    setCurrentPlanningIndex(planningQueue.length);
  }

  function savePlanningDrafts() {
    if (!persistedBoard || planningDrafts.length === 0) return;

    const conflicts = getConflictedDraftTargets(persistedBoard, planningDrafts);
    if (conflicts.length > 0) {
      setConflictedTargets(conflicts);
      setPlanningSaveError(new Error("Some meal slots are no longer empty."));
      setCurrentPlanningIndex(planningQueue.length);
      return;
    }

    setPlanningSaveError(null);
    setConflictedTargets([]);
    const submittedDrafts = [...planningDrafts];
    submittedPlanningDraftsRef.current = submittedDrafts;
    saveMealPlan.mutate(
      toSaveMealPlanRequest(visibleWeekStartDate, submittedDrafts),
    );
  }

  function saveNonConflictedPlanningDrafts() {
    const remainingDrafts = planningDrafts.filter(
      (draft) => !hasTarget(conflictedTargets, draft.target),
    );

    if (remainingDrafts.length === 0) {
      setCurrentPlanningIndex(planningQueue.length);
      return;
    }

    setPlanningDrafts(remainingDrafts);
    setConflictedTargets([]);
    setPlanningSaveError(null);
    submittedPlanningDraftsRef.current = remainingDrafts;
    saveMealPlan.mutate(
      toSaveMealPlanRequest(visibleWeekStartDate, remainingDrafts),
    );
  }

  function selectSlot(slot: MealSlotSelection) {
    if (planningActive) {
      const target = slotTarget(slot);
      const queueIndex = findQueueIndex(planningQueue, target);
      if (queueIndex >= 0) {
        setCurrentPlanningIndex(queueIndex);
        setPlanningSaveError(null);
        setConflictedTargets([]);
        return;
      }
    }

    if ((slot.primary || slot.extras.length > 0) && !pendingRecipeId) {
      setEditingSlotId({
        weekStartDate: slot.weekStartDate,
        dayIndex: slot.dayIndex,
        mealType: slot.mealType,
      });
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

  function replaceFromEditor(slot: MealSlotSelection) {
    setEditingSlotId(null);
    setSelectedSlot({ ...slot, intent: "primary" });
  }

  function addExtraFromEditor(slot: MealSlotSelection) {
    setEditingSlotId(null);
    setSelectedSlot({ ...slot, intent: "extra" });
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
            setEditingSlotId(null);
            setAddIngredientsOpen(false);
            resetPlanningSession();
          }}
        />

        {persistedBoard && !readOnly ? (
          <div className="flex flex-wrap justify-end gap-2">
            {canAddIngredients ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddIngredientsOpen(true)}
              >
                Add ingredients
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => setScopeOpen(true)}
            >
              Fill empty slots
            </Button>
          </div>
        ) : null}

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
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => {
                void board.refetch();
              }}
              disabled={board.isRefetching}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {/* Offline + never loaded: paused query, no data and no error. */}
        {!board.isLoading && !board.isError && !board.data ? (
          <OfflineUnavailable label="meals" />
        ) : null}

        {displayBoard && !showGrid ? (
          <div className="space-y-4">
            {displayBoard.days.map((day) => (
              <MealDayCard
                key={day.date}
                day={day}
                readOnly={readOnly}
                pendingRecipeId={pendingRecipeId}
                planningDrafts={planningActive ? planningDrafts : []}
                planningTarget={currentPlanningTarget}
                onSelectSlot={selectSlot}
              />
            ))}
          </div>
        ) : null}

        {displayBoard && showGrid ? (
          <MealGrid
            board={displayBoard}
            readOnly={readOnly}
            pendingRecipeId={pendingRecipeId}
            planningDrafts={planningActive ? planningDrafts : []}
            planningTarget={currentPlanningTarget}
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
        isOpen={editingSlotId !== null}
        slotId={editingSlotId}
        board={persistedBoard}
        readOnly={readOnly}
        onReplace={replaceFromEditor}
        onAddExtra={addExtraFromEditor}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSlotId(null);
          }
        }}
      />

      <MealPlanningScopeDialog
        isOpen={scopeOpen}
        weekLabel={formatWeekRange(visibleWeekStartDate)}
        days={(persistedBoard?.days ?? []).map((day) => ({
          dayIndex: day.dayIndex,
          label: formatScopeDayLabel(day.date),
        }))}
        onStart={startPlanningSession}
        onOpenChange={setScopeOpen}
      />

      {persistedBoard ? (
        <AddIngredientsContainer
          isOpen={addIngredientsOpen}
          board={persistedBoard}
          onOpenChange={setAddIngredientsOpen}
        />
      ) : null}

      {planningActive && persistedBoard ? (
        <MealPlanningPanel
          isOpen
          board={persistedBoard}
          queue={planningQueue}
          drafts={planningDrafts}
          currentIndex={currentPlanningIndex}
          recipes={recipes.data?.data ?? []}
          isSaving={saveMealPlan.isPending || isResolvingPlanningConflicts}
          saveError={planningSaveError}
          conflictedTargets={conflictedTargets}
          onAddDraft={addPlanningDraft}
          onRemoveDraft={removePlanningDraft}
          onSkip={skipPlanningSlot}
          onBack={goBackInPlanningQueue}
          onReview={reviewPlanningDrafts}
          onSave={savePlanningDrafts}
          onSaveNonConflicted={saveNonConflictedPlanningDrafts}
          onKeepEditing={keepEditingPlanningDrafts}
          onCancelSave={cancelPlanningSave}
          onCancel={resetPlanningSession}
          onChangeDraft={changePlanningDraft}
        />
      ) : null}
    </section>
  );
}
