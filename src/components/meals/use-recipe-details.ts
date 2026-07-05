import { useQueries } from "@tanstack/react-query";
import { ApiException } from "@/api/client";
import { recipesKeys } from "@/api/hooks/use-recipes";
import { recipesService } from "@/api/services";
import type { RecipeResolution } from "./meal-ingredient-extraction";

/**
 * Resolve `RecipeDetail` for a variable number of recipe ids with a single
 * hook call. Using `useQueries` (rather than mapping `useRecipe` over the ids)
 * keeps the Rules of Hooks intact when the id set changes between renders.
 *
 * Each id maps to a {@link RecipeResolution} the review model understands:
 *   - loaded  → detail available
 *   - missing → 404 (deleted recipe) → honest "no recipe ingredients"
 *   - error   → any other failure → retryable per-meal error row
 */
export function useRecipeDetails(recipeIds: string[]): {
  resolutionsById: Record<string, RecipeResolution>;
  isLoading: boolean;
} {
  const results = useQueries({
    queries: recipeIds.map((id) => ({
      queryKey: recipesKeys.detail(id),
      queryFn: () => recipesService.getRecipe(id),
    })),
  });

  const resolutionsById: Record<string, RecipeResolution> = {};
  let isLoading = false;
  results.forEach((result, index) => {
    const id = recipeIds[index];
    if (result.isPending) {
      isLoading = true;
    } else if (result.isSuccess) {
      resolutionsById[id] = { status: "loaded", detail: result.data.data };
    } else if (
      result.error instanceof ApiException &&
      result.error.status === 404
    ) {
      resolutionsById[id] = { status: "missing" };
    } else {
      resolutionsById[id] = { status: "error" };
    }
  });

  return { resolutionsById, isLoading };
}
