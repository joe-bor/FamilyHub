import { useMemo } from "react";
import { useFamilyMembers } from "@/api";
import { useIsMobile } from "@/hooks";
import {
  type CalendarEvent,
  colorMap,
  type FamilyMember,
  getFamilyMember,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import type { FilterState } from "../components/calendar-filter";
import { CalendarNavigation } from "../components/calendar-navigation";

interface MonthlyCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  filter: FilterState;
  onDateSelect?: (date: Date) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  isViewingToday: boolean;
}

interface DayData {
  events: CalendarEvent[];
  members: FamilyMember[];
}

export function MonthlyCalendar({
  events,
  currentDate,
  onEventClick,
  filter,
  onDateSelect,
  onPrevious,
  onNext,
  onToday,
  isViewingToday,
}: MonthlyCalendarProps) {
  const familyMembers = useFamilyMembers();
  const isMobile = useIsMobile();
  const today = new Date();

  // Show fewer events on mobile to save space
  const eventsToShow = isMobile ? 2 : 3;

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

    // Single pass through events - filter and group by date
    for (const event of events) {
      const eventDate = new Date(event.date);
      const dateKey = eventDate.toDateString();
      const dayInfo = data.get(dateKey);

      if (dayInfo) {
        const memberMatches = filter.selectedMembers.includes(event.memberId);
        const allDayMatches = filter.showAllDayEvents || !event.isAllDay;
        if (memberMatches && allDayMatches) {
          dayInfo.events.push(event);
        }
      }
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

  const formatMonthLabel = () => {
    return currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background p-4 overflow-auto">
      <CalendarNavigation
        label={formatMonthLabel()}
        onPrevious={onPrevious}
        onNext={onNext}
        onToday={onToday}
        isViewingToday={isViewingToday}
      />

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
                {dayEvents.slice(0, eventsToShow).map((event) => {
                  const member = getFamilyMember(familyMembers, event.memberId);
                  return (
                    <button
                      type="button"
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className={cn(
                        "text-xs px-1.5 py-1 sm:py-0.5 rounded truncate text-left w-full min-h-[28px] sm:min-h-0",
                        member ? colorMap[member.color]?.bg : "bg-muted",
                        "text-white font-medium",
                      )}
                    >
                      {event.title}
                    </button>
                  );
                })}
                {dayEvents.length > eventsToShow && (
                  <div className="text-xs text-muted-foreground font-medium">
                    +{dayEvents.length - eventsToShow} more
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
