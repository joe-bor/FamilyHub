import {
  addDays,
  format,
  isBefore,
  isSameMonth,
  isSameYear,
  startOfToday,
} from "date-fns";
import { Clock, MapPin } from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { useFamilyMembers } from "@/api";
import { useIsLargeScreen, useIsMobile } from "@/hooks";
import {
  compareEventsAllDayFirst,
  formatLocalDate,
  getEventKey,
  isEventOnDate,
} from "@/lib/time-utils";
import { type CalendarEvent, colorMap, getFamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { FilterState } from "../components/calendar-filter";
import {
  CalendarEmptyState,
  CalendarErrorState,
} from "../components/calendar-view-states";
import { MOBILE_FAB_SCROLL_PADDING } from "../components/floating-action-layout";
import { MemberAvatar } from "../components/member-avatar";
import {
  buildScheduleRows,
  hasScheduleWindowEvents,
} from "../utils/schedule-rows";

interface ScheduleCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  filter: FilterState;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  /** Raw-query reason signal; the compact branch ignores it. */
  hasUnfilteredEventsInWindow?: boolean;
}

/**
 * Breakpoint dispatcher. Below 1024px this renders the shipped compact
 * composition unchanged — it is the smart default for first-time mobile users,
 * so its markup is a hard parity contract.
 */
export function ScheduleCalendar(props: ScheduleCalendarProps) {
  const isLargeScreen = useIsLargeScreen();
  if (!isLargeScreen) return <ScheduleCalendarCompact {...props} />;
  return <ScheduleCalendarLarge {...props} />;
}

function ScheduleCalendarCompact({
  events,
  currentDate,
  onEventClick,
  filter,
}: ScheduleCalendarProps) {
  const familyMembers = useFamilyMembers();
  const isMobile = useIsMobile();
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
          const dateMatches = isEventOnDate(event, date);
          const memberMatches = filter.selectedMembers.includes(event.memberId);
          const allDayMatches = filter.showAllDayEvents || !event.isAllDay;
          return dateMatches && memberMatches && allDayMatches;
        })
        .sort(compareEventsAllDayFirst);

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

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) return `Today \u2014 ${format(date, "EEE, MMM d")}`;
    if (isTomorrow(date))
      return `Tomorrow \u2014 ${format(date, "EEE, MMM d")}`;
    return format(date, "EEEE, MMM d");
  };

  return (
    <div
      className="scroll-pt-12 flex-1 overflow-y-auto bg-background p-4"
      style={{
        paddingBottom: isMobile ? MOBILE_FAB_SCROLL_PADDING : undefined,
      }}
    >
      {groupedEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Calendar className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">No upcoming events</p>
          <p className="text-sm">
            Events for the next 2 weeks will appear here
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-5">
          {groupedEvents.map(({ date, events: dayEvents }) => (
            <div key={formatLocalDate(date)}>
              {/* Date header - sticky with colored background for Today */}
              <div
                className={cn(
                  "sticky top-0 z-10 mb-3 rounded-xl px-3 py-2.5",
                  "flex items-center gap-2",
                  isToday(date)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/80",
                )}
              >
                <span className="font-semibold">{formatDateHeader(date)}</span>
              </div>

              {/* Events list - simplified cards with colored left border */}
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const member = getFamilyMember(familyMembers, event.memberId);
                  return (
                    <button
                      type="button"
                      key={getEventKey(event)}
                      onClick={() => onEventClick?.(event)}
                      // The border colour has to be an inline style, exactly as
                      // in the lg+ branch. Passing `colorMap[x].bg` through
                      // `cn()` alongside `colorMap[x].light` does not work:
                      // both are `bg-*` utilities, so twMerge treats them as
                      // conflicting and keeps only the last, leaving no border
                      // colour at all. Reordering only swaps which background
                      // wins; an inline style is what twMerge cannot collapse.
                      style={{
                        borderLeftColor: member
                          ? colorMap[member.color].hex
                          : undefined,
                      }}
                      className={cn(
                        "flex min-h-14 w-full cursor-pointer items-center rounded-xl p-3 text-left",
                        "transition-all hover:shadow-md hover:scale-[1.005]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                        "border-l-4 ring-1 ring-inset ring-black/5",
                        // `border-muted-foreground` is a border utility, so the
                        // member-less row never had the collision and already
                        // rendered as intended. It keeps its shipped classes.
                        member
                          ? colorMap[member.color].light
                          : "border-muted-foreground bg-muted",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="truncate text-[17px] leading-6 font-semibold text-foreground">
                          {event.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-2 text-sm leading-5 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {event.isAllDay
                                ? "All day"
                                : `${event.startTime} - ${event.endTime}`}
                            </span>
                          </div>
                          {event.location && (
                            <>
                              <span className="text-muted-foreground/50">
                                ·
                              </span>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="truncate">
                                  {event.location}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {member && (
                        <MemberAvatar
                          name={member.name}
                          color={member.color}
                          size="md"
                        />
                      )}
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

const SCHEDULE_GUTTER_WIDTH = 168;

const sameDate = (a: Date, b: Date) =>
  formatLocalDate(a) === formatLocalDate(b);

function relativeDayLabel(date: Date, today: Date): string {
  if (sameDate(date, today)) return "Today";
  if (sameDate(date, addDays(today, 1))) return "Tomorrow";
  return format(date, "EEEE");
}

function dayRegionLabel(date: Date, today: Date, count: number): string {
  const relative = relativeDayLabel(date, today);
  const dateLabel = format(date, "EEEE MMMM d, yyyy");
  const prefix =
    relative === "Today" || relative === "Tomorrow"
      ? `${relative}, ${dateLabel}`
      : dateLabel;
  return `${prefix}, ${count} ${count === 1 ? "event" : "events"}`;
}

function gapLabel(start: Date, end: Date): string {
  if (sameDate(start, end)) return format(start, "EEE, MMM d");
  if (!isSameYear(start, end)) {
    return `${format(start, "EEE, MMM d, yyyy")} – ${format(end, "EEE, MMM d, yyyy")}`;
  }
  if (!isSameMonth(start, end)) {
    return `${format(start, "EEE, MMM d")} – ${format(end, "EEE, MMM d")}`;
  }
  return `${format(start, "EEE d")} – ${format(end, "EEE d")}`;
}

function gapAriaLabel(start: Date, end: Date): string {
  if (sameDate(start, end)) {
    return `${format(start, "EEEE MMMM d, yyyy")}, nothing scheduled`;
  }
  return `${format(start, "EEEE MMMM d, yyyy")} to ${format(end, "EEEE MMMM d, yyyy")}, nothing scheduled`;
}

function ScheduleSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading schedule"
      className="flex w-full flex-col gap-4 p-4"
    >
      {Array.from({ length: 4 }).map((_, group) => (
        <div
          key={group}
          className="grid gap-4"
          style={{
            gridTemplateColumns: `${SCHEDULE_GUTTER_WIDTH}px minmax(0, 1fr)`,
          }}
        >
          <div className="h-10 animate-pulse rounded-lg bg-muted/60 motion-reduce:animate-none" />
          <div className="flex flex-col gap-2">
            <div className="h-14 animate-pulse rounded-xl bg-muted/40 motion-reduce:animate-none" />
            <div className="h-14 animate-pulse rounded-xl bg-muted/40 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleCalendarLarge({
  events,
  currentDate,
  onEventClick,
  filter,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
  hasUnfilteredEventsInWindow = hasScheduleWindowEvents(
    events,
    currentDate,
    14,
  ),
}: ScheduleCalendarProps) {
  const familyMembers = useFamilyMembers();
  const today = startOfToday();
  const rows = useMemo(
    () =>
      buildScheduleRows({
        events,
        startDate: currentDate,
        dayCount: 14,
        filter,
      }),
    // `buildScheduleRows` captures the whole filter object, so the dependency
    // is `filter` itself rather than its two fields. The store replaces the
    // object on every filter change, so this is no less precise.
    [events, currentDate, filter],
  );

  if (isError) {
    return <CalendarErrorState message={errorMessage} onRetry={onRetry} />;
  }
  if (isLoading) return <ScheduleSkeleton />;

  if (rows.length === 0) {
    if (familyMembers.length === 0) {
      return (
        <CalendarEmptyState
          title="No family members yet"
          description="Add a family member to start seeing their events."
        />
      );
    }
    if (filter.selectedMembers.length === 0) {
      return (
        <CalendarEmptyState
          title="Select at least one profile to view events"
          description="Choose a family member to see their events."
        />
      );
    }
    if (hasUnfilteredEventsInWindow) {
      return (
        <CalendarEmptyState
          title="No events match your filters"
          description="Adjust the member or all-day filters to see more events."
        />
      );
    }
    return (
      <CalendarEmptyState
        title="No upcoming events"
        description="Nothing scheduled in the next 2 weeks."
      />
    );
  }

  return (
    <div
      data-testid="schedule-scroll-surface"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background p-4"
    >
      <div className="w-full space-y-1">
        {rows.map((row) => {
          if (row.kind === "gap") {
            return (
              // biome-ignore lint/a11y/useSemanticElements: a gap row groups no form controls, so <fieldset> is wrong; role="group" carries the announced range
              <div
                key={`gap-${formatLocalDate(row.start)}`}
                role="group"
                aria-label={gapAriaLabel(row.start, row.end)}
                className="grid gap-4 border-t border-border py-3"
                style={{
                  gridTemplateColumns: `${SCHEDULE_GUTTER_WIDTH}px minmax(0, 1fr)`,
                }}
              >
                <p
                  aria-hidden="true"
                  className="text-sm font-medium text-muted-foreground"
                >
                  {gapLabel(row.start, row.end)}
                </p>
                <p
                  aria-hidden="true"
                  className="text-sm italic text-muted-foreground"
                >
                  Nothing scheduled
                </p>
              </div>
            );
          }

          const relative = relativeDayLabel(row.date, today);
          const isPast = isBefore(row.date, today);
          return (
            <section
              key={formatLocalDate(row.date)}
              aria-label={dayRegionLabel(row.date, today, row.events.length)}
              className={cn(
                "grid gap-4 border-t py-3",
                isPast ? "border-border/40" : "border-border",
              )}
              style={{
                gridTemplateColumns: `${SCHEDULE_GUTTER_WIDTH}px minmax(0, 1fr)`,
              }}
            >
              <div
                data-testid="schedule-date-gutter"
                className="sticky top-0 z-10 self-start bg-background/95 py-1"
              >
                <p
                  className={cn(
                    "text-sm font-bold uppercase tracking-wide",
                    sameDate(row.date, today)
                      ? "text-primary"
                      : "text-muted-foreground",
                    isPast && "font-medium",
                  )}
                >
                  {relative}
                </p>
                <p className="text-sm font-semibold">
                  {format(row.date, "EEE, MMM d")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {row.events.length}{" "}
                  {row.events.length === 1 ? "event" : "events"}
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                {row.events.map((event) => {
                  const member = getFamilyMember(familyMembers, event.memberId);
                  return (
                    <button
                      type="button"
                      key={getEventKey(event)}
                      onClick={() => onEventClick?.(event)}
                      style={{
                        borderLeftColor: member
                          ? colorMap[member.color].hex
                          : undefined,
                      }}
                      className={cn(
                        "flex min-h-14 w-full cursor-pointer items-center gap-4 rounded-xl border-l-4 p-3 text-left",
                        "ring-1 ring-inset ring-black/5 transition-all hover:scale-[1.005] hover:shadow-md motion-reduce:transition-none motion-reduce:hover:scale-100",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                        member ? colorMap[member.color].light : "bg-muted",
                      )}
                    >
                      <div className="min-w-0 max-w-[72ch] flex-1">
                        <h3 className="truncate text-xl leading-6 font-semibold text-foreground">
                          {event.title}
                        </h3>
                        <div
                          data-testid="schedule-event-metadata"
                          className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm leading-5 text-muted-foreground"
                        >
                          <span className="flex items-center gap-1">
                            <Clock aria-hidden="true" className="size-3.5" />
                            {event.isAllDay
                              ? "All day"
                              : `${event.startTime} - ${event.endTime}`}
                          </span>
                          {event.location && (
                            <span className="flex min-w-0 items-center gap-1">
                              <MapPin
                                aria-hidden="true"
                                className="size-3.5 shrink-0"
                              />
                              <span className="truncate">{event.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {/*
                        An event can outlive the member it names — the calendar
                        store persists `filter.selectedMembers`, so a stale id
                        still passes the filter. Without a fallback the row
                        would carry no member identity in any channel: the
                        border falls back to the default colour and the
                        background to `bg-muted`. The wording matches
                        month-overflow-popover.tsx. The avatar is dropped
                        rather than given a stand-in colour, because
                        `MemberAvatar` needs a real `FamilyColor`.
                      */}
                      <span className="ml-auto flex shrink-0 items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {member?.name ?? "Unknown member"}
                        </span>
                        {member && (
                          <MemberAvatar
                            name={member.name}
                            color={member.color}
                            size="md"
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
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
