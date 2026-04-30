import { addDays, endOfDay, startOfDay } from "date-fns";
import { useMemo } from "react";
import { useCalendarEvents } from "@/api";
import { formatLocalDate, isEventOnDate } from "@/lib/time-utils";
import type { CalendarEvent } from "@/lib/types";
import { getEventDateTime } from "../lib/event-time";

function sortTodayEvents(left: CalendarEvent, right: CalendarEvent): number {
  if (left.isAllDay && !right.isAllDay) return -1;
  if (!left.isAllDay && right.isAllDay) return 1;

  return (
    getEventDateTime(left, "start").getTime() -
    getEventDateTime(right, "start").getTime()
  );
}

function sortByStartDateTime(
  left: CalendarEvent,
  right: CalendarEvent,
): number {
  return (
    getEventDateTime(left, "start").getTime() -
    getEventDateTime(right, "start").getTime()
  );
}

export function useDashboardEvents({
  currentDate = new Date(),
  memberFocusId = null,
}: {
  currentDate?: Date;
  memberFocusId?: string | null;
} = {}) {
  const dayStart = useMemo(() => startOfDay(currentDate), [currentDate]);
  const dayEnd = useMemo(() => endOfDay(dayStart), [dayStart]);
  const windowEnd = useMemo(() => endOfDay(addDays(dayStart, 2)), [dayStart]);
  const range = useMemo(
    () => ({
      startDate: formatLocalDate(dayStart),
      endDate: formatLocalDate(addDays(dayStart, 2)),
    }),
    [dayStart],
  );

  const { data, isLoading, isError, error } = useCalendarEvents(range);

  const filteredEvents = useMemo(() => {
    const events = data?.data ?? [];

    if (!memberFocusId) {
      return events;
    }

    return events.filter((event) => event.memberId === memberFocusId);
  }, [data, memberFocusId]);

  const today = useMemo(
    () =>
      filteredEvents
        .filter((event) => isEventOnDate(event, dayStart))
        .sort(sortTodayEvents),
    [dayStart, filteredEvents],
  );

  const comingUp = useMemo(
    () =>
      filteredEvents
        .filter((event) => {
          const eventStart = getEventDateTime(event, "start");
          return eventStart > dayEnd && eventStart <= windowEnd;
        })
        .sort(sortByStartDateTime)
        .slice(0, 3),
    [dayEnd, filteredEvents, windowEnd],
  );

  return {
    today,
    comingUp,
    isLoading,
    isError,
    error,
  };
}
