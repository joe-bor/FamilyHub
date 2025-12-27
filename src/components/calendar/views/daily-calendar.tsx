import { useMemo, useRef } from "react";
import {
  compareEventsByTime,
  getTimeInMinutes,
  parseTime,
} from "@/lib/time-utils";
import { type CalendarEvent, colorMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useFamilyMembers } from "@/stores";
import { CalendarEventCard } from "../components/calendar-event";
import type { FilterState } from "../components/calendar-filter";
import { CalendarNavigation } from "../components/calendar-navigation";
import {
  CurrentTimeIndicator,
  useAutoScrollToNow,
} from "../components/current-time-indicator";

interface DailyCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  filter: FilterState;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  isViewingToday: boolean;
}

const START_HOUR = 6;
const ROW_HEIGHT = 80; // px per hour

function getEventGridPosition(startTime: string, endTime: string) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);

  // Calculate row index from start hour (6 AM = row 0)
  const startRow = start.hours - START_HOUR;
  const startMinuteOffset = start.minutes / 60;

  const endRow = end.hours - START_HOUR;
  const endMinuteOffset = end.minutes / 60;

  // Calculate top position: row * height + minute offset
  const top = (startRow + startMinuteOffset) * ROW_HEIGHT;
  const bottom = (endRow + endMinuteOffset) * ROW_HEIGHT;
  const height = Math.max(bottom - top, 30); // Minimum 30px height

  return { top, height };
}

function eventsOverlap(a: CalendarEvent, b: CalendarEvent): boolean {
  const aStart = getTimeInMinutes(a.startTime);
  const aEnd = getTimeInMinutes(a.endTime);
  const bStart = getTimeInMinutes(b.startTime);
  const bEnd = getTimeInMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

interface EventWithLayout extends CalendarEvent {
  column: number;
  totalColumns: number;
}

function calculateEventColumns(events: CalendarEvent[]): EventWithLayout[] {
  if (events.length === 0) return [];

  // Sort by start time, then by duration (longer events first)
  const sorted = [...events].sort((a, b) => {
    const aStart = getTimeInMinutes(a.startTime);
    const bStart = getTimeInMinutes(b.startTime);
    if (aStart !== bStart) return aStart - bStart;

    const aDuration = getTimeInMinutes(a.endTime) - aStart;
    const bDuration = getTimeInMinutes(b.endTime) - bStart;
    return bDuration - aDuration; // Longer events first
  });

  const result: EventWithLayout[] = [];
  const columns: CalendarEvent[][] = []; // Each column tracks events in that column

  for (const event of sorted) {
    // Find the first column where this event doesn't overlap with existing events
    let assignedColumn = -1;
    for (let col = 0; col < columns.length; col++) {
      const hasOverlap = columns[col].some((e) => eventsOverlap(e, event));
      if (!hasOverlap) {
        assignedColumn = col;
        break;
      }
    }

    // If no suitable column found, create a new one
    if (assignedColumn === -1) {
      assignedColumn = columns.length;
      columns.push([]);
    }

    columns[assignedColumn].push(event);
    result.push({ ...event, column: assignedColumn, totalColumns: 0 }); // totalColumns set later
  }

  // Now calculate totalColumns for each event based on overlapping events
  for (const eventWithLayout of result) {
    // Find all events that overlap with this one
    const overlapping = result.filter((e) => eventsOverlap(e, eventWithLayout));
    // Find the max column among overlapping events + 1
    const maxColumn = Math.max(...overlapping.map((e) => e.column));
    eventWithLayout.totalColumns = maxColumn + 1;
  }

  return result;
}

export function DailyCalendar({
  events,
  currentDate,
  onEventClick,
  filter,
  onPrevious,
  onNext,
  onToday,
  isViewingToday,
}: DailyCalendarProps) {
  const familyMembers = useFamilyMembers();
  const today = new Date();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isCurrentDay = currentDate.toDateString() === today.toDateString();
  useAutoScrollToNow(isCurrentDay ? scrollContainerRef : { current: null });

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Memoize filtered and sorted events for the day
  const dayEvents = useMemo(() => {
    return events
      .filter((event) => {
        const eventDate = new Date(event.date);
        const dateMatches =
          eventDate.toDateString() === currentDate.toDateString();
        const memberMatches = filter.selectedMembers.includes(event.memberId);
        const allDayMatches = filter.showAllDayEvents || !event.isAllDay;
        return dateMatches && memberMatches && allDayMatches;
      })
      .sort(compareEventsByTime);
  }, [events, currentDate, filter.selectedMembers, filter.showAllDayEvents]);

  // Memoize the O(n²) column layout calculation
  const eventsWithLayout = useMemo(
    () => calculateEventColumns(dayEvents),
    [dayEvents],
  );

  const timeSlots = [
    "6 AM",
    "7 AM",
    "8 AM",
    "9 AM",
    "10 AM",
    "11 AM",
    "12 PM",
    "1 PM",
    "2 PM",
    "3 PM",
    "4 PM",
    "5 PM",
    "6 PM",
    "7 PM",
    "8 PM",
    "9 PM",
    "10 PM",
    "11 PM",
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Navigation header */}
      <div className="border-b border-border bg-card shrink-0">
        <CalendarNavigation
          label={formatDateLabel(currentDate)}
          onPrevious={onPrevious}
          onNext={onNext}
          onToday={onToday}
          isViewingToday={isViewingToday}
        />
      </div>

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

      {/* Calendar grid */}
      <div className="flex-1 flex overflow-y-auto" ref={scrollContainerRef}>
        {/* Time column */}
        <div className="w-12 sm:w-16 shrink-0 bg-card border-r border-border">
          {timeSlots.map((time, index) => (
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
          {timeSlots.map((_, index) => (
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
            const { top, height } = getEventGridPosition(
              event.startTime,
              event.endTime,
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
                key={event.id}
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
