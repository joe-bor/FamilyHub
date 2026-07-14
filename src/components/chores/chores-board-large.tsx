import type { ChoreBoardItem, ChoreScopeBoard } from "@/lib/types";
import { ChoreScopeColumn } from "./chores-scope-column";

interface ChoresBoardLargeProps {
  today: ChoreScopeBoard;
  thisWeek: ChoreScopeBoard;
  thisMonth: ChoreScopeBoard;
  onArchive?: (scope: ChoreScopeBoard, chore: ChoreBoardItem) => void;
  onComplete?: (scope: ChoreScopeBoard, chore: ChoreBoardItem) => void;
  onUncomplete?: (scope: ChoreScopeBoard, chore: ChoreBoardItem) => void;
}

export function ChoresBoardLarge({
  today,
  thisWeek,
  thisMonth,
  onArchive,
  onComplete,
  onUncomplete,
}: ChoresBoardLargeProps) {
  const shared = {
    fillHeight: true as const,
    showHeading: true as const,
    onArchive,
    onComplete,
    onUncomplete,
  };

  return (
    // At lg+, fill the viewport with internally scrolling columns and give Today
    // extra weight; below lg stays in ChoresView, while min-w-0 contains long titles.
    <div className="flex min-h-0 flex-1 gap-4">
      <ChoreScopeColumn
        {...shared}
        scope={today}
        emphasis
        className="min-w-0 flex-[1.4]"
      />
      <ChoreScopeColumn
        {...shared}
        scope={thisWeek}
        className="min-w-0 flex-1"
      />
      <ChoreScopeColumn
        {...shared}
        scope={thisMonth}
        className="min-w-0 flex-1"
      />
    </div>
  );
}
