import { Archive, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChoreBoardItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChoreRowProps {
  chore: ChoreBoardItem;
  onArchive?: () => void;
  onComplete?: () => void;
  onUncomplete?: () => void;
}

function cadenceLabel(cadence: ChoreBoardItem["cadence"]): string {
  if (cadence === "DAILY") return "Daily";
  if (cadence === "WEEKLY") return "Weekly";
  return "Monthly";
}

export function ChoreRow({
  chore,
  onArchive,
  onComplete,
  onUncomplete,
}: ChoreRowProps) {
  return (
    <div
      data-testid={`chore-row-${chore.templateId}`}
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
        onClick={chore.completed ? onUncomplete : onComplete}
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
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          {cadenceLabel(chore.cadence)}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Archive ${chore.title}`}
        onClick={onArchive}
        className="text-muted-foreground hover:text-foreground"
      >
        <Archive className="h-4 w-4" />
      </Button>
    </div>
  );
}

export type { ChoreRowProps };
