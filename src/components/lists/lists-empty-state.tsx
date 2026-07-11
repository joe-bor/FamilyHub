import { Plus } from "lucide-react";
import { Button } from "../ui/button";

interface ListsEmptyStateProps {
  onCreate: () => void;
}

export function ListsEmptyState({ onCreate }: ListsEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">No lists yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-muted-foreground">
        Create the first shared family list for groceries, errands, or anything
        else worth keeping together.
      </p>
      <Button type="button" className="mt-4" onClick={onCreate}>
        <Plus className="h-4 w-4" />
        Create first list
      </Button>
    </div>
  );
}
