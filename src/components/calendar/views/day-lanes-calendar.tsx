import { endOfMonth, startOfMonth } from "date-fns";
import { useMemo, useRef } from "react";
import { useCalendarEvents } from "@/api";
import {
  CALENDAR_START_HOUR,
  compareEventsByTime,
  formatLocalDate,
  getEventKey,
  isEventOnDate,
} from "@/lib/time-utils";
import type { CalendarEvent, FamilyMember, FilterState } from "@/lib/types";
import { colorMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CalendarEventCard } from "../components/calendar-event";
import {
  CurrentTimeIndicator,
  useAutoScrollToMinutes,
} from "../components/current-time-indicator";
import { DayMiniMonthRail } from "../components/day-mini-month-rail";
import { MemberAvatar } from "../components/member-avatar";
import {
  DENSE_HOUR_ROW_HEIGHT,
  getEventOffsets,
  pxFromOffsets,
  TIME_SLOTS,
} from "../utils/hour-grid";
import { calculateEventColumns } from "./day-lane-layout";

interface DayLanesCalendarProps {
  events: CalendarEvent[];
  currentDate: Date;
  members: FamilyMember[];
  filter: FilterState;
  showRail: boolean;
  onEventClick: (event: CalendarEvent) => void;
  onSelectDate: (date: Date) => void;
}

const ROW_HEIGHT = DENSE_HOUR_ROW_HEIGHT;

function isCurrentDay(date: Date): boolean {
  return date.toDateString() === new Date().toDateString();
}

function groupByMember(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const memberEvents = groups.get(event.memberId) ?? [];
    memberEvents.push(event);
    groups.set(event.memberId, memberEvents);
  }
  return groups;
}

function eventMatchesFilter(
  event: CalendarEvent,
  filter: FilterState,
  includeAllDay: boolean,
): boolean {
  return (
    filter.selectedMembers.includes(event.memberId) &&
    (includeAllDay || !event.isAllDay)
  );
}

function DayRailPanel({
  currentDate,
  members,
  filter,
  onSelectDate,
}: {
  currentDate: Date;
  members: FamilyMember[];
  filter: FilterState;
  onSelectDate: (date: Date) => void;
}) {
  const monthRange = useMemo(
    () => ({
      startDate: formatLocalDate(startOfMonth(currentDate)),
      endDate: formatLocalDate(endOfMonth(currentDate)),
    }),
    [currentDate],
  );
  const { data } = useCalendarEvents(monthRange);
  const monthEvents = useMemo(
    () =>
      (data?.data ?? []).filter((event) =>
        eventMatchesFilter(event, filter, filter.showAllDayEvents),
      ),
    [data?.data, filter],
  );

  return (
    <DayMiniMonthRail
      currentDate={currentDate}
      monthEvents={monthEvents}
      members={members}
      onSelectDate={onSelectDate}
    />
  );
}

export function DayLanesCalendar({
  events,
  currentDate,
  members,
  filter,
  showRail,
  onEventClick,
  onSelectDate,
}: DayLanesCalendarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const today = isCurrentDay(currentDate);
  const laneTemplate = `repeat(${Math.max(members.length, 1)}, minmax(0, 1fr))`;
  const autoScrollMinutes = useMemo(() => {
    if (!today) return null;
    const now = new Date();
    return Math.max(
      0,
      (now.getHours() - CALENDAR_START_HOUR) * 60 + now.getMinutes(),
    );
  }, [today]);

  useAutoScrollToMinutes(scrollContainerRef, autoScrollMinutes, ROW_HEIGHT);

  const { timedEventsByMember, allDayEventsByMember } = useMemo(() => {
    const dayEvents = events
      .filter(
        (event) =>
          isEventOnDate(event, currentDate) &&
          eventMatchesFilter(event, filter, filter.showAllDayEvents),
      )
      .sort(compareEventsByTime);

    return {
      timedEventsByMember: groupByMember(
        dayEvents.filter((event) => !event.isAllDay),
      ),
      allDayEventsByMember: groupByMember(
        filter.showAllDayEvents
          ? dayEvents.filter((event) => event.isAllDay)
          : [],
      ),
    };
  }, [events, currentDate, filter]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 border-b border-border bg-card">
          <div className="w-14 shrink-0 border-r border-border" />
          <div
            className="grid min-w-0 flex-1"
            style={{ gridTemplateColumns: laneTemplate }}
          >
            {members.map((member) => {
              const colors = colorMap[member.color];
              return (
                <div
                  key={member.id}
                  className="min-w-0 border-r border-border px-3 py-3 last:border-r-0"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <MemberAvatar
                      name={member.name}
                      color={member.color}
                      size="md"
                    />
                    <span className="truncate text-sm font-semibold text-foreground">
                      {member.name}
                    </span>
                  </div>
                  <div
                    className={cn("mt-2 h-1 rounded-full", colors.bg)}
                    aria-hidden="true"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {filter.showAllDayEvents && (
          <fieldset
            aria-label="All-day events"
            className="m-0 flex shrink-0 border-0 border-b border-border bg-card p-0"
          >
            <div className="flex w-14 shrink-0 items-center justify-end border-r border-border pr-2">
              <span className="text-[11px] font-medium text-muted-foreground">
                All Day
              </span>
            </div>
            <div
              className="grid min-w-0 flex-1"
              style={{ gridTemplateColumns: laneTemplate }}
            >
              {members.map((member) => (
                <div
                  key={member.id}
                  className="min-h-12 min-w-0 border-r border-border p-2 last:border-r-0"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {(allDayEventsByMember.get(member.id) ?? []).map(
                      (event) => {
                        const colors = colorMap[member.color];
                        return (
                          <button
                            type="button"
                            key={getEventKey(event)}
                            onClick={() => onEventClick(event)}
                            title={event.title}
                            aria-label={`${event.title} - All day event`}
                            className={cn(
                              "max-w-full truncate rounded-full px-2.5 py-1 text-xs font-medium text-white transition-all hover:scale-105 hover:shadow-sm",
                              colors.bg,
                            )}
                          >
                            {event.title}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        )}

        <div
          className="flex min-h-0 flex-1 overflow-y-auto"
          ref={scrollContainerRef}
        >
          <div className="w-14 shrink-0 border-r border-border bg-card">
            {TIME_SLOTS.map((time) => (
              <div
                key={time}
                className="flex items-start justify-end border-b border-border/50 pr-2 pt-1"
                style={{ height: ROW_HEIGHT }}
              >
                <span className="text-xs font-semibold text-foreground/70">
                  {time}
                </span>
              </div>
            ))}
          </div>

          <div
            data-testid="day-lanes-grid"
            className={cn(
              "relative grid min-w-0 flex-1",
              today && "bg-primary/5",
            )}
            style={{ gridTemplateColumns: laneTemplate }}
          >
            {members.map((member) => {
              const memberEvents = timedEventsByMember.get(member.id) ?? [];
              const eventsWithLayout = calculateEventColumns(memberEvents);

              return (
                <fieldset
                  key={member.id}
                  aria-label={`${member.name}'s schedule`}
                  className="relative m-0 min-w-0 border-0 border-r border-border p-0 last:border-r-0"
                >
                  {TIME_SLOTS.map((time, index) => (
                    <div
                      key={time}
                      className={cn(
                        "border-b border-border/50",
                        index % 2 === 0 && "bg-muted/30",
                      )}
                      style={{ height: ROW_HEIGHT }}
                    />
                  ))}

                  {eventsWithLayout.map((event) => {
                    const { top, height } = pxFromOffsets(
                      getEventOffsets(event.startTime, event.endTime),
                      ROW_HEIGHT,
                    );
                    const effectiveColumns = Math.min(event.totalColumns, 3);
                    const columnWidth = 100 / effectiveColumns;
                    const visibleColumn = Math.min(event.column, 2);
                    const left = visibleColumn * columnWidth;
                    const variant =
                      event.totalColumns >= 3 ? "compact" : "default";

                    return (
                      <div
                        key={getEventKey(event)}
                        data-testid="day-lane-event"
                        className="absolute overflow-hidden rounded-xl"
                        style={{
                          top,
                          height,
                          left: `calc(${left}% + 6px)`,
                          width: `calc(${columnWidth}% - 10px)`,
                        }}
                      >
                        <CalendarEventCard
                          event={event}
                          onClick={() => onEventClick(event)}
                          variant={variant}
                        />
                      </div>
                    );
                  })}
                </fieldset>
              );
            })}

            {today && (
              <div className="pointer-events-none absolute inset-0">
                <CurrentTimeIndicator
                  startHour={CALENDAR_START_HOUR}
                  rowHeight={ROW_HEIGHT}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {showRail && (
        <DayRailPanel
          currentDate={currentDate}
          members={members}
          filter={filter}
          onSelectDate={onSelectDate}
        />
      )}
    </div>
  );
}
