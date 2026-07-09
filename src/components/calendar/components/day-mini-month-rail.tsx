import { format } from "date-fns";
import { DAY_INITIALS } from "@/lib/time-utils";
import { type CalendarEvent, colorMap, type FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  buildMonthMatrix,
  RAIL_WIDTH,
  selectMonthDayDots,
} from "../utils/day-rail";

interface DayMiniMonthRailProps {
  currentDate: Date;
  monthEvents: CalendarEvent[];
  members: FamilyMember[];
  onSelectDate: (date: Date) => void;
}

export function DayMiniMonthRail({
  currentDate,
  monthEvents,
  members,
  onSelectDate,
}: DayMiniMonthRailProps) {
  const today = new Date();
  const matrix = buildMonthMatrix(currentDate);
  const dots = selectMonthDayDots(monthEvents, members);
  const monthLabel = format(currentDate, "MMMM yyyy");

  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const isCurrentMonth = (date: Date) =>
    date.getMonth() === currentDate.getMonth();

  return (
    <aside
      aria-label="Month navigator"
      className="shrink-0 border-l border-border bg-card px-3 py-4"
      style={{ width: RAIL_WIDTH }}
    >
      <p className="mb-3 px-1 text-sm font-semibold text-foreground">
        {monthLabel}
      </p>
      <div className="grid grid-cols-7 gap-y-1">
        {DAY_INITIALS.map((initial, i) => (
          <div
            key={`h-${i}`}
            className="pb-1 text-center text-[10px] font-medium text-muted-foreground"
          >
            {initial}
          </div>
        ))}
        {matrix.map((date) => {
          const dayDots = dots.get(date.toDateString()) ?? [];
          const selected = isSameDay(date, currentDate);
          const dayIsToday = isSameDay(date, today);

          return (
            <button
              type="button"
              key={date.toDateString()}
              aria-current={selected ? "date" : undefined}
              aria-pressed={selected}
              aria-label={format(date, "MMMM d, yyyy")}
              onClick={() => onSelectDate(date)}
              className={cn(
                "relative mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full text-sm transition-colors",
                !isCurrentMonth(date) && "text-muted-foreground/40",
                dayIsToday && !selected && "ring-2 ring-primary ring-inset",
                selected
                  ? "bg-primary font-bold text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              <span className="tabular-nums">{date.getDate()}</span>
              <span className="absolute bottom-1 flex gap-0.5">
                {dayDots.slice(0, 4).map((color, i) => (
                  <span
                    key={`${color}-${i}`}
                    className={cn(
                      "h-1 w-1 rounded-full",
                      selected
                        ? "bg-primary-foreground/80"
                        : colorMap[color]?.bg,
                    )}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
