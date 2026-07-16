import { Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface RecipeTagFilterOption {
  label: string;
  value: string;
}

interface RecipeFilterBarProps {
  availableTags: RecipeTagFilterOption[];
  className?: string;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (favoritesOnly: boolean) => void;
  onSearchChange: (value: string) => void;
  onTagChange: (tag: string | null) => void;
  searchValue: string;
  selectedTag: string | null;
}

export function RecipeFilterBar({
  availableTags,
  className,
  favoritesOnly,
  onFavoritesOnlyChange,
  onSearchChange,
  onTagChange,
  searchValue,
  selectedTag,
}: RecipeFilterBarProps) {
  return (
    <div
      data-testid="recipe-filter-bar"
      className={cn(
        "space-y-3 lg:flex lg:min-w-0 lg:flex-1 lg:items-center lg:gap-3 lg:space-y-0",
        className,
      )}
    >
      <div className="relative lg:w-64 lg:shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search recipes"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search titles or tags"
          className="pl-9 lg:h-11"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:min-w-0 lg:flex-1 lg:pb-0 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
        <Button
          type="button"
          variant={favoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
          className="shrink-0 lg:min-h-11"
        >
          <Heart className={cn("h-4 w-4", favoritesOnly && "fill-current")} />
          Favorites only
        </Button>

        <Button
          type="button"
          variant={selectedTag === null ? "secondary" : "outline"}
          size="sm"
          onClick={() => onTagChange(null)}
          className="shrink-0 lg:min-h-11"
        >
          All
        </Button>

        {availableTags.map((tag) => (
          <Button
            key={tag.value}
            type="button"
            variant={selectedTag === tag.value ? "secondary" : "outline"}
            size="sm"
            onClick={() =>
              onTagChange(selectedTag === tag.value ? null : tag.value)
            }
            className="shrink-0 lg:min-h-11"
          >
            {tag.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
