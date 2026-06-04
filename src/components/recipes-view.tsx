import { useMemo, useState } from "react";
import { useRecipe, useRecipes } from "@/api";
import { RecipeCreateSheet } from "@/components/recipes/recipe-create-sheet";
import {
  RecipeFilterBar,
  type RecipeTagFilterOption,
} from "@/components/recipes/recipe-filter-bar";
import { RecipeLibraryCard } from "@/components/recipes/recipe-library-card";
import { Button } from "@/components/ui/button";
import type { RecipeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function displayTag(value: string) {
  return normalizeValue(value);
}

function matchesSearch(recipe: RecipeSummary, query: string) {
  if (!query) return true;

  const normalizedTitle = normalizeValue(recipe.title);
  const normalizedTags = recipe.tags.map(normalizeValue);

  return (
    normalizedTitle.includes(query) ||
    normalizedTags.some((tag) => tag.includes(query))
  );
}

function sortRecipes(recipes: RecipeSummary[], favoritesOnly: boolean) {
  return [...recipes].sort((left, right) => {
    if (!favoritesOnly && left.favorite !== right.favorite) {
      return left.favorite ? -1 : 1;
    }

    return left.title.localeCompare(right.title);
  });
}

export function RecipesView() {
  const { data, error, isLoading, isError, refetch, isRefetching } =
    useRecipes();
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const selectedRecipe = useRecipe(selectedRecipeId);

  const recipes = data?.data ?? [];
  const searchQuery = normalizeValue(searchValue);
  const selectedRecipeData = selectedRecipe.data?.data ?? null;

  const availableTags = useMemo(() => {
    const tagMap = new Map<string, RecipeTagFilterOption>();

    for (const tag of recipes.flatMap((recipe) => recipe.tags)) {
      const normalizedTag = normalizeValue(tag);
      if (!normalizedTag) continue;
      tagMap.set(normalizedTag, {
        label: displayTag(tag),
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
        recipe.tags.some((tag) => normalizeValue(tag) === selectedTag);

      return (
        matchesFavorites && matchesTag && matchesSearch(recipe, searchQuery)
      );
    });

    return sortRecipes(visibleRecipes, favoritesOnly);
  }, [favoritesOnly, recipes, searchQuery, selectedTag]);

  return (
    <section className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Recipes</h1>
            <p className="text-sm text-muted-foreground">
              Save family favorites and discover what to cook next.
            </p>
          </div>
          {selectedRecipeId === null ? (
            <Button type="button" onClick={() => setIsCreateSheetOpen(true)}>
              Add recipe
            </Button>
          ) : null}
        </div>

        {selectedRecipeId !== null ? (
          selectedRecipeData ? (
            <div className="space-y-4 rounded-lg border border-border bg-card p-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedRecipeId(null)}
              >
                Back to recipes
              </Button>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground">
                  {selectedRecipeData.title}
                </h2>
                {selectedRecipeData.sourceUrl ? (
                  <p className="text-sm text-muted-foreground">
                    {selectedRecipeData.sourceUrl}
                  </p>
                ) : null}
              </div>
            </div>
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
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="aspect-[4/3] animate-pulse bg-muted" />
                  <div className="space-y-3 p-4">
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
        ) : !isLoading && !isError ? (
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
                    <RecipeLibraryCard recipe={recipe} />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}

        <RecipeCreateSheet
          isOpen={isCreateSheetOpen}
          onOpenChange={setIsCreateSheetOpen}
          onCreated={setSelectedRecipeId}
        />
      </div>
    </section>
  );
}
