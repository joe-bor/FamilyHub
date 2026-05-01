import { format } from "date-fns";
import { memo, useMemo } from "react";
import { formatLocalDate, getEventKey } from "@/lib/time-utils";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import { colorMap, getFamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatEventTimeForDisplay, getEventDateTime } from "../lib/event-time";

function getSpanAffix(event: CalendarEvent, currentDate: Date): string | null {
  if (!event.endDate) return null;

  const current = formatLocalDate(currentDate);
  const start = formatLocalDate(event.date);
  const end = formatLocalDate(event.endDate);

  if (start === end) return null;
  if (current === start) return `→ ends ${format(event.endDate, "EEE")}`;
  if (current === end) return `from ${format(event.date, "EEE")} →`;
  return `${format(event.date, "EEE")} → ${format(event.endDate, "EEE")}`;
}

function sortTodayEvents(left: CalendarEvent, right: CalendarEvent): number {
  if (left.isAllDay && !right.isAllDay) return -1;
  if (!left.isAllDay && right.isAllDay) return 1;

  return (
    getEventDateTime(left, "start").getTime() -
    getEventDateTime(right, "start").getTime()
  );
}

export const TodayList = memo(function TodayList({
  currentDate = new Date(),
  events,
  members,
  excludeKey,
  onSelect,
}: {
  currentDate?: Date;
  events: CalendarEvent[];
  members: FamilyMember[];
  excludeKey?: string | null;
  onSelect: (event: CalendarEvent) => void;
}) {
  const visibleEvents = useMemo(
    () =>
      events
        .filter((event) => getEventKey(event) !== excludeKey)
        .sort(sortTodayEvents),
    [events, excludeKey],
  );

  if (visibleEvents.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pt-4">
      <div className="space-y-2">
        {visibleEvents.map((event) => {
          const member = getFamilyMember(members, event.memberId);
          const colors = member ? colorMap[member.color] : colorMap.coral;
          const affix = getSpanAffix(event, currentDate);

          return (
            <button
              key={getEventKey(event)}
              type="button"
              onClick={() => onSelect(event)}
              className="flex min-h-12 w-full items-start gap-3 rounded-xl px-1 py-2.5 text-left transition-transform duration-[150ms] ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] motion-reduce:transition-none"
            >
              <div className="pt-1.5">
                <span
                  aria-hidden="true"
                  className={cn("block h-2.5 w-2.5 rounded-full", colors.bg)}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {!event.isAllDay && (
                    <span className="shrink-0 text-[15px] leading-5 text-foreground/65">
                      {formatEventTimeForDisplay(event.startTime)}
                    </span>
                  )}
                  <span className="truncate text-[17px] leading-6 font-semibold text-foreground">
                    {event.title}
                  </span>
                </div>

                {(affix || event.location) && (
                  <p className="mt-1 truncate text-sm leading-5 text-foreground/55">
                    {[affix, event.location].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
