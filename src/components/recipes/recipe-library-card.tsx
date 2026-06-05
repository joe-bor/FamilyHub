import { Heart } from "lucide-react";
import type { RecipeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RecipeLibraryCardProps {
  recipe: RecipeSummary;
  onSelect?: (recipeId: string) => void;
}

export function RecipeLibraryCard({
  recipe,
  onSelect,
}: RecipeLibraryCardProps) {
  return (
    <article
      aria-label={`Recipe card: ${recipe.title}`}
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-lg border border-border bg-card text-left shadow-xs transition-colors",
      )}
    >
      <button
        type="button"
        aria-label={`Open recipe: ${recipe.title}`}
        className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => onSelect?.(recipe.id)}
      />
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
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
        <div className="absolute right-3 top-3 rounded-full bg-background/90 p-2 shadow-sm">
          <Heart
            aria-label={`Favorite recipe: ${recipe.title}`}
            className={cn(
              "h-4 w-4",
              recipe.favorite
                ? "fill-rose-500 text-rose-500"
                : "fill-transparent text-muted-foreground",
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base leading-6 font-semibold text-foreground">
            {recipe.title}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
