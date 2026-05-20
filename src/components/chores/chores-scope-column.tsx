import type { ChoreBoardItem, ChoreScopeBoard } from "@/lib/types";
import { ChoreAssigneeGroup } from "./chore-assignee-group";

interface ChoreScopeColumnProps {
  scope: ChoreScopeBoard;
  onArchive?: (scope: ChoreScopeBoard, chore: ChoreBoardItem) => void;
  onComplete?: (scope: ChoreScopeBoard, chore: ChoreBoardItem) => void;
  onUncomplete?: (scope: ChoreScopeBoard, chore: ChoreBoardItem) => void;
}

function scopeHeading(scope: ChoreScopeBoard["scope"]): string {
  if (scope === "TODAY") return "Today";
  if (scope === "THIS_WEEK") return "This Week";
  return "This Month";
}

export function ChoreScopeColumn({
  scope,
  onArchive,
  onComplete,
  onUncomplete,
}: ChoreScopeColumnProps) {
  const heading = scopeHeading(scope.scope);
  const isFullyComplete =
    scope.summary.total > 0 && scope.summary.remaining === 0;

  return (
    <section
      aria-labelledby={`${scope.scope}-heading`}
      className="rounded-lg border bg-card p-4 shadow-sm"
    >
      <header className="mb-4">
        <h2
          id={`${scope.scope}-heading`}
          className="text-lg font-semibold text-foreground"
        >
          {heading}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {scope.summary.remaining} left of {scope.summary.total}
        </p>
      </header>

      {scope.summary.total === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No routines in this timeframe
        </p>
      ) : (
        <div className="space-y-5">
          {isFullyComplete && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
              All caught up
            </p>
          )}
          {scope.assignees.map((group) => (
            <ChoreAssigneeGroup
              key={group.member.id}
              group={group}
              onArchive={(chore) => onArchive?.(scope, chore)}
              onComplete={(chore) => onComplete?.(scope, chore)}
              onUncomplete={(chore) => onUncomplete?.(scope, chore)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
