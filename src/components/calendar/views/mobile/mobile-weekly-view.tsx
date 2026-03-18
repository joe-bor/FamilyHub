import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfWeek,
} from "date-fns";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { compareEventsByTime, isEventOnDate } from "@/lib/time-utils";
import { type CalendarEvent, colorMap, type FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SwipeContainer } from "./swipe-container";

interface MobileWeeklyViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  memberMap: Map<string, FamilyMember>;
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export function MobileWeeklyView({
  events,
  currentDate,
  memberMap,
  onEventClick,
  onDayClick,
  onSwipeLeft,
  onSwipeRight,
}: MobileWeeklyViewProps) {
  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 }),
      }),
    [currentDate],
  );

  // Pre-compute events per day for the week
  const eventsByDay = useMemo(() => {
    return weekDays.map((day) =>
      events.filter((e) => isEventOnDate(e, day)).sort(compareEventsByTime),
    );
  }, [weekDays, events]);

  return (
    <SwipeContainer
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
      className="flex flex-col"
    >
      {/* Date Strip Header */}
      <nav
        aria-label="Week navigation"
        className="grid grid-cols-7 border-b border-border bg-card shrink-0"
      >
        {weekDays.map((day, index) => {
          const dayEvents = eventsByDay[index];
          const today = isToday(day);
          const isSelected = isSameDay(day, currentDate);

          // Unique member colors for dots (max 3)
          const memberColors = [
            ...new Set(
              dayEvents
                .map((e) => memberMap.get(e.memberId)?.color)
                .filter(Boolean),
            ),
          ].slice(0, 3) as (keyof typeof colorMap)[];

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick(day)}
              aria-label={`View day ${format(day, "MMMM d, yyyy")}`}
              className={cn(
                "flex flex-col items-center py-2 px-1 gap-0.5 relative",
                "active:bg-muted/50 transition-colors",
                isSelected && !today && "bg-muted/30",
              )}
            >
              {/* Day initial */}
              <span className="text-[10px] font-medium text-muted-foreground leading-none">
                {DAY_INITIALS[index]}
              </span>

              {/* Date number */}
              <span
                className={cn(
                  "text-sm font-semibold leading-none w-7 h-7 flex items-center justify-center rounded-full",
                  today && "bg-primary text-primary-foreground",
                  !today && isSelected && "text-primary",
                )}
              >
                {format(day, "d")}
              </span>

              {/* TODAY label */}
              {today && (
                <span className="text-[8px] text-primary font-semibold leading-none uppercase tracking-wide">
                  Today
                </span>
              )}

              {/* Event color dots */}
              {memberColors.length > 0 && (
                <div className="flex gap-0.5 items-center justify-center min-h-[6px]">
                  {memberColors.map((color) => (
                    <span
                      key={color}
                      className={cn("w-1 h-1 rounded-full", colorMap[color].bg)}
                    />
                  ))}
                </div>
              )}

              {/* Subtle chevron */}
              <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/50 absolute right-0.5 top-1/2 -translate-y-1/2" />
            </button>
          );
        })}
      </nav>

      {/* Day-by-Day Event List */}
      <div className="flex-1 overflow-y-auto">
        {weekDays.map((day, index) => {
          const dayEvents = eventsByDay[index];
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex border-b border-border/50",
                today && "bg-primary/5",
              )}
            >
              {/* Day label (left column) */}
              <div className="min-w-[52px] w-[52px] flex flex-col items-center pt-3 pb-2 border-r border-border/50 shrink-0">
                <span className="text-[10px] font-medium text-muted-foreground uppercase leading-none">
                  {format(day, "EEE")}
                </span>
                <span
                  className={cn(
                    "text-base font-semibold leading-none mt-0.5",
                    today && "text-primary",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Events list (right column) */}
              <div className="flex-1 py-1">
                {dayEvents.length === 0 ? (
                  <div className="flex items-center min-h-[44px] px-3">
                    <span className="text-muted-foreground text-xs">
                      No events
                    </span>
                  </div>
                ) : (
                  dayEvents.map((event) => {
                    const member = memberMap.get(event.memberId);
                    const color = member?.color ?? "coral";
                    const dotColorClass = colorMap[color].bg;

                    return (
                      <button
                        key={
                          event.id ??
                          `${event.recurringEventId}_${event.date.getTime()}`
                        }
                        type="button"
                        onClick={() => onEventClick(event)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 min-h-[44px]",
                          "active:bg-muted/50 transition-colors text-left",
                        )}
                      >
                        {/* Member color dot */}
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            dotColorClass,
                          )}
                        />

                        {/* Event title */}
                        <span className="text-sm truncate flex-1">
                          {event.title}
                        </span>

                        {/* Time */}
                        {!event.isAllDay && (
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">
                            {event.startTime}
                          </span>
                        )}
                        {event.isAllDay && (
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">
                            All day
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SwipeContainer>
  );
}
