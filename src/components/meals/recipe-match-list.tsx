import { Heart } from "lucide-react";
import type { RecipeSummary } from "@/lib/types";

interface RecipeMatchListProps {
  title: string;
  recipes: RecipeSummary[];
  onSelectRecipe: (recipe: RecipeSummary) => void;
}

export function RecipeMatchList({
  title,
  recipes,
  onSelectRecipe,
}: RecipeMatchListProps) {
  if (recipes.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-2">
        {recipes.map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
            aria-label={`Select recipe: ${recipe.title}`}
            onClick={() => onSelectRecipe(recipe)}
          >
            {recipe.imageUrl ? (
              <img
                src={recipe.imageUrl}
                alt=""
                className="h-12 w-12 rounded-md object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-md bg-muted" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
              {recipe.title}
            </span>
            {recipe.favorite ? (
              <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
