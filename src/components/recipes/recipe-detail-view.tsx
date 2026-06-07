import { ArrowLeft, Heart, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatRecipeTag } from "@/lib/recipe-tags";
import type { RecipeDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

interface RecipeDetailViewProps {
  recipe: RecipeDetail;
  isUpdatingFavorite?: boolean;
  onBack: () => void;
  onAddToMeals?: () => void;
  onEdit?: () => void;
  onToggleFavorite?: () => void;
}

export function RecipeDetailView({
  recipe,
  isUpdatingFavorite = false,
  onBack,
  onAddToMeals,
  onEdit,
  onToggleFavorite,
}: RecipeDetailViewProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="space-y-5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">
                No photo
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">
            {recipe.title}
          </h2>
          {recipe.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag, index) => (
                <span
                  key={`${index}-${tag}`}
                  className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {formatRecipeTag(tag)}
                </span>
              ))}
            </div>
          ) : null}
          {recipe.sourceUrl ? (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              View source
            </a>
          ) : null}
        </div>

        {recipe.ingredients.length > 0 ? (
          <DetailSection title="Ingredients">
            <ul className="space-y-2 text-sm text-foreground">
              {recipe.ingredients.map((ingredient, index) => (
                <li
                  key={`${index}-${ingredient}`}
                  className="list-inside list-disc"
                >
                  {ingredient}
                </li>
              ))}
            </ul>
          </DetailSection>
        ) : null}

        {recipe.instructions.length > 0 ? (
          <DetailSection title="Instructions">
            <ol className="space-y-2 text-sm text-foreground">
              {recipe.instructions.map((instruction, index) => (
                <li
                  key={`${index}-${instruction}`}
                  className="list-inside list-decimal"
                >
                  {instruction}
                </li>
              ))}
            </ol>
          </DetailSection>
        ) : null}

        {recipe.note ? (
          <p className="text-sm text-muted-foreground">{recipe.note}</p>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back to recipes
          </Button>
          {onEdit ? (
            <Button type="button" variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit recipe
            </Button>
          ) : null}
          {onAddToMeals ? (
            <Button type="button" variant="outline" onClick={onAddToMeals}>
              Add to Meals
            </Button>
          ) : null}
          {onToggleFavorite ? (
            <Button
              type="button"
              variant={recipe.favorite ? "secondary" : "outline"}
              aria-label={`Favorite recipe: ${recipe.title}`}
              aria-pressed={recipe.favorite}
              disabled={isUpdatingFavorite}
              onClick={onToggleFavorite}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  recipe.favorite
                    ? "fill-rose-500 text-rose-500"
                    : "text-current",
                )}
              />
              {recipe.favorite ? "Favorited" : "Favorite"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
