import {
  addDays,
  addMonths,
  endOfWeek,
  format,
  startOfWeek,
  subMonths,
} from "date-fns";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFamilyMembers } from "@/api";
import { useIsLargeScreen } from "@/hooks";
import {
  compareEventsAllDayFirst,
  formatLocalDate,
  getEventKey,
  isEventOnDate,
} from "@/lib/time-utils";
import {
  type CalendarEvent,
  colorMap,
  type FamilyMember,
  getFamilyMember,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { GoogleBadge, isGoogleEvent } from "../components/calendar-event";
import type { FilterState } from "../components/calendar-filter";
import { MonthDayCell } from "../components/month-day-cell";
import {
  MONTH_COLUMN_GAP,
  MONTH_MIN_ROW_HEIGHT,
  MONTH_ROW_GAP,
  monthRowHeight,
  monthSlotCapacity,
} from "../utils/month-capacity";
import { buildMonthMatrix, selectMonthDayMembers } from "../utils/month-matrix";
import {
  isMultiDay,
  orderRowMultiDay,
  planCellSlots,
} from "../utils/month-slots";

interface MonthlyCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  filter: FilterState;
  onDateSelect?: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
  isEventDetailOpen?: boolean;
}

interface DayData {
  events: CalendarEvent[];
  members: FamilyMember[];
}

const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

const DAY_OFFSET: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

export function MonthlyCalendar(props: MonthlyCalendarProps) {
  const isLargeScreen = useIsLargeScreen();
  if (!isLargeScreen) return <MonthlyCalendarCompact {...props} />;
  return <MonthlyCalendarLarge {...props} />;
}

/**
 * Tablet path (769-1023px). This is the shipped rendering, extracted verbatim
 * so the large-screen grid can be added beside it without touching it. The
 * calendar module routes <=768px to MobileMonthlyView, so this never renders
 * at mobile widths and the old `isMobile ? 2 : 3` branch was dead code.
 */
function MonthlyCalendarCompact({
  events,
  currentDate,
  onEventClick,
  filter,
  onDateSelect,
}: MonthlyCalendarProps) {
  const familyMembers = useFamilyMembers();
  const today = new Date();

  // Memoize the days calculation
  const days = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const result: Date[] = [];

    // Add previous month's trailing days
    const daysFromPrevMonth = firstDay.getDay();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      result.push(new Date(year, month - 1, prevMonthLastDay - i));
    }

    // Add all days of the current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      result.push(new Date(year, month, i));
    }

    // Add next month's leading days to complete the final week
    let nextMonthDay = 1;
    while (result.length % 7 !== 0) {
      result.push(new Date(year, month + 1, nextMonthDay++));
    }

    return result;
  }, [currentDate]);

  // Pre-compute all day data in a single pass (was 70+ function calls per render)
  const dayData = useMemo(() => {
    const data = new Map<string, DayData>();

    // Initialize all days
    for (const day of days) {
      data.set(day.toDateString(), { events: [], members: [] });
    }

    // Iterate events against all days to support multi-day events
    for (const event of events) {
      const memberMatches = filter.selectedMembers.includes(event.memberId);
      const allDayMatches = filter.showAllDayEvents || !event.isAllDay;
      if (!memberMatches || !allDayMatches) continue;

      for (const day of days) {
        if (!isEventOnDate(event, day)) continue;
        const dayInfo = data.get(day.toDateString());
        dayInfo?.events.push(event);
      }
    }

    // Sort each day's events: all-day first, then by start time
    for (const dayInfo of data.values()) {
      dayInfo.events.sort(compareEventsAllDayFirst);
    }

    // Compute unique members for each day using O(1) lookup
    for (const dayInfo of data.values()) {
      const memberIds = [...new Set(dayInfo.events.map((e) => e.memberId))];
      dayInfo.members = memberIds
        .map((id) => getFamilyMember(familyMembers, id))
        .filter((m): m is FamilyMember => m !== undefined);
    }

    return data;
  }, [
    days,
    events,
    filter.selectedMembers,
    filter.showAllDayEvents,
    familyMembers,
  ]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background p-4 overflow-auto">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2 shrink-0">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center py-1 sm:py-2 text-xs sm:text-sm font-medium text-muted-foreground"
          >
            {day.slice(0, 1)}
            <span className="hidden sm:inline">{day.slice(1)}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 shrink-0">
        {days.map((date, index) => {
          const { events: dayEvents, members: busyMembers } = dayData.get(
            date.toDateString(),
          ) ?? { events: [], members: [] };

          return (
            <div
              key={index}
              onClick={() => onDateSelect?.(date)}
              className={cn(
                "min-h-[60px] sm:min-h-[100px] p-1.5 sm:p-2 rounded-lg border cursor-pointer transition-colors overflow-hidden",
                "bg-card hover:bg-accent/50",
                isToday(date) &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/10 border-primary",
                !isToday(date) && "border-border/50",
                !isCurrentMonth(date) && "opacity-50",
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div
                  className={cn(
                    "text-sm font-medium",
                    isToday(date)
                      ? "bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center font-bold"
                      : "text-foreground",
                  )}
                >
                  {date.getDate()}
                </div>
                {busyMembers.length > 0 && (
                  <div className="flex -space-x-1">
                    {busyMembers.slice(0, 3).map((member) => (
                      <div
                        key={member?.id}
                        className={cn(
                          "w-3 h-3 rounded-full border border-card",
                          member ? colorMap[member.color]?.bg : "bg-muted",
                        )}
                        title={member?.name}
                      />
                    ))}
                    {busyMembers.length > 3 && (
                      <div className="w-3 h-3 rounded-full bg-muted border border-card flex items-center justify-center">
                        <span className="text-[8px] text-muted-foreground">
                          +
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                {dayEvents.slice(0, 3).map((event) => {
                  const member = getFamilyMember(familyMembers, event.memberId);
                  return (
                    <button
                      type="button"
                      key={getEventKey(event)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className={cn(
                        "text-xs px-1.5 py-1 sm:py-0.5 rounded text-left w-full min-h-[28px] sm:min-h-0 flex items-center gap-1",
                        member ? colorMap[member.color]?.bg : "bg-muted",
                        "text-white font-medium",
                      )}
                    >
                      {isGoogleEvent(event) && (
                        <span className="shrink-0">
                          <GoogleBadge size={8} />
                        </span>
                      )}
                      <span className="truncate">
                        {event.isAllDay ? `● ${event.title}` : event.title}
                      </span>
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground font-medium">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyCalendarLarge({
  events,
  currentDate,
  onEventClick,
  filter,
  onDateSelect,
  onMonthChange,
  isEventDetailOpen = false,
}: MonthlyCalendarProps) {
  const familyMembers = useFamilyMembers();
  const visibleEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          filter.selectedMembers.includes(event.memberId) &&
          (filter.showAllDayEvents || !event.isAllDay),
      ),
    [events, filter.selectedMembers, filter.showAllDayEvents],
  );
  const days = useMemo(() => buildMonthMatrix(currentDate), [currentDate]);
  const weekCount = days.length / 7;
  const weeks = useMemo(
    () =>
      Array.from({ length: weekCount }, (_, index) =>
        days.slice(index * 7, index * 7 + 7),
      ),
    [days, weekCount],
  );
  const dayMembers = useMemo(
    () => selectMonthDayMembers(visibleEvents, familyMembers),
    [visibleEvents, familyMembers],
  );

  // Callback ref, not useRef. The weeks container unmounts while the loading
  // skeleton is shown, and `weekCount` does not change when it remounts — an
  // effect keyed on [weekCount] with a useRef would never re-attach the
  // observer, leaving rowHeight pinned at the floor forever.
  const [weeksEl, setWeeksEl] = useState<HTMLDivElement | null>(null);
  const [rowHeight, setRowHeight] = useState(MONTH_MIN_ROW_HEIGHT);
  const [focusedDate, setFocusedDate] = useState<Date>(currentDate);
  const [openPopoverDate, setOpenPopoverDate] = useState<Date | null>(null);
  const pendingFocus = useRef(false);
  const pendingVisibleMonth = useRef<string | null>(null);
  const pendingModalReturnDate = useRef<Date | null>(null);
  const wasDetailOpen = useRef(isEventDetailOpen);

  useEffect(() => {
    if (!weeksEl) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      const next = monthRowHeight(height, weekCount, MONTH_ROW_GAP);
      // Write only on change so observation cannot re-trigger itself.
      setRowHeight((previous) => (previous === next ? previous : next));
    });
    observer.observe(weeksEl);
    return () => observer.disconnect();
  }, [weeksEl, weekCount]);

  const capacity = monthSlotCapacity(rowHeight);
  // Membership in the rendered matrix, not month equality. March 2026 renders
  // Apr 1-4 as trailing cells; arrowing onto one of those must move focus
  // within the existing grid, not re-page the whole month — otherwise the
  // adjacent-month events fetched for the grid are unreachable by keyboard.
  const matrixKeys = useMemo(
    () => new Set(days.map((day) => formatLocalDate(day))),
    [days],
  );

  const handleSelectDay = (date: Date) => onDateSelect?.(date);

  const handleEventClick = (event: CalendarEvent, originDate: Date) => {
    if (!onEventClick) return;
    pendingModalReturnDate.current = originDate;
    onEventClick(event);
  };

  const handleActivateDay = (date: Date) => {
    const hasEvents = visibleEvents.some((event) => isEventOnDate(event, date));
    if (hasEvents) setOpenPopoverDate(date);
    else handleSelectDay(date);
  };

  const moveFocus = (
    next: Date,
    forceMonthChange = !matrixKeys.has(formatLocalDate(next)),
  ) => {
    pendingFocus.current = true;
    pendingVisibleMonth.current = forceMonthChange
      ? format(next, "yyyy-MM")
      : null;
    setFocusedDate(next);
    if (forceMonthChange) onMonthChange?.(next);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    date: Date,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      // Any day with events opens the popover — not only overflowing days.
      // The popover is the keyboard path to every event, so gating it on
      // overflow would make Enter dead on a day with one event.
      handleActivateDay(date);
      return;
    }

    const offset = DAY_OFFSET[event.key];
    if (offset !== undefined) {
      event.preventDefault();
      moveFocus(addDays(date, offset));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      moveFocus(startOfWeek(date, { weekStartsOn: 0 }));
    } else if (event.key === "End") {
      event.preventDefault();
      moveFocus(endOfWeek(date, { weekStartsOn: 0 }));
    } else if (event.key === "PageUp") {
      event.preventDefault();
      moveFocus(subMonths(date, 1), true);
    } else if (event.key === "PageDown") {
      event.preventDefault();
      moveFocus(addMonths(date, 1), true);
    }
  };

  // Toolbar paging resets the roving date. Keyboard edge paging sets the
  // pending flag first and preserves its exact destination across the render.
  useEffect(() => {
    if (pendingFocus.current) return;
    setFocusedDate(currentDate);
    setOpenPopoverDate(null);
  }, [currentDate]);

  // Restore focus after a month change re-renders the grid, so crossing a grid
  // edge does not dump focus back to the first cell.
  useEffect(() => {
    if (!pendingFocus.current) return;
    if (
      pendingVisibleMonth.current !== null &&
      pendingVisibleMonth.current !== format(currentDate, "yyyy-MM")
    ) {
      return;
    }
    const target = weeksEl?.querySelector<HTMLElement>(
      `[data-date="${formatLocalDate(focusedDate)}"]`,
    );
    // The state update can render once against the old matrix before the parent
    // month change lands. Do not clear the request until the target exists.
    if (!target) return;
    target.focus();
    pendingFocus.current = false;
    pendingVisibleMonth.current = null;
    // `days` is omitted deliberately: it is a useMemo over [currentDate], so it
    // changes exactly when currentDate does and Biome rejects it as redundant.
  }, [currentDate, focusedDate, weeksEl]);

  useEffect(() => {
    const justClosed = wasDetailOpen.current && !isEventDetailOpen;
    wasDetailOpen.current = isEventDetailOpen;
    if (!justClosed || !pendingModalReturnDate.current) return;
    const target = weeksEl?.querySelector<HTMLElement>(
      `[data-date="${formatLocalDate(pendingModalReturnDate.current)}"]`,
    );
    if (!target) return;
    target.focus();
    pendingModalReturnDate.current = null;
  }, [isEventDetailOpen, weeksEl]);

  return (
    // biome-ignore lint/a11y/useSemanticElements: CSS grid layout, not table data
    <div
      role="grid"
      aria-label={format(currentDate, "MMMM yyyy")}
      className="flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-auto p-4"
    >
      {/* biome-ignore lint/a11y/useSemanticElements: CSS grid layout, not table data */}
      {/* biome-ignore lint/a11y/useFocusableInteractive: roving tabindex lives on the gridcells; rows are never tab stops */}
      <div
        role="row"
        className="grid shrink-0 grid-cols-7"
        style={{ columnGap: MONTH_COLUMN_GAP }}
      >
        {WEEKDAY_LABELS.map((label) => (
          // biome-ignore lint/a11y/useSemanticElements: CSS grid layout, not table data
          // biome-ignore lint/a11y/useFocusableInteractive: column headers are labels, not tab stops
          <div
            key={label}
            role="columnheader"
            className="py-1 text-center text-sm font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* The observer watches this container, not the grid: monthRowHeight
          must never be handed a height that includes the weekday header. */}
      {/* biome-ignore lint/a11y/useSemanticElements: CSS grid layout, not table data */}
      <div
        ref={setWeeksEl}
        role="rowgroup"
        className="flex min-h-0 flex-1 flex-col"
        style={{ gap: MONTH_ROW_GAP }}
      >
        {weeks.map((week) => {
          const rowMultiDay = orderRowMultiDay(visibleEvents, week);
          return (
            // biome-ignore lint/a11y/useSemanticElements: CSS grid layout, not table data
            // biome-ignore lint/a11y/useFocusableInteractive: roving tabindex lives on the gridcells; rows are never tab stops
            <div
              key={formatLocalDate(week[0])}
              role="row"
              className="grid shrink-0 grid-cols-7"
              style={{ columnGap: MONTH_COLUMN_GAP }}
            >
              {week.map((day, columnIndex) => {
                const dayEvents = visibleEvents
                  .filter((event) => isEventOnDate(event, day))
                  .sort(compareEventsAllDayFirst);
                const singleDayEvents = dayEvents.filter(
                  (event) => !isMultiDay(event),
                );
                const plan = planCellSlots({
                  rowMultiDay,
                  day,
                  singleDayEvents,
                  capacity,
                });
                const members = dayMembers.get(day.toDateString()) ?? [];

                return (
                  <MonthDayCell
                    key={formatLocalDate(day)}
                    date={day}
                    visibleMonthName={format(currentDate, "MMMM")}
                    columnIndex={columnIndex}
                    plan={plan}
                    allEvents={dayEvents}
                    memberColors={members.map((member) => member.color)}
                    memberNames={members.map((member) => member.name)}
                    isToday={day.toDateString() === new Date().toDateString()}
                    isFocused={
                      formatLocalDate(day) === formatLocalDate(focusedDate)
                    }
                    isOutsideMonth={day.getMonth() !== currentDate.getMonth()}
                    isWeekend={day.getDay() === 0 || day.getDay() === 6}
                    rowHeight={rowHeight}
                    onActivateDay={handleActivateDay}
                    onSelectDay={handleSelectDay}
                    onEventClick={(event) => handleEventClick(event, day)}
                    onFocusDay={setFocusedDate}
                    onKeyDown={handleKeyDown}
                    popoverOpen={
                      openPopoverDate !== null &&
                      formatLocalDate(openPopoverDate) === formatLocalDate(day)
                    }
                    onPopoverOpenChange={(open) =>
                      setOpenPopoverDate(open ? day : null)
                    }
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
