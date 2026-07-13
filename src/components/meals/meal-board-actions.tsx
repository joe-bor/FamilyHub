import { Button } from "@/components/ui/button";

interface MealBoardActionsProps {
  canAddIngredients: boolean;
  onAddIngredients: () => void;
  onFillEmptySlots: () => void;
}

export function MealBoardActions({
  canAddIngredients,
  onAddIngredients,
  onFillEmptySlots,
}: MealBoardActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {canAddIngredients ? (
        <Button type="button" variant="outline" onClick={onAddIngredients}>
          Add ingredients
        </Button>
      ) : null}
      <Button type="button" variant="outline" onClick={onFillEmptySlots}>
        Fill empty slots
      </Button>
    </div>
  );
}
