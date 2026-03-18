import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { compareEventsByTime, isEventOnDate } from "@/lib/time-utils";
import { type CalendarEvent, colorMap, type FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SwipeContainer } from "./swipe-container";

interface MobileMonthlyViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  memberMap: Map<string, FamilyMember>;
  onEventClick: (event: CalendarEvent) => void;
  onDaySelect: (date: Date) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export function MobileMonthlyView({
  events,
  currentDate,
  memberMap,
  onEventClick,
  onDaySelect,
  onSwipeLeft,
  onSwipeRight,
}: MobileMonthlyViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);

  // Reset selectedDate when currentDate changes (month navigation)
  useEffect(() => {
    setSelectedDate(currentDate);
  }, [currentDate]);

  // Generate all calendar days for the month view (including leading/trailing days)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Pre-compute events per calendar day
  const eventsByDay = useMemo(() => {
    return calendarDays.map((day) =>
      events.filter((e) => isEventOnDate(e, day)).sort(compareEventsByTime),
    );
  }, [calendarDays, events]);

  // Events for the selected day
  const selectedDayEvents = useMemo(() => {
    return events
      .filter((e) => isEventOnDate(e, selectedDate))
      .sort(compareEventsByTime);
  }, [events, selectedDate]);

  function handleDayClick(date: Date) {
    setSelectedDate(date);
    onDaySelect(date);
  }

  return (
    <SwipeContainer
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
      className="flex flex-col"
    >
      {/* Compact Calendar Grid */}
      {/* biome-ignore lint/a11y/useSemanticElements: CSS grid layout, not table data */}
      <div role="grid" aria-label="Monthly calendar" className="shrink-0 px-1">
        {/* Day initials header */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_INITIALS.map((initial, i) => (
            <div
              key={i}
              className="text-xs text-muted-foreground text-center py-1 font-medium"
            >
              {initial}
            </div>
          ))}
        </div>

        {/* Calendar day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayEvents = eventsByDay[index];
            const today = isToday(day);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentDate);

            // Unique member colors for dots (max 3)
            const memberColors = [
              ...new Set(
                dayEvents
                  .map((e) => memberMap.get(e.memberId)?.color)
                  .filter(Boolean),
              ),
            ].slice(0, 3) as (keyof typeof colorMap)[];

            const eventCount = dayEvents.length;
            const ariaLabel = `${format(day, "MMMM d")}${eventCount > 0 ? `, ${eventCount} event${eventCount > 1 ? "s" : ""}` : ""}`;

            return (
              // biome-ignore lint/a11y/useSemanticElements: button with gridcell role needed for accessible calendar grid
              <button
                key={day.toISOString()}
                type="button"
                role="gridcell"
                onClick={() => handleDayClick(day)}
                aria-label={ariaLabel}
                aria-selected={isSelected}
                className={cn(
                  "flex flex-col items-center justify-center min-h-[44px] py-1 px-0.5 relative rounded-lg",
                  "active:bg-muted/50 transition-colors",
                  isSelected && !today && "ring-2 ring-primary/30",
                  !isCurrentMonth && "text-muted-foreground/40",
                )}
              >
                {/* Date number */}
                <span
                  className={cn(
                    "text-sm font-medium leading-none w-7 h-7 flex items-center justify-center rounded-full",
                    today && "bg-primary text-primary-foreground font-semibold",
                    !today && isSelected && "text-primary font-semibold",
                    !today && !isSelected && "text-foreground",
                    !isCurrentMonth && "text-muted-foreground/40",
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Event color dots */}
                <div className="flex gap-0.5 items-center justify-center min-h-[6px] mt-0.5">
                  {memberColors.map((color) => (
                    <span
                      key={color}
                      className={cn("w-1 h-1 rounded-full", colorMap[color].bg)}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border my-2 shrink-0" />

      {/* Selected Day Event List */}
      <div className="flex-1 overflow-y-auto">
        {/* Selected day header */}
        <div className="px-4 pb-2 shrink-0">
          <h2 className="font-semibold text-sm text-foreground">
            {format(selectedDate, "EEEE, MMM d")}
          </h2>
        </div>

        {/* Event rows */}
        {selectedDayEvents.length === 0 ? (
          <div className="flex items-center min-h-[44px] px-4">
            <span className="text-muted-foreground text-sm">No events</span>
          </div>
        ) : (
          <div className="space-y-1 px-3">
            {selectedDayEvents.map((event) => {
              const member = memberMap.get(event.memberId);
              const color = (member?.color ?? "coral") as keyof typeof colorMap;
              const borderColorClass = colorMap[color].bg;

              return (
                <button
                  key={
                    event.id ??
                    `${event.recurringEventId}_${event.date.getTime()}`
                  }
                  type="button"
                  onClick={() => onEventClick(event)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg",
                    "active:bg-muted/50 transition-colors text-left bg-muted/20",
                  )}
                >
                  {/* Member color left border accent */}
                  <span
                    className={cn(
                      "w-[3px] self-stretch rounded-sm shrink-0",
                      borderColorClass,
                    )}
                  />

                  {/* Event details */}
                  <div className="flex-1 min-w-0 py-2">
                    <span className="text-sm font-medium truncate block">
                      {event.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {event.isAllDay
                        ? "All day"
                        : `${event.startTime} – ${event.endTime}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </SwipeContainer>
  );
}
