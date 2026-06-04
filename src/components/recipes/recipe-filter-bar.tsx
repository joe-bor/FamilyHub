import { Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface RecipeFilterBarProps {
  availableTags: string[];
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (favoritesOnly: boolean) => void;
  onSearchChange: (value: string) => void;
  onTagChange: (tag: string | null) => void;
  searchValue: string;
  selectedTag: string | null;
}

export function RecipeFilterBar({
  availableTags,
  favoritesOnly,
  onFavoritesOnlyChange,
  onSearchChange,
  onTagChange,
  searchValue,
  selectedTag,
}: RecipeFilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search recipes"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search titles or tags"
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Button
          type="button"
          variant={favoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
          className="shrink-0"
        >
          <Heart className={cn("h-4 w-4", favoritesOnly && "fill-current")} />
          Favorites only
        </Button>

        <Button
          type="button"
          variant={selectedTag === null ? "secondary" : "outline"}
          size="sm"
          onClick={() => onTagChange(null)}
          className="shrink-0"
        >
          All
        </Button>

        {availableTags.map((tag) => (
          <Button
            key={tag}
            type="button"
            variant={selectedTag === tag ? "secondary" : "outline"}
            size="sm"
            onClick={() => onTagChange(selectedTag === tag ? null : tag)}
            className="shrink-0"
          >
            {tag}
          </Button>
        ))}
      </div>
    </div>
  );
}
