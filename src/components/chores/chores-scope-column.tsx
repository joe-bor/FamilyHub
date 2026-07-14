import type { ChoreBoardItem, ChoreScopeBoard } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChoreAssigneeGroup } from "./chore-assignee-group";

interface ChoreScopeColumnProps {
  scope: ChoreScopeBoard;
  showHeading?: boolean;
  /** Fill the parent height and scroll the chore groups within the section. */
  fillHeight?: boolean;
  /** Apply a subtle primary treatment and larger heading. */
  emphasis?: boolean;
  /** Additional classes for sizing or positioning the section. */
  className?: string;
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
  showHeading = true,
  fillHeight = false,
  emphasis = false,
  className,
  onArchive,
  onComplete,
  onUncomplete,
}: ChoreScopeColumnProps) {
  const heading = scopeHeading(scope.scope);
  const summary = `${scope.summary.remaining} left of ${scope.summary.total}`;
  const isFullyComplete =
    scope.summary.total > 0 && scope.summary.remaining === 0;

  const headerContent = showHeading ? (
    <header className={cn(!fillHeight && "mb-4")}>
      <h2
        id={`${scope.scope}-heading`}
        className={cn(
          "font-semibold text-foreground",
          emphasis ? "text-xl" : "text-lg",
        )}
      >
        {heading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
    </header>
  ) : (
    <p className={cn(!fillHeight && "mb-4", "text-sm text-muted-foreground")}>
      {summary}
    </p>
  );

  const bodyContent =
    scope.summary.total === 0 ? (
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
    );

  return (
    <section
      aria-label={showHeading ? undefined : heading}
      aria-labelledby={showHeading ? `${scope.scope}-heading` : undefined}
      className={cn(
        "rounded-lg border bg-card",
        emphasis && "border-primary/30 bg-primary/5",
        fillHeight ? "flex min-h-0 flex-col" : "p-4",
        "shadow-sm",
        className,
      )}
      data-emphasis={emphasis || undefined}
    >
      {fillHeight ? (
        <>
          <div className="shrink-0 p-4 pb-3">{headerContent}</div>
          <div
            className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
            data-slot="scope-body"
          >
            {bodyContent}
          </div>
        </>
      ) : (
        <>
          {headerContent}
          {bodyContent}
        </>
      )}
    </section>
  );
}
