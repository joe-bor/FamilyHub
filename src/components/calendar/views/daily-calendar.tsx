import { useMemo, useRef } from "react";
import { useFamilyMembers } from "@/api";
import {
  compareEventsByTime,
  getEventKey,
  isEventOnDate,
} from "@/lib/time-utils";
import { type CalendarEvent, colorMap, getFamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CalendarEventCard } from "../components/calendar-event";
import type { FilterState } from "../components/calendar-filter";
import {
  CurrentTimeIndicator,
  useAutoScrollToNow,
} from "../components/current-time-indicator";
import { getEventOffsets, pxFromOffsets, TIME_SLOTS } from "../utils/hour-grid";
import { calculateEventColumns } from "./day-lane-layout";

interface DailyCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  filter: FilterState;
}

const ROW_HEIGHT = 80; // px per hour

export function DailyCalendar({
  events,
  currentDate,
  onEventClick,
  filter,
}: DailyCalendarProps) {
  const familyMembers = useFamilyMembers();
  const today = new Date();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isCurrentDay = currentDate.toDateString() === today.toDateString();
  useAutoScrollToNow(isCurrentDay ? scrollContainerRef : { current: null });

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  // Memoize filtered and sorted events for the day
  const dayEvents = useMemo(() => {
    return events
      .filter((event) => {
        const dateMatches = isEventOnDate(event, currentDate);
        const memberMatches = filter.selectedMembers.includes(event.memberId);
        const allDayMatches = filter.showAllDayEvents || !event.isAllDay;
        return dateMatches && memberMatches && allDayMatches;
      })
      .sort(compareEventsByTime);
  }, [events, currentDate, filter.selectedMembers, filter.showAllDayEvents]);

  const allDayEvents = useMemo(
    () => dayEvents.filter((e) => e.isAllDay),
    [dayEvents],
  );

  const timedEvents = useMemo(
    () => dayEvents.filter((e) => !e.isAllDay),
    [dayEvents],
  );

  // Memoize the O(n²) column layout calculation
  const eventsWithLayout = useMemo(
    () => calculateEventColumns(timedEvents),
    [timedEvents],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Day info header */}
      <div className="flex border-b border-border bg-card shrink-0">
        <div className="w-12 sm:w-16 shrink-0" />
        <div
          className={cn(
            "flex-1 text-center py-4",
            isToday(currentDate) && "bg-primary/5",
          )}
        >
          <div className="flex justify-center gap-2">
            {familyMembers.map((member) => {
              const hasEvent = dayEvents.some((e) => e.memberId === member.id);
              return hasEvent ? (
                <div key={member.id} className="flex items-center gap-1">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      colorMap[member.color]?.bg,
                    )}
                  />
                  <span className="text-xs text-muted-foreground">
                    {member.name}
                  </span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>

      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-border bg-card shrink-0">
          <div className="w-12 sm:w-16 shrink-0 flex items-center justify-end pr-2">
            <span className="text-xs text-muted-foreground font-medium">
              All Day
            </span>
          </div>
          <div className="flex-1 flex flex-wrap gap-1.5 p-2">
            {allDayEvents.map((event) => {
              const member = getFamilyMember(familyMembers, event.memberId);
              const colors = member ? colorMap[member.color] : colorMap.coral;
              return (
                <button
                  type="button"
                  key={getEventKey(event)}
                  onClick={() => onEventClick?.(event)}
                  title={event.title}
                  aria-label={`${event.title} - All day event`}
                  className={cn(
                    "text-xs font-medium px-2.5 py-1 rounded-full text-white transition-all hover:scale-105 hover:shadow-sm",
                    colors?.bg || "bg-muted",
                  )}
                >
                  {event.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex-1 flex overflow-y-auto" ref={scrollContainerRef}>
        {/* Time column */}
        <div className="w-12 sm:w-16 shrink-0 bg-card border-r border-border">
          {TIME_SLOTS.map((time, index) => (
            <div
              key={index}
              className="h-20 flex items-start justify-end pr-2 pt-1 border-b border-border/50"
            >
              <span className="text-xs text-foreground/70 font-semibold">
                {time}
              </span>
            </div>
          ))}
        </div>

        {/* Day column - relative container for absolute positioned events */}
        <div
          className={cn(
            "flex-1 relative",
            isToday(currentDate) && "bg-primary/5",
          )}
        >
          {/* Grid rows */}
          {TIME_SLOTS.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-20 border-b border-border/50",
                index % 2 === 0 && "bg-muted/30",
              )}
            />
          ))}

          {isCurrentDay && (
            <div className="absolute inset-0 pointer-events-none">
              <CurrentTimeIndicator />
            </div>
          )}

          {eventsWithLayout.map((event) => {
            const { top, height } = pxFromOffsets(
              getEventOffsets(event.startTime, event.endTime),
              ROW_HEIGHT,
            );
            const { column, totalColumns } = event;

            // Calculate horizontal position (max 3 columns)
            const effectiveColumns = Math.min(totalColumns, 3);
            const columnWidth = 100 / effectiveColumns;
            const left = Math.min(column, 2) * columnWidth;

            // Use compact variant for 3+ columns
            const variant = totalColumns >= 3 ? "compact" : "large";

            return (
              <div
                key={getEventKey(event)}
                className="absolute overflow-hidden rounded-xl"
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `calc(${left}% + 8px)`,
                  width: `calc(${columnWidth}% - 12px)`,
                }}
              >
                <CalendarEventCard
                  event={event}
                  onClick={() => onEventClick?.(event)}
                  variant={variant}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
