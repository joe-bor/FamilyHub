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
import type {
  MealCollisionMode,
  MealSlot,
  RecipeSummary,
  UpsertMealSlotRequest,
} from "@/lib/types";
import { useAppStore } from "@/stores";
import { formatMealType } from "./meal-type-utils";
import { RecipeMatchList } from "./recipe-match-list";

export type MealSlotSelection = MealSlot & {
  seededRecipeId?: string | null;
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
  const [collisionRequest, setCollisionRequest] =
    useState<UpsertMealSlotRequest | null>(null);
  const recipes = useRecipes();
  const upsertSlot = useUpsertMealSlot({
    onSuccess: () => onOpenChange(false),
  });
  const startRecipeCreationFromMealSlot = useAppStore(
    (state) => state.startRecipeCreationFromMealSlot,
  );
  const setActiveModule = useAppStore((state) => state.setActiveModule);

  useEffect(() => {
    if (isOpen) {
      setMealName("");
      setImageUrl("");
      setNote("");
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

  if (!slot) return null;

  const activeSlot = slot;
  const title = `Plan ${formatMealType(activeSlot.mealType)}`;
  const trimmedMealName = mealName.trim();
  const seededRecipeId = activeSlot.seededRecipeId ?? null;

  function submitRequest(request: UpsertMealSlotRequest) {
    if (activeSlot.primary && request.collisionMode === null) {
      setCollisionRequest(request);
      return;
    }

    upsertSlot.mutate(request);
  }

  function buildRecipeRequest(
    recipeId: string,
    collisionMode: MealCollisionMode | null = null,
  ): UpsertMealSlotRequest {
    return {
      weekStartDate: activeSlot.weekStartDate,
      dayIndex: activeSlot.dayIndex,
      mealType: activeSlot.mealType,
      primary: {
        sourceType: "recipe",
        recipeId,
        title: null,
        imageUrl: null,
        note: null,
      },
      extras: [],
      note: null,
      collisionMode,
    };
  }

  function handleSelectRecipe(recipe: RecipeSummary) {
    submitRequest(buildRecipeRequest(recipe.id));
  }

  function handleSeededRecipe() {
    if (!seededRecipeId) return;
    submitRequest(buildRecipeRequest(seededRecipeId));
  }

  function handleCreateQuickMeal() {
    if (!trimmedMealName) return;

    submitRequest({
      weekStartDate: activeSlot.weekStartDate,
      dayIndex: activeSlot.dayIndex,
      mealType: activeSlot.mealType,
      primary: {
        sourceType: "quick",
        recipeId: null,
        title: trimmedMealName,
        imageUrl: imageUrl.trim() || null,
        note: note.trim() || null,
      },
      extras: [],
      note: null,
      collisionMode: null,
    });
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
                Add recipe to slot
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
                Create quick meal
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

            {upsertSlot.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {upsertSlot.error instanceof Error
                  ? upsertSlot.error.message
                  : "Failed to save meal. Try again."}
              </p>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setActiveModule("recipes");
                onOpenChange(false);
              }}
            >
              Browse recipe library
            </Button>

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
              onClick={() => setCollisionRequest(null)}
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
