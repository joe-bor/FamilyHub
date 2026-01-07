import { Clock, MapPin } from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { useFamilyMembers } from "@/api";
import { compareEventsByTime, formatLocalDate } from "@/lib/time-utils";
import { type CalendarEvent, colorMap, getFamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { FilterState } from "../components/calendar-filter";

interface ScheduleCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  filter: FilterState;
}

export function ScheduleCalendar({
  events,
  currentDate,
  onEventClick,
  filter,
}: ScheduleCalendarProps) {
  const familyMembers = useFamilyMembers();
  const today = new Date();

  // Memoize grouped events for the next 14 days
  // Fixed buggy time sorting (was using broken parseInt logic)
  const groupedEvents = useMemo(() => {
    const grouped: { date: Date; events: CalendarEvent[] }[] = [];

    for (let i = 0; i < 14; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);

      const dayEvents = events
        .filter((event) => {
          const eventDate = new Date(event.date);
          const dateMatches = eventDate.toDateString() === date.toDateString();
          const memberMatches = filter.selectedMembers.includes(event.memberId);
          const allDayMatches = filter.showAllDayEvents || !event.isAllDay;
          return dateMatches && memberMatches && allDayMatches;
        })
        .sort(compareEventsByTime); // Fixed: use proper time comparison

      if (dayEvents.length > 0) {
        grouped.push({ date, events: dayEvents });
      }
    }

    return grouped;
  }, [events, currentDate, filter.selectedMembers, filter.showAllDayEvents]);

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return date.toLocaleDateString("en-US", {
      weekday: "long",
    });
  };

  const formatDateSuffix = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 scroll-pt-12">
      {groupedEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Calendar className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">No upcoming events</p>
          <p className="text-sm">
            Events for the next 2 weeks will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl mx-auto">
          {groupedEvents.map(({ date, events: dayEvents }) => (
            <div key={formatLocalDate(date)}>
              {/* Date header - sticky with colored background for Today */}
              <div
                className={cn(
                  "sticky top-0 z-10 py-2 px-3 mb-3 rounded-lg",
                  "flex items-center gap-2",
                  isToday(date)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/80",
                )}
              >
                <span className="font-semibold">{formatDateLabel(date)}</span>
                <span
                  className={cn(
                    "text-sm font-normal",
                    isToday(date)
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  · {formatDateSuffix(date)}
                </span>
              </div>

              {/* Events list - simplified cards with colored left border */}
              <div className="space-y-1.5">
                {dayEvents.map((event) => {
                  const member = getFamilyMember(familyMembers, event.memberId);
                  return (
                    <button
                      type="button"
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className={cn(
                        "flex flex-col p-3 rounded-lg cursor-pointer text-left w-full",
                        "transition-all hover:shadow-md hover:scale-[1.005]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                        "border-l-4 ring-1 ring-inset ring-black/5",
                        member
                          ? colorMap[member.color]?.bg
                          : "border-muted-foreground",
                        member ? colorMap[member.color]?.light : "bg-muted",
                      )}
                    >
                      <h3 className="font-semibold text-foreground truncate">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {event.startTime} - {event.endTime}
                          </span>
                        </div>
                        {event.location && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Calendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}
