import type {
  ChoreAssigneeGroup as ChoreAssigneeGroupData,
  ChoreBoardItem,
} from "@/lib/types";
import { colorMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChoreRow } from "./chore-row";

interface ChoreAssigneeGroupProps {
  group: ChoreAssigneeGroupData;
  onArchive?: (chore: ChoreBoardItem) => void;
  onComplete?: (chore: ChoreBoardItem) => void;
  onUncomplete?: (chore: ChoreBoardItem) => void;
}

export function ChoreAssigneeGroup({
  group,
  onArchive,
  onComplete,
  onUncomplete,
}: ChoreAssigneeGroupProps) {
  const colors = colorMap[group.member.color];
  const progressPercent =
    group.summary.total === 0
      ? 0
      : Math.round((group.summary.completed / group.summary.total) * 100);

  return (
    <section aria-labelledby={`assignee-${group.member.id}`}>
      <header className="mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
              colors.bg,
            )}
          >
            {group.member.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id={`assignee-${group.member.id}`}
              className="truncate text-base font-semibold text-foreground"
            >
              {group.member.name}
            </h3>
            <p className="text-xs font-medium text-muted-foreground">
              {group.summary.remaining} left, {group.summary.completed} done
            </p>
          </div>
        </div>
        <div
          role="progressbar"
          aria-label={`${group.member.name} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn("h-full rounded-full transition-all", colors.bg)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      <div className="space-y-2">
        {group.chores.map((chore) => (
          <ChoreRow
            key={chore.templateId}
            chore={chore}
            onArchive={() => onArchive?.(chore)}
            onComplete={() => onComplete?.(chore)}
            onUncomplete={() => onUncomplete?.(chore)}
          />
        ))}
      </div>
    </section>
  );
}
