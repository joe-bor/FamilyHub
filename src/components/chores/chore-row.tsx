import { format } from "date-fns";
import { Check, Circle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseLocalDate } from "@/lib/time-utils";
import type { Chore } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChoreRowProps {
  chore: Chore;
  today: string;
  onToggleComplete: () => void;
  onDelete: () => void;
}

function getDueLabel(chore: Chore, today: string): string | null {
  if (!chore.dueDate) return null;

  if (chore.dueDate < today) return "Overdue";
  if (chore.dueDate === today) return "Due today";

  return `Due ${format(parseLocalDate(chore.dueDate), "MMM d")}`;
}

function getDueClass(chore: Chore, today: string): string {
  if (chore.completed || !chore.dueDate) return "text-muted-foreground";
  if (chore.dueDate < today) return "text-destructive";
  if (chore.dueDate === today) return "text-primary";
  return "text-muted-foreground";
}

export function ChoreRow({
  chore,
  today,
  onToggleComplete,
  onDelete,
}: ChoreRowProps) {
  const dueLabel = getDueLabel(chore, today);

  return (
    <div
      data-testid={`chore-row-${chore.id}`}
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-lg border p-3 transition-colors",
        chore.completed
          ? "border-border bg-muted/40"
          : "border-transparent bg-card hover:border-border",
      )}
    >
      <button
        type="button"
        aria-label={
          chore.completed
            ? `Mark ${chore.title} incomplete`
            : `Mark ${chore.title} complete`
        }
        onClick={onToggleComplete}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          chore.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary",
        )}
      >
        {chore.completed ? (
          <Check className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-semibold text-foreground",
            chore.completed && "text-muted-foreground line-through",
          )}
        >
          {chore.title}
        </p>
        {dueLabel && (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              getDueClass(chore, today),
            )}
          >
            {dueLabel}
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${chore.title}`}
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export type { ChoreRowProps };
