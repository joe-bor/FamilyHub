import { useMemo, useRef } from "react";
import { useFamilyMembers } from "@/api";
import { useIsLargeScreen } from "@/hooks";
import {
  CALENDAR_START_HOUR,
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
  useAutoScrollToMinutes,
} from "../components/current-time-indicator";
import {
  earliestEventStartMinutes,
  getEventOffsets,
  hourRowHeightFor,
  pxFromOffsets,
  TIME_SLOTS,
} from "../utils/hour-grid";

interface WeeklyCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  filter: FilterState;
}

const START_HOUR = CALENDAR_START_HOUR;

export function WeeklyCalendar({
  events,
  currentDate,
  onEventClick,
  filter,
}: WeeklyCalendarProps) {
  const familyMembers = useFamilyMembers();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const isLargeScreen = useIsLargeScreen();
  const rowHeight = hourRowHeightFor(isLargeScreen);

  // Memoize week days calculation
  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentDate]);

  // Pre-compute events for all 7 days in a single pass (was 14+ calls to getEventsForDay)
  const { timedByDay, allDayByDay, hasAnyAllDayEvents } = useMemo(() => {
    const timed = new Map<string, CalendarEvent[]>();
    const allDay = new Map<string, CalendarEvent[]>();

    // Initialize all 7 days
    for (const day of weekDays) {
      timed.set(day.toDateString(), []);
      allDay.set(day.toDateString(), []);
    }

    // Iterate events against all 7 days to support multi-day events
    for (const event of events) {
      const memberMatches = filter.selectedMembers.includes(event.memberId);
      const allDayMatches = filter.showAllDayEvents || !event.isAllDay;
      if (!memberMatches || !allDayMatches) continue;

      for (const day of weekDays) {
        if (!isEventOnDate(event, day)) continue;
        const dateKey = day.toDateString();
        // Multi-day events are always all-day, so route to allDay map
        if (event.isAllDay) {
          allDay.get(dateKey)?.push(event);
        } else {
          timed.get(dateKey)?.push(event);
        }
      }
    }

    // Sort timed events by start time
    for (const dayEvents of timed.values()) {
      dayEvents.sort(compareEventsByTime);
    }

    let anyAllDay = false;
    for (const dayEvents of allDay.values()) {
      if (dayEvents.length > 0) {
        anyAllDay = true;
        break;
      }
    }

    return {
      timedByDay: timed,
      allDayByDay: allDay,
      hasAnyAllDayEvents: anyAllDay,
    };
  }, [events, weekDays, filter.selectedMembers, filter.showAllDayEvents]);

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  // Helper to get events for a day from pre-computed maps
  const getEventsForDay = (date: Date) => {
    return timedByDay.get(date.toDateString()) ?? [];
  };

  const getAllDayEventsForDay = (date: Date) => {
    return allDayByDay.get(date.toDateString()) ?? [];
  };

  const isTodayInWeek = weekDays.some((date) => isToday(date));

  // Auto-scroll target (minutes from START_HOUR): now when today is in the
  // visible week, otherwise the earliest timed event across the week (spec Section 3).
  const autoScrollMinutes = useMemo(() => {
    if (!isLargeScreen || isTodayInWeek) {
      const now = new Date();
      return (now.getHours() - START_HOUR) * 60 + now.getMinutes();
    }
    const weekTimedEvents = weekDays.flatMap(
      (date) => timedByDay.get(date.toDateString()) ?? [],
    );
    return earliestEventStartMinutes(weekTimedEvents, START_HOUR);
  }, [isLargeScreen, isTodayInWeek, weekDays, timedByDay]);

  useAutoScrollToMinutes(scrollContainerRef, autoScrollMinutes, rowHeight);

  const gridTemplateColumns = "4rem repeat(7, minmax(0, 1fr))";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Days header */}
      <div
        className="grid border-b border-border bg-card shrink-0"
        style={{ gridTemplateColumns }}
      >
        {/* Time column spacer */}
        <div className="border-r border-border" />
        {weekDays.map((date, index) => {
          const dayIsToday = isToday(date);
          const busyMembers = familyMembers.filter(
            (member) =>
              getEventsForDay(date).some((e) => e.memberId === member.id) ||
              getAllDayEventsForDay(date).some((e) => e.memberId === member.id),
          );

          if (!isLargeScreen) {
            return (
              <div
                key={index}
                className={cn(
                  "text-center py-3 border-l border-border relative",
                  dayIsToday && "bg-primary/10",
                )}
              >
                <div
                  className={cn(
                    "text-sm font-medium",
                    dayIsToday ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div
                  className={cn(
                    "text-2xl font-bold mt-1",
                    dayIsToday
                      ? "text-primary-foreground bg-primary w-10 h-10 rounded-full flex items-center justify-center mx-auto"
                      : "text-foreground",
                  )}
                >
                  {date.getDate()}
                </div>
                {dayIsToday && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full">
                    TODAY
                  </span>
                )}
                <div className="flex justify-center gap-1 mt-1.5">
                  {familyMembers.slice(0, 4).map((member) => {
                    const hasEvent =
                      getEventsForDay(date).some(
                        (e) => e.memberId === member.id,
                      ) ||
                      getAllDayEventsForDay(date).some(
                        (e) => e.memberId === member.id,
                      );
                    return hasEvent ? (
                      <div
                        key={member.id}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          colorMap[member.color]?.bg,
                        )}
                      />
                    ) : null;
                  })}
                </div>
              </div>
            );
          }

          return (
            <div
              key={index}
              className={cn(
                "flex items-center justify-center gap-2 border-l border-border px-2 py-2",
                dayIsToday && "bg-primary/10",
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  dayIsToday ? "text-primary" : "text-muted-foreground",
                )}
              >
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-bold tabular-nums",
                  dayIsToday
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground",
                )}
              >
                {date.getDate()}
              </span>
              <span className="flex items-center gap-0.5">
                {busyMembers.slice(0, 4).map((member) => (
                  <span
                    key={member.id}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      colorMap[member.color]?.bg,
                    )}
                    title={member.name}
                  />
                ))}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day events row */}
      {hasAnyAllDayEvents && (
        <div
          className="grid border-b border-border bg-card shrink-0"
          style={{ gridTemplateColumns }}
        >
          <div className="border-r border-border flex items-center justify-end pr-2">
            <span className="text-xs text-muted-foreground font-medium">
              All Day
            </span>
          </div>
          {weekDays.map((date, index) => {
            const dayAllDayEvents = getAllDayEventsForDay(date);
            return (
              <div
                key={index}
                className={cn(
                  "border-l border-border p-1 flex flex-col gap-1 min-h-[36px]",
                  isToday(date) && "bg-primary/5",
                )}
              >
                {dayAllDayEvents.map((event) => {
                  const member = getFamilyMember(familyMembers, event.memberId);
                  const colors = member
                    ? colorMap[member.color]
                    : colorMap.coral;
                  return (
                    <button
                      type="button"
                      key={getEventKey(event)}
                      onClick={() => onEventClick?.(event)}
                      title={event.title}
                      aria-label={`${event.title} - All day event`}
                      className={cn(
                        "text-[10px] font-medium px-2 py-1 min-h-[28px] rounded-md text-white truncate w-full text-left transition-all hover:brightness-110",
                        colors?.bg || "bg-muted",
                      )}
                    >
                      {event.title}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar grid with events */}
      <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
        {/* Min-width wrapper enables horizontal scroll on narrow screens */}
        <div className="min-w-[640px]">
          <div className="grid min-h-full" style={{ gridTemplateColumns }}>
            {/* Time column */}
            <div className="bg-card border-r border-border">
              {TIME_SLOTS.map((time, index) => (
                <div
                  key={index}
                  className="flex items-start justify-end pr-2 pt-1 border-b border-border/50"
                  style={{ height: rowHeight }}
                >
                  <span className="text-xs text-foreground/70 font-semibold">
                    {time}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((date, dayIndex) => {
              const dayEvents = getEventsForDay(date);
              const isTodayColumn = isToday(date);

              return (
                <div
                  key={dayIndex}
                  className={cn(
                    "border-l border-border relative",
                    isTodayColumn && "bg-primary/5",
                  )}
                >
                  {TIME_SLOTS.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "border-b border-border/50",
                        index % 2 === 0 && !isTodayColumn && "bg-muted/20",
                      )}
                      style={{ height: rowHeight }}
                    />
                  ))}

                  {isTodayColumn && (
                    <CurrentTimeIndicator rowHeight={rowHeight} />
                  )}

                  <div className="absolute inset-0 px-0.5">
                    {dayEvents.map((event) => {
                      const { top, height } = pxFromOffsets(
                        getEventOffsets(event.startTime, event.endTime),
                        rowHeight,
                      );
                      return (
                        <div
                          key={getEventKey(event)}
                          className="absolute left-0.5 right-0.5 overflow-hidden rounded-xl"
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <CalendarEventCard
                            event={event}
                            onClick={() => onEventClick?.(event)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
