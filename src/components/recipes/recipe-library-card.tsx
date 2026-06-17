import { Heart } from "lucide-react";
import { useState } from "react";
import { usePressable } from "@/hooks";
import { formatRecipeTag } from "@/lib/recipe-tags";
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
  const pressable = usePressable();
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <article
      aria-label={`Recipe card: ${recipe.title}`}
      onPointerDown={pressable.onPointerDown}
      className={cn(
        "relative flex w-full flex-row gap-3 overflow-hidden rounded-lg border border-border bg-card p-3 text-left shadow-xs transition-colors md:flex-col md:gap-0 md:p-0",
        pressable.className,
      )}
    >
      <button
        type="button"
        aria-label={`Open recipe: ${recipe.title}`}
        className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => onSelect?.(recipe.id)}
      />
      <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted md:size-auto md:aspect-[4/3] md:w-full md:rounded-none">
        {recipe.imageUrl && !imgFailed ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground md:text-sm">
              No photo
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:gap-3 md:p-4">
        <div className="flex min-w-0 items-start justify-between gap-2 md:gap-3">
          <h2 className="line-clamp-2 min-w-0 text-base leading-6 font-semibold text-foreground md:line-clamp-none">
            {recipe.title}
          </h2>
          <div className="shrink-0 rounded-full p-1 md:absolute md:right-3 md:top-3 md:bg-background/90 md:p-2 md:shadow-sm">
            <Heart
              aria-hidden={!recipe.favorite}
              aria-label={
                recipe.favorite ? `${recipe.title} is a favorite` : undefined
              }
              className={cn(
                "h-4 w-4",
                recipe.favorite
                  ? "fill-rose-500 text-rose-500"
                  : "fill-transparent text-muted-foreground",
              )}
            />
          </div>
        </div>

        <div className="flex gap-1.5 overflow-hidden md:flex-wrap md:gap-2 md:overflow-visible">
          {recipe.tags.map((tag, index) => (
            <span
              key={`${index}-${tag}`}
              className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              {formatRecipeTag(tag)}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
