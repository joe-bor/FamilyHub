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
import {
  compareEventsByTime,
  DAY_INITIALS,
  isEventOnDate,
} from "@/lib/time-utils";
import { type CalendarEvent, colorMap, type FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MOBILE_FAB_SCROLL_PADDING } from "../../components/floating-action-layout";
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
        className="grid shrink-0 grid-cols-7 border-b border-border bg-card"
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
                "relative flex min-h-16 flex-col items-center gap-1 px-1 py-2",
                "transition-colors active:bg-muted/50",
                isSelected && !today && "bg-muted/30",
              )}
            >
              {/* Day initial */}
              <span className="text-[10px] leading-none font-semibold text-muted-foreground">
                {DAY_INITIALS[index]}
              </span>

              {/* Date number */}
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm leading-none font-semibold",
                  today && "bg-primary text-primary-foreground",
                  !today && isSelected && "text-primary",
                )}
              >
                {format(day, "d")}
              </span>

              {/* TODAY label */}
              {today && (
                <span className="text-[8px] leading-none font-semibold uppercase text-primary">
                  Today
                </span>
              )}

              {/* Event color dots */}
              {memberColors.length > 0 && (
                <div className="flex min-h-[6px] items-center justify-center gap-0.5">
                  {memberColors.map((color) => (
                    <span
                      key={color}
                      className={cn("w-1 h-1 rounded-full", colorMap[color].bg)}
                    />
                  ))}
                </div>
              )}

              {/* Subtle chevron */}
              <ChevronRight className="absolute right-0.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-muted-foreground/50" />
            </button>
          );
        })}
      </nav>

      {/* Day-by-Day Event List */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: MOBILE_FAB_SCROLL_PADDING }}
      >
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
              <div className="flex w-[56px] min-w-[56px] shrink-0 flex-col items-center border-r border-border/50 pb-2 pt-3">
                <span className="text-[10px] leading-none font-semibold uppercase text-muted-foreground">
                  {format(day, "EEE")}
                </span>
                <span
                  className={cn(
                    "mt-1 text-base leading-none font-semibold",
                    today && "text-primary",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Events list (right column) */}
              <div className="flex-1 py-1.5">
                {dayEvents.length === 0 ? (
                  <div className="flex min-h-11 items-center px-3">
                    <span className="text-xs text-muted-foreground">
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
                          "flex min-h-11 w-full items-center gap-2 px-3",
                          "text-left transition-colors active:bg-muted/50",
                        )}
                      >
                        {/* Member color dot */}
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            dotColorClass,
                          )}
                        />

                        {/* Event title */}
                        <span className="flex-1 truncate text-[15px] leading-5">
                          {event.title}
                        </span>

                        {/* Time */}
                        {!event.isAllDay && (
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                            {event.startTime}
                          </span>
                        )}
                        {event.isAllDay && (
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
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
