import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks";
import {
  addWeeksLocal,
  formatLocalDate,
  parseLocalDate,
} from "@/lib/time-utils";
import { cn } from "@/lib/utils";

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatWeekRange(weekStartDate: string) {
  const start = parseLocalDate(weekStartDate);
  const end = addWeeksLocal(start, 1);
  end.setDate(end.getDate() - 1);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

interface WeekHeaderProps {
  weekStartDate: string;
  readOnly: boolean;
  onWeekChange: (weekStartDate: string) => void;
  actions?: ReactNode;
}

export function WeekHeader({
  weekStartDate,
  readOnly,
  onWeekChange,
  actions,
}: WeekHeaderProps) {
  const isMobile = useIsMobile();
  const currentStart = parseLocalDate(weekStartDate);

  return (
    <div
      data-slot="week-header"
      className={cn(
        "flex justify-between gap-3",
        actions ? "items-center" : "items-start",
      )}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Title is redundant with the mobile module-aware header; desktop keeps it. */}
          {!isMobile && (
            <h1 className="text-2xl font-semibold text-foreground">Meals</h1>
          )}
          {readOnly ? (
            <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
              Review only
            </span>
          ) : null}
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {formatWeekRange(weekStartDate)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous week"
            onClick={() =>
              onWeekChange(formatLocalDate(addWeeksLocal(currentStart, -1)))
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next week"
            onClick={() =>
              onWeekChange(formatLocalDate(addWeeksLocal(currentStart, 1)))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
