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
import {
  compareEventsByTime,
  DAY_INITIALS,
  isEventOnDate,
} from "@/lib/time-utils";
import { type CalendarEvent, colorMap, type FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MOBILE_FAB_SCROLL_PADDING } from "../../components/floating-action-layout";
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
      <div
        role="grid"
        aria-label="Monthly calendar"
        className="shrink-0 px-2 pt-2"
      >
        {/* Day initials header */}
        <div className="mb-1 grid grid-cols-7">
          {DAY_INITIALS.map((initial, i) => (
            <div
              key={i}
              className="py-1 text-center text-xs font-semibold text-muted-foreground"
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
                  "relative flex min-h-12 flex-col items-center justify-center rounded-lg px-0.5 py-1",
                  "transition-colors active:bg-muted/50",
                  isSelected && !today && "ring-2 ring-primary/30",
                  !isCurrentMonth && "text-muted-foreground/40",
                )}
              >
                {/* Date number */}
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm leading-none font-semibold",
                    today && "bg-primary text-primary-foreground font-semibold",
                    !today && isSelected && "text-primary font-semibold",
                    !today && !isSelected && "text-foreground",
                    !isCurrentMonth && "text-muted-foreground/40",
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Event color dots */}
                <div className="mt-1 flex min-h-[6px] items-center justify-center gap-0.5">
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
      <div className="my-3 shrink-0 border-t border-border" />

      {/* Selected Day Event List */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: MOBILE_FAB_SCROLL_PADDING }}
      >
        {/* Selected day header */}
        <div className="shrink-0 px-4 pb-2">
          <h2 className="text-base leading-6 font-semibold text-foreground">
            {format(selectedDate, "EEEE, MMM d")}
          </h2>
        </div>

        {/* Event rows */}
        {selectedDayEvents.length === 0 ? (
          <div className="flex min-h-12 items-center px-4">
            <span className="text-sm text-muted-foreground">No events</span>
          </div>
        ) : (
          <div className="space-y-2 px-3">
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
                    "flex min-h-12 w-full items-center gap-3 rounded-xl px-3",
                    "bg-muted/20 text-left transition-colors active:bg-muted/50",
                  )}
                >
                  {/* Member color left border accent */}
                  <span
                    className={cn(
                      "w-[3px] shrink-0 self-stretch rounded-sm",
                      borderColorClass,
                    )}
                  />

                  {/* Event details */}
                  <div className="min-w-0 flex-1 py-2">
                    <span className="block truncate text-[15px] leading-5 font-semibold">
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
