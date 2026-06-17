import { useEffect, useMemo, useState } from "react";
import { useRecipe, useRecipes, useUpdateRecipe } from "@/api";
import { RecipeCreateSheet } from "@/components/recipes/recipe-create-sheet";
import { RecipeDetailView } from "@/components/recipes/recipe-detail-view";
import { RecipeEditSheet } from "@/components/recipes/recipe-edit-sheet";
import {
  RecipeFilterBar,
  type RecipeTagFilterOption,
} from "@/components/recipes/recipe-filter-bar";
import { RecipeLibraryCard } from "@/components/recipes/recipe-library-card";
import { OfflineUnavailable, ScreenTransition } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks";
import { formatRecipeTag } from "@/lib/recipe-tags";
import { formatLocalDate, getWeekStartSunday } from "@/lib/time-utils";
import type { RecipeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores";

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function matchesSearch(recipe: RecipeSummary, query: string) {
  if (!query) return true;

  const normalizedTitle = normalizeValue(recipe.title);
  const normalizedTags = recipe.tags.map(formatRecipeTag);

  return (
    normalizedTitle.includes(query) ||
    normalizedTags.some((tag) => tag.includes(query))
  );
}

function compareByRecency(left: RecipeSummary, right: RecipeSummary) {
  // updatedAt is a zero-padded ISO timestamp, so a lexicographic compare is
  // chronological; sort descending so most-recently-updated comes first.
  return right.updatedAt.localeCompare(left.updatedAt);
}

function compareByFavorite(left: RecipeSummary, right: RecipeSummary) {
  if (left.favorite === right.favorite) return 0;
  return left.favorite ? -1 : 1;
}

/**
 * Default library browse is ordered by recent activity (spec acceptance
 * criterion). Favorites are only prioritized when searching, matching the
 * spec's "favorites surface higher in pickers and search" rule.
 */
function sortRecipes(recipes: RecipeSummary[], isSearching: boolean) {
  return [...recipes].sort((left, right) => {
    if (isSearching) {
      const byFavorite = compareByFavorite(left, right);
      if (byFavorite !== 0) return byFavorite;

      const byRecency = compareByRecency(left, right);
      if (byRecency !== 0) return byRecency;

      return left.title.localeCompare(right.title);
    }

    const byRecency = compareByRecency(left, right);
    if (byRecency !== 0) return byRecency;

    const byFavorite = compareByFavorite(left, right);
    if (byFavorite !== 0) return byFavorite;

    return left.title.localeCompare(right.title);
  });
}

export function RecipesView() {
  const isMobile = useIsMobile();
  const { data, error, isLoading, isError, refetch, isRefetching } =
    useRecipes();
  const recipeCreationDraft = useAppStore((state) => state.recipeCreationDraft);
  const consumeRecipeCreationDraft = useAppStore(
    (state) => state.consumeRecipeCreationDraft,
  );
  const startMealPlacementFromRecipe = useAppStore(
    (state) => state.startMealPlacementFromRecipe,
  );
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hasOpenedRecipeDraft, setHasOpenedRecipeDraft] = useState(false);
  const selectedRecipe = useRecipe(selectedRecipeId);

  const recipes = data?.data ?? [];
  const searchQuery = normalizeValue(searchValue);
  const selectedRecipeData = selectedRecipe.data?.data ?? null;
  const updateSelectedRecipe = useUpdateRecipe(selectedRecipeId ?? "none");

  const availableTags = useMemo(() => {
    const tagMap = new Map<string, RecipeTagFilterOption>();

    for (const tag of recipes.flatMap((recipe) => recipe.tags)) {
      const normalizedTag = formatRecipeTag(tag);
      if (!normalizedTag) continue;
      tagMap.set(normalizedTag, {
        label: normalizedTag,
        value: normalizedTag,
      });
    }

    return [...tagMap.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const visibleRecipes = recipes.filter((recipe) => {
      const matchesFavorites = !favoritesOnly || recipe.favorite;
      const matchesTag =
        selectedTag === null ||
        recipe.tags.some((tag) => formatRecipeTag(tag) === selectedTag);

      return (
        matchesFavorites && matchesTag && matchesSearch(recipe, searchQuery)
      );
    });

    return sortRecipes(visibleRecipes, searchQuery.length > 0);
  }, [favoritesOnly, recipes, searchQuery, selectedTag]);

  useEffect(() => {
    if (!recipeCreationDraft) {
      setHasOpenedRecipeDraft(false);
      return;
    }

    if (!hasOpenedRecipeDraft) {
      setSelectedRecipeId(null);
      setIsEditSheetOpen(false);
      setIsCreateSheetOpen(true);
      setHasOpenedRecipeDraft(true);
    }
  }, [hasOpenedRecipeDraft, recipeCreationDraft]);

  const createSheetMode = "choices";
  const createSheetDefaultValues = recipeCreationDraft
    ? { title: recipeCreationDraft.typedTitle }
    : undefined;

  return (
    <section className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div
          className={cn(
            "flex items-start gap-3",
            isMobile ? "justify-end" : "justify-between",
          )}
        >
          {/* Title is redundant with the mobile header; desktop keeps it. */}
          {!isMobile && (
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Recipes
              </h1>
              <p className="text-sm text-muted-foreground">
                Save family favorites and discover what to cook next.
              </p>
            </div>
          )}
          {selectedRecipeId === null ? (
            <Button type="button" onClick={() => setIsCreateSheetOpen(true)}>
              Add recipe
            </Button>
          ) : null}
        </div>

        <ScreenTransition
          token={selectedRecipeId ?? "__list__"}
          mode="slide"
          direction={selectedRecipeId ? "forward" : "back"}
        >
          {selectedRecipeId !== null ? (
            selectedRecipeData ? (
              <RecipeDetailView
                recipe={selectedRecipeData}
                isUpdatingFavorite={updateSelectedRecipe.isPending}
                onAddToMeals={() => {
                  startMealPlacementFromRecipe({
                    recipeId: selectedRecipeData.id,
                    requestedAtWeekStartDate: formatLocalDate(
                      getWeekStartSunday(new Date()),
                    ),
                    source: { kind: "recipes-library" },
                  });
                }}
                onBack={() => {
                  setIsEditSheetOpen(false);
                  setSelectedRecipeId(null);
                }}
                onEdit={() => setIsEditSheetOpen(true)}
                onToggleFavorite={() => {
                  updateSelectedRecipe.mutate({
                    favorite: !selectedRecipeData.favorite,
                  });
                }}
              />
            ) : selectedRecipe.isLoading ? (
              <p className="text-sm font-medium text-muted-foreground">
                Loading recipe...
              </p>
            ) : selectedRecipe.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <h2 className="text-base font-semibold text-foreground">
                  Recipe could not be loaded
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedRecipe.error instanceof Error
                    ? selectedRecipe.error.message
                    : "Try again in a moment."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedRecipeId(null)}
                  >
                    Back to recipes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={selectedRecipe.isRefetching}
                    onClick={() => {
                      void selectedRecipe.refetch();
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : null
          ) : isLoading ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Loading recipes...
              </p>
              <div className="grid gap-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={`recipe-loading-${index}`}
                    className="flex flex-row gap-3 overflow-hidden rounded-lg border border-border bg-card p-3 md:flex-col md:gap-0 md:p-0"
                  >
                    <div className="size-24 shrink-0 animate-pulse rounded-lg bg-muted md:size-auto md:aspect-[4/3] md:w-full md:rounded-none" />
                    <div className="flex min-w-0 flex-1 flex-col justify-center space-y-3 md:p-4">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <h2 className="text-base font-semibold text-foreground">
                Recipes could not be loaded
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Try again in a moment."}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  void refetch();
                }}
                disabled={isRefetching}
              >
                Retry
              </Button>
            </div>
          ) : !data ? (
            // Offline + never loaded: paused query, no data and no error.
            <OfflineUnavailable label="recipes" />
          ) : (
            <>
              <RecipeFilterBar
                availableTags={availableTags}
                favoritesOnly={favoritesOnly}
                onFavoritesOnlyChange={setFavoritesOnly}
                onSearchChange={setSearchValue}
                onTagChange={setSelectedTag}
                searchValue={searchValue}
                selectedTag={selectedTag}
              />

              {recipes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
                  <h2 className="text-lg font-semibold text-foreground">
                    No recipes yet
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add your first recipe to get started.
                  </p>
                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={() => setIsCreateSheetOpen(true)}
                    >
                      Add your first recipe
                    </Button>
                  </div>
                </div>
              ) : filteredRecipes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
                  <h2 className="text-lg font-semibold text-foreground">
                    No recipes match those filters
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try a different search or clear a filter chip.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredRecipes.map((recipe) => (
                    <div key={recipe.id} className={cn("min-w-0")}>
                      <RecipeLibraryCard
                        recipe={recipe}
                        onSelect={(recipeId) => setSelectedRecipeId(recipeId)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </ScreenTransition>

        <RecipeCreateSheet
          defaultMode={createSheetMode}
          defaultValues={createSheetDefaultValues}
          isOpen={isCreateSheetOpen}
          onCancel={
            recipeCreationDraft
              ? () => {
                  consumeRecipeCreationDraft();
                  setIsCreateSheetOpen(false);
                  setHasOpenedRecipeDraft(false);
                }
              : undefined
          }
          onOpenChange={setIsCreateSheetOpen}
          onCreated={(recipeId) => {
            if (!recipeCreationDraft) {
              setSelectedRecipeId(recipeId);
              return;
            }

            const consumedDraft = consumeRecipeCreationDraft();
            if (!consumedDraft) {
              setSelectedRecipeId(recipeId);
              return;
            }

            startMealPlacementFromRecipe({
              recipeId,
              requestedAtWeekStartDate: consumedDraft.requestedAtWeekStartDate,
              source: {
                kind: "meals-slot",
                dayIndex: consumedDraft.dayIndex,
                mealType: consumedDraft.mealType,
              },
            });
          }}
        />
        {selectedRecipeData ? (
          <RecipeEditSheet
            recipe={selectedRecipeData}
            isOpen={isEditSheetOpen}
            onOpenChange={setIsEditSheetOpen}
          />
        ) : null}
      </div>
    </section>
  );
}
