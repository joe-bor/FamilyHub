import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { parseLocalDate } from "@/lib/time-utils";
import type { MealBoard, MealSlot, RecipeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import type {
  MealPlanningDraft,
  MealPlanningTarget,
} from "./meal-planning-session";
import { formatMealType } from "./meal-type-utils";
import { RecipeMatchList } from "./recipe-match-list";

export interface MealPlanningPanelProps {
  isOpen: boolean;
  board: MealBoard;
  queue: MealSlot[];
  drafts: MealPlanningDraft[];
  currentIndex: number;
  recipes: RecipeSummary[];
  isSaving: boolean;
  saveError: Error | null;
  conflictedTargets: MealPlanningTarget[];
  onAddDraft: (draft: MealPlanningDraft) => void;
  onRemoveDraft: (target: MealPlanningTarget) => void;
  onSkip: () => void;
  onBack: () => void;
  onReview: () => void;
  onSave: () => void;
  onSaveNonConflicted: () => void;
  onKeepEditing: () => void;
  onCancelSave: () => void;
  onCancel: () => void;
  onChangeDraft?: (target: MealPlanningTarget) => void;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function recipeMatchesQuery(recipe: RecipeSummary, query: string) {
  if (!query) return true;

  const normalizedTitle = normalize(recipe.title);
  const normalizedTags = recipe.tags.map((tag) => normalize(tag));
  return (
    normalizedTitle.includes(query) ||
    normalizedTags.some((tag) => tag.includes(query))
  );
}

function sortedByFavoriteThenRecent(recipes: RecipeSummary[]) {
  return [...recipes].sort((left, right) => {
    if (left.favorite !== right.favorite) return left.favorite ? -1 : 1;
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function targetKey(target: MealPlanningTarget) {
  return `${target.dayIndex}:${target.mealType}`;
}

function sameTarget(left: MealPlanningTarget, right: MealPlanningTarget) {
  return left.dayIndex === right.dayIndex && left.mealType === right.mealType;
}

function dayNameFromDate(date: string) {
  return parseLocalDate(date).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function dayLabelForTarget(board: MealBoard, target: MealPlanningTarget) {
  const day = board.days.find(
    (candidate) => candidate.dayIndex === target.dayIndex,
  );
  return day ? dayNameFromDate(day.date) : `Day ${target.dayIndex + 1}`;
}

function draftForTarget(
  drafts: MealPlanningDraft[],
  target: MealPlanningTarget | null,
) {
  if (!target) return null;
  return drafts.find((draft) => sameTarget(draft.target, target)) ?? null;
}

export function MealPlanningPanel({
  isOpen,
  board,
  queue,
  drafts,
  currentIndex,
  recipes,
  isSaving,
  saveError,
  conflictedTargets,
  onAddDraft,
  onRemoveDraft,
  onSkip,
  onBack,
  onReview,
  onSave,
  onSaveNonConflicted,
  onKeepEditing,
  onCancelSave,
  onCancel,
  onChangeDraft,
}: MealPlanningPanelProps) {
  const [mealName, setMealName] = useState("");
  const [showAll, setShowAll] = useState(false);

  const currentSlot = queue[currentIndex] ?? null;
  const currentTarget = currentSlot
    ? { dayIndex: currentSlot.dayIndex, mealType: currentSlot.mealType }
    : null;
  const currentTargetKey = currentTarget ? targetKey(currentTarget) : "review";
  const currentDraft = draftForTarget(drafts, currentTarget);
  const isReviewing = currentIndex >= queue.length;
  const query = normalize(mealName);

  useEffect(() => {
    if (!isOpen) return;
    if (currentTargetKey === "review") {
      setMealName("");
      setShowAll(false);
      return;
    }
    if (currentDraft?.primary.sourceType === "quick") {
      setMealName(currentDraft.displayTitle);
    } else {
      setMealName("");
    }
    setShowAll(false);
  }, [currentDraft, currentTargetKey, isOpen]);

  const favoriteRecipes = useMemo(
    () =>
      recipes
        .filter((recipe) => recipe.favorite)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 4),
    [recipes],
  );
  const recentRecipes = useMemo(
    () =>
      recipes
        .filter((recipe) => !recipe.favorite)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 4),
    [recipes],
  );
  const matchingRecipes = useMemo(
    () =>
      sortedByFavoriteThenRecent(
        recipes.filter((recipe) => recipeMatchesQuery(recipe, query)),
      ).slice(0, 6),
    [recipes, query],
  );
  const allSortedRecipes = useMemo(
    () =>
      sortedByFavoriteThenRecent(
        recipes.filter((recipe) => recipeMatchesQuery(recipe, query)),
      ),
    [recipes, query],
  );
  const progressLabel =
    currentSlot !== null
      ? `${dayLabelForTarget(board, currentSlot)} ${currentSlot.mealType} - ${
          currentIndex + 1
        } of ${queue.length}`
      : null;

  function addQuickDraft() {
    if (!currentTarget) return;
    const title = mealName.trim();
    if (!title) return;

    onAddDraft({
      target: currentTarget,
      displayTitle: title,
      displayImageUrl: null,
      displayNote: null,
      primary: {
        sourceType: "quick",
        recipeId: null,
        title,
        imageUrl: null,
        note: null,
      },
      note: null,
    });
  }

  function addRecipeDraft(recipe: RecipeSummary) {
    if (!currentTarget) return;

    onAddDraft({
      target: currentTarget,
      displayTitle: recipe.title,
      displayImageUrl: recipe.imageUrl,
      displayNote: null,
      primary: {
        sourceType: "recipe",
        recipeId: recipe.id,
        title: null,
        imageUrl: null,
        note: null,
      },
      note: null,
    });
  }

  function changeDraft(target: MealPlanningTarget) {
    onChangeDraft?.(target);
  }

  function guardedCancel() {
    if (isSaving) return;
    onCancel();
  }

  function renderPlanningSurface() {
    if (!currentTarget && drafts.length === 0) return null;

    const sortedDrafts = [...drafts].sort((left, right) => {
      const leftIndex = queue.findIndex((slot) =>
        sameTarget(slot, left.target),
      );
      const rightIndex = queue.findIndex((slot) =>
        sameTarget(slot, right.target),
      );
      return (
        (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
        (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex)
      );
    });

    return (
      <section
        aria-label="Planning board status"
        className="space-y-2 rounded-lg border border-border bg-muted/30 p-3"
      >
        <h3 className="text-sm font-semibold text-foreground">
          Planning board status
        </h3>
        <div className="space-y-2">
          {currentTarget && !currentDraft ? (
            <button
              type="button"
              aria-current="true"
              aria-label={`Current ${currentTarget.mealType} target: ${dayLabelForTarget(
                board,
                currentTarget,
              )} ${currentTarget.mealType}`}
              className="w-full rounded-lg border border-primary/50 bg-primary/5 p-3 text-left text-sm font-medium text-foreground"
              disabled={isSaving}
              onClick={() => changeDraft(currentTarget)}
            >
              Current target: {dayLabelForTarget(board, currentTarget)}{" "}
              {formatMealType(currentTarget.mealType)}
            </button>
          ) : null}

          {sortedDrafts.map((draft) => {
            const isCurrent =
              currentTarget !== null && sameTarget(currentTarget, draft.target);
            return (
              <button
                key={targetKey(draft.target)}
                type="button"
                aria-current={isCurrent ? "true" : undefined}
                aria-label={`Draft ${draft.target.mealType}: ${draft.displayTitle}`}
                className={cn(
                  "w-full rounded-lg border border-border bg-card p-3 text-left text-sm transition-colors",
                  isCurrent ? "border-primary/70 bg-primary/5" : null,
                )}
                disabled={isSaving}
                onClick={() => changeDraft(draft.target)}
              >
                <span className="block font-semibold text-foreground">
                  Draft: {draft.displayTitle}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {dayLabelForTarget(board, draft.target)}{" "}
                  {formatMealType(draft.target.mealType)}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  function renderRecipeTray() {
    return showAll ? (
      <RecipeMatchList
        title="All recipes"
        recipes={allSortedRecipes}
        onSelectRecipe={addRecipeDraft}
      />
    ) : (
      <>
        {query ? (
          <RecipeMatchList
            title="Matching recipes"
            recipes={matchingRecipes}
            onSelectRecipe={addRecipeDraft}
          />
        ) : (
          <>
            <RecipeMatchList
              title="Favorite recipes"
              recipes={favoriteRecipes}
              onSelectRecipe={addRecipeDraft}
            />
            <RecipeMatchList
              title="Recent recipes"
              recipes={recentRecipes}
              onSelectRecipe={addRecipeDraft}
            />
          </>
        )}

        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start"
          disabled={isSaving}
          onClick={() => setShowAll(true)}
        >
          Show all recipes
        </Button>
      </>
    );
  }

  function renderDraftList() {
    if (drafts.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No meals are queued for this week yet.
        </p>
      );
    }

    return (
      <ul aria-label="Draft meals" className="space-y-2">
        {drafts.map((draft) => (
          <li
            key={targetKey(draft.target)}
            className={cn(
              "rounded-lg border border-border bg-card p-3",
              conflictedTargets.some((target) =>
                sameTarget(target, draft.target),
              )
                ? "border-destructive/50 bg-destructive/5"
                : null,
            )}
          >
            <div className="flex items-start gap-3">
              {draft.displayImageUrl ? (
                <img
                  src={draft.displayImageUrl}
                  alt=""
                  className="h-12 w-12 rounded-md object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-md bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {draft.displayTitle}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dayLabelForTarget(board, draft.target)}{" "}
                  {formatMealType(draft.target.mealType)}
                </p>
                {draft.displayNote ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {draft.displayNote}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => changeDraft(draft.target)}
              >
                Change draft
              </Button>
              <Button
                type="button"
                variant="ghost"
                aria-label={`Remove draft: ${draft.displayTitle}`}
                disabled={isSaving}
                onClick={() => onRemoveDraft(draft.target)}
              >
                Remove draft
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  function renderConflictSummary() {
    if (conflictedTargets.length === 0) return null;

    return (
      <section className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Some slots changed
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {conflictedTargets.length} draft
            {conflictedTargets.length === 1 ? "" : "s"} can no longer be saved
            because the slot is no longer empty.
          </p>
        </div>
        <div className="grid gap-2">
          <Button
            type="button"
            disabled={isSaving}
            onClick={onSaveNonConflicted}
          >
            Skip conflicted and save remaining
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={onKeepEditing}
          >
            Keep editing
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSaving}
            onClick={onCancelSave}
          >
            Cancel save
          </Button>
        </div>
      </section>
    );
  }

  return (
    <MobileSheet isOpen={isOpen} onClose={guardedCancel} title="Meal planning">
      <div className="space-y-5">
        {saveError ? (
          <p className="text-sm text-destructive" role="alert">
            {saveError.message}
          </p>
        ) : null}

        {isReviewing ? (
          <div className="space-y-5">
            {renderPlanningSurface()}

            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {drafts.length} meals ready to add
                </h2>
                <p className="text-sm text-muted-foreground">
                  Review the local draft plan before saving it to the week.
                </p>
              </div>
              {renderDraftList()}
            </section>

            {renderConflictSummary()}

            <div className="grid gap-2">
              <Button
                type="button"
                disabled={drafts.length === 0 || isSaving}
                onClick={onSave}
              >
                {isSaving ? "Saving..." : "Save to week"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={onKeepEditing}
              >
                Keep editing
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isSaving}
                onClick={guardedCancel}
              >
                Cancel planning
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {renderPlanningSurface()}

            <section className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {progressLabel}
                </p>
                {currentDraft ? (
                  <p className="text-sm text-muted-foreground">
                    Current draft: {currentDraft.displayTitle}
                  </p>
                ) : null}
              </div>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-foreground">
                  Meal name
                </span>
                <input
                  value={mealName}
                  onChange={(event) => setMealName(event.target.value)}
                  disabled={isSaving}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!mealName.trim() || isSaving}
                  onClick={addQuickDraft}
                >
                  {currentDraft ? "Update draft" : "Add quick meal draft"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={onSkip}
                >
                  Skip this slot
                </Button>
              </div>

              {currentDraft ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  aria-label={`Remove draft: ${currentDraft.displayTitle}`}
                  disabled={isSaving}
                  onClick={() => onRemoveDraft(currentDraft.target)}
                >
                  Remove draft
                </Button>
              ) : null}
            </section>

            <fieldset
              disabled={isSaving}
              className="m-0 min-w-0 space-y-3 border-0 p-0"
            >
              {renderRecipeTray()}
            </fieldset>

            <div className="grid gap-2">
              <Button type="button" disabled={isSaving} onClick={onReview}>
                Review plan
              </Button>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentIndex === 0 || isSaving}
                  onClick={onBack}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={guardedCancel}
                >
                  Cancel planning
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileSheet>
  );
}
