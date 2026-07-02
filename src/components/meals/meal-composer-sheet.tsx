import { useEffect, useMemo, useState } from "react";
import { useRecipes, useUpsertMealSlot } from "@/api";
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
import { useBackHandler } from "@/hooks";
import type {
  MealCollisionMode,
  MealEntryRequest,
  MealSlot,
  MealSlotEntry,
  RecipeSummary,
  UpsertMealSlotRequest,
} from "@/lib/types";
import {
  toMealEntryRequest,
  upsertMealSlotSchema,
} from "@/lib/validations/meals";
import { useAppStore } from "@/stores";
import { formatMealType } from "./meal-type-utils";
import { RecipeMatchList } from "./recipe-match-list";

export type MealSlotSelection = MealSlot & {
  seededRecipeId?: string | null;
  intent?: "primary" | "extra";
};

interface MealComposerSheetProps {
  isOpen: boolean;
  slot: MealSlotSelection | null;
  readOnly?: boolean;
  onOpenChange: (open: boolean) => void;
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

function existingEntryToRequest(entry: MealSlotEntry): MealEntryRequest {
  if (entry.sourceType === "recipe" && entry.recipeId) {
    return {
      sourceType: "recipe",
      recipeId: entry.recipeId,
      title: null,
      imageUrl: null,
      note: null,
    };
  }

  return {
    sourceType: "quick",
    recipeId: null,
    title: entry.title,
    imageUrl: entry.imageUrl,
    note: entry.note,
  };
}

function sortedByFavoriteThenRecent(recipes: RecipeSummary[]) {
  return [...recipes].sort((left, right) => {
    if (left.favorite !== right.favorite) return left.favorite ? -1 : 1;
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export function MealComposerSheet({
  isOpen,
  slot,
  readOnly = false,
  onOpenChange,
}: MealComposerSheetProps) {
  const [mealName, setMealName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [note, setNote] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [collisionRequest, setCollisionRequest] =
    useState<UpsertMealSlotRequest | null>(null);
  useBackHandler(collisionRequest !== null, () => setCollisionRequest(null));
  const recipes = useRecipes();
  const upsertSlot = useUpsertMealSlot({
    onSuccess: () => onOpenChange(false),
  });
  const startRecipeCreationFromMealSlot = useAppStore(
    (state) => state.startRecipeCreationFromMealSlot,
  );

  useEffect(() => {
    if (isOpen) {
      setMealName("");
      setImageUrl("");
      setNote("");
      setShowAll(false);
      setValidationError(null);
      setCollisionRequest(null);
    }
  }, [isOpen]);

  const allRecipes = recipes.data?.data ?? [];
  const query = normalize(mealName);
  const favoriteRecipes = useMemo(
    () =>
      allRecipes
        .filter((recipe) => recipe.favorite)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 4),
    [allRecipes],
  );
  const recentRecipes = useMemo(
    () =>
      allRecipes
        .filter((recipe) => !recipe.favorite)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 4),
    [allRecipes],
  );
  const matchingRecipes = useMemo(
    () =>
      sortedByFavoriteThenRecent(
        allRecipes.filter((recipe) => recipeMatchesQuery(recipe, query)),
      ).slice(0, 6),
    [allRecipes, query],
  );
  const allSortedRecipes = useMemo(
    () =>
      sortedByFavoriteThenRecent(
        allRecipes.filter((recipe) => recipeMatchesQuery(recipe, query)),
      ),
    [allRecipes, query],
  );

  if (!slot) return null;

  const activeSlot = slot;
  const isExtraIntent = activeSlot.intent === "extra";
  const title = isExtraIntent
    ? "Add a side"
    : `Plan ${formatMealType(activeSlot.mealType)}`;
  const trimmedMealName = mealName.trim();
  const seededRecipeId = activeSlot.seededRecipeId ?? null;
  const existingExtrasForNewPrimary = activeSlot.primary
    ? []
    : activeSlot.extras.map(existingEntryToRequest);

  function submitRequest(request: UpsertMealSlotRequest) {
    if (isExtraIntent) {
      upsertSlot.mutate({ ...request, collisionMode: "add_as_extra" });
      return;
    }
    if (activeSlot.primary && request.collisionMode === null) {
      setCollisionRequest(request);
      return;
    }

    upsertSlot.mutate(request);
  }

  function buildValidatedRequest(
    input: unknown,
  ):
    | { ok: true; request: UpsertMealSlotRequest }
    | { ok: false; message: string } {
    const parsed = upsertMealSlotSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message:
          parsed.error.issues[0]?.message ??
          "Check the meal details and try again.",
      };
    }
    return {
      ok: true,
      request: {
        weekStartDate: parsed.data.weekStartDate,
        dayIndex: parsed.data.dayIndex,
        mealType: parsed.data.mealType,
        primary: toMealEntryRequest(parsed.data.primary),
        extras: parsed.data.extras.map(toMealEntryRequest),
        note: parsed.data.note,
        collisionMode: parsed.data.collisionMode,
      },
    };
  }

  function placeRecipe(recipeId: string) {
    const result = buildValidatedRequest({
      weekStartDate: activeSlot.weekStartDate,
      dayIndex: activeSlot.dayIndex,
      mealType: activeSlot.mealType,
      // The user's meal-planning note belongs to the slot; the recipe entry
      // snapshot is sourced from the saved recipe (entry note forced to null).
      primary: { sourceType: "recipe", recipeId },
      extras: existingExtrasForNewPrimary,
      note,
      collisionMode: null,
    });
    if (!result.ok) {
      setValidationError(result.message);
      return;
    }
    setValidationError(null);
    submitRequest(result.request);
  }

  function handleSelectRecipe(recipe: RecipeSummary) {
    placeRecipe(recipe.id);
  }

  function handleSeededRecipe() {
    if (!seededRecipeId) return;
    placeRecipe(seededRecipeId);
  }

  function handleCreateQuickMeal() {
    if (!trimmedMealName) return;

    const result = buildValidatedRequest({
      weekStartDate: activeSlot.weekStartDate,
      dayIndex: activeSlot.dayIndex,
      mealType: activeSlot.mealType,
      // Quick-meal note belongs to the entry, not the slot (unchanged behavior).
      primary: { sourceType: "quick", title: mealName, imageUrl, note },
      extras: existingExtrasForNewPrimary,
      note: null,
      collisionMode: null,
    });
    if (!result.ok) {
      setValidationError(result.message);
      return;
    }
    setValidationError(null);
    submitRequest(result.request);
  }

  function handleCreateRecipeFromThis() {
    if (!trimmedMealName) return;

    startRecipeCreationFromMealSlot({
      requestedAtWeekStartDate: activeSlot.weekStartDate,
      dayIndex: activeSlot.dayIndex,
      mealType: activeSlot.mealType,
      typedTitle: trimmedMealName,
    });
    onOpenChange(false);
  }

  function resolveCollision(collisionMode: MealCollisionMode) {
    if (!collisionRequest) return;
    setValidationError(null);
    upsertSlot.mutate({ ...collisionRequest, collisionMode });
    setCollisionRequest(null);
  }

  return (
    <>
      <MobileSheet
        isOpen={isOpen}
        onClose={() => onOpenChange(false)}
        title={title}
      >
        {readOnly ? (
          <p className="text-sm text-muted-foreground">
            This week is available for review only.
          </p>
        ) : (
          <div className="space-y-5">
            {seededRecipeId ? (
              <Button
                type="button"
                className="w-full"
                disabled={upsertSlot.isPending}
                onClick={handleSeededRecipe}
              >
                {isExtraIntent ? "Add recipe as side" : "Add recipe to slot"}
              </Button>
            ) : null}

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-foreground">
                  Meal name
                </span>
                <input
                  value={mealName}
                  onChange={(event) => setMealName(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-foreground">
                  Image URL
                </span>
                <input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-foreground">
                  Note
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={!trimmedMealName || upsertSlot.isPending}
                onClick={handleCreateQuickMeal}
              >
                {isExtraIntent ? "Add side" : "Create quick meal"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!trimmedMealName}
                onClick={handleCreateRecipeFromThis}
              >
                Create recipe from this
              </Button>
            </div>

            {validationError ? (
              <p className="text-sm text-destructive" role="alert">
                {validationError}
              </p>
            ) : upsertSlot.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {upsertSlot.error instanceof Error
                  ? upsertSlot.error.message
                  : "Failed to save meal. Try again."}
              </p>
            ) : null}

            {showAll ? (
              <RecipeMatchList
                title="All recipes"
                recipes={allSortedRecipes}
                onSelectRecipe={handleSelectRecipe}
              />
            ) : (
              <>
                {query ? (
                  <RecipeMatchList
                    title="Matching recipes"
                    recipes={matchingRecipes}
                    onSelectRecipe={handleSelectRecipe}
                  />
                ) : (
                  <>
                    <RecipeMatchList
                      title="Favorite recipes"
                      recipes={favoriteRecipes}
                      onSelectRecipe={handleSelectRecipe}
                    />
                    <RecipeMatchList
                      title="Recent recipes"
                      recipes={recentRecipes}
                      onSelectRecipe={handleSelectRecipe}
                    />
                  </>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setShowAll(true)}
                >
                  Show all recipes
                </Button>
              </>
            )}
          </div>
        )}
      </MobileSheet>

      <Dialog
        open={collisionRequest !== null}
        onOpenChange={(open) => {
          if (!open) setCollisionRequest(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>That slot already has a meal</DialogTitle>
            <DialogDescription>
              Choose whether to replace the primary meal or add this as an
              extra.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => setCollisionRequest(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => resolveCollision("add_as_extra")}
            >
              Add as extra
            </Button>
            <Button
              type="button"
              className="min-h-11"
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
