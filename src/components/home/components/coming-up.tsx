import { format } from "date-fns";
import { memo, useMemo } from "react";
import { formatLocalDate } from "@/lib/time-utils";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import { colorMap, getFamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatEventTimeForDisplay, getEventDateTime } from "../lib/event-time";

function sortByStartDateTime(
  left: CalendarEvent,
  right: CalendarEvent,
): number {
  return (
    getEventDateTime(left, "start").getTime() -
    getEventDateTime(right, "start").getTime()
  );
}

function getDateLabel(eventDate: Date, currentDate: Date): string {
  const tomorrow = new Date(currentDate);
  tomorrow.setDate(currentDate.getDate() + 1);

  return formatLocalDate(eventDate) === formatLocalDate(tomorrow)
    ? "Tomorrow"
    : format(eventDate, "EEE");
}

export const ComingUp = memo(function ComingUp({
  currentDate = new Date(),
  events,
  members,
  onSelect,
}: {
  currentDate?: Date;
  events: CalendarEvent[];
  members: FamilyMember[];
  onSelect: (event: CalendarEvent) => void;
}) {
  const visibleEvents = useMemo(
    () => [...events].sort(sortByStartDateTime).slice(0, 3),
    [events],
  );

  if (visibleEvents.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-3 border-t border-border/60 pt-4">
        <h3 className="text-sm text-foreground/60">Coming up</h3>
      </div>

      <div className="space-y-3">
        {visibleEvents.map((event) => {
          const member = getFamilyMember(members, event.memberId);
          const colors = member ? colorMap[member.color] : colorMap.coral;

          return (
            <button
              key={event.id ?? `${event.title}-${formatLocalDate(event.date)}`}
              type="button"
              onClick={() => onSelect(event)}
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-1 py-2 text-left text-sm text-foreground/70 transition-transform duration-[150ms] ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] motion-reduce:transition-none"
            >
              <span className="w-18 shrink-0 text-foreground/60">
                {getDateLabel(event.date, currentDate)}
              </span>
              <span className="shrink-0">
                {formatEventTimeForDisplay(event.startTime)}
              </span>
              <span className="min-w-0 flex-1 truncate">{event.title}</span>
              <span
                aria-hidden="true"
                className={cn("h-2.5 w-2.5 shrink-0 rounded-full", colors.bg)}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
});
