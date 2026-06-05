import { useUpdateRecipe } from "@/api";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import type { RecipeDetail, UpdateRecipeRequest } from "@/lib/types";
import { RecipeForm, toRecipeRequest } from "./recipe-form";

interface RecipeEditSheetProps {
  recipe: RecipeDetail;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function toUpdateRequest(recipe: RecipeDetail, request: UpdateRecipeRequest) {
  return {
    title: request.title,
    imageUrl: recipe.imageUrl,
    ingredients: request.ingredients,
    instructions: request.instructions,
    note: recipe.note,
    sourceUrl: recipe.sourceUrl,
    tags: request.tags,
    favorite: recipe.favorite,
  };
}

export function RecipeEditSheet({
  recipe,
  isOpen,
  onOpenChange,
}: RecipeEditSheetProps) {
  const updateRecipe = useUpdateRecipe(recipe.id);
  const errorMessage =
    updateRecipe.error instanceof Error
      ? updateRecipe.error.message
      : "Could not save recipe";

  return (
    <MobileSheet
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
      title="Edit Recipe"
    >
      <RecipeForm
        key={recipe.id}
        defaultValues={{
          title: recipe.title,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          tags: recipe.tags,
          favorite: recipe.favorite,
        }}
        isPending={updateRecipe.isPending}
        errorMessage={updateRecipe.isError ? errorMessage : null}
        onSubmit={(values) => {
          updateRecipe.mutate(
            toUpdateRequest(recipe, toRecipeRequest(values)),
            {
              onSuccess: () => onOpenChange(false),
            },
          );
        }}
      />
    </MobileSheet>
  );
}
