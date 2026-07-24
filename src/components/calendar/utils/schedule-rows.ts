import { addDays } from "date-fns";
import { compareEventsAllDayFirst, isEventOnDate } from "@/lib/time-utils";
import type { CalendarEvent } from "@/lib/types";
import type { FilterState } from "../components/calendar-filter";

export type ScheduleRow =
  | { kind: "day"; date: Date; events: CalendarEvent[] }
  | { kind: "gap"; start: Date; end: Date };

/** Whether any unfiltered event intersects offsets 0..dayCount-1. */
export function hasScheduleWindowEvents(
  events: CalendarEvent[],
  startDate: Date,
  dayCount: number,
): boolean {
  return Array.from({ length: dayCount }, (_, offset) =>
    addDays(startDate, offset),
  ).some((day) => events.some((event) => isEventOnDate(event, day)));
}

/**
 * Day rows for populated days, and one gap row per consecutive run of
 * event-free days. Runs are computed only within the window and clipped to it,
 * with no special leading or trailing case. Returns an empty array when every
 * day is empty, so the caller can render the whole-view empty state instead.
 */
export function buildScheduleRows({
  events,
  startDate,
  dayCount,
  filter,
}: {
  events: CalendarEvent[];
  startDate: Date;
  dayCount: number;
  filter: FilterState;
}): ScheduleRow[] {
  const days: { date: Date; events: CalendarEvent[] }[] = [];

  for (let offset = 0; offset < dayCount; offset++) {
    const date = addDays(startDate, offset);

    const dayEvents = events
      .filter(
        (event) =>
          isEventOnDate(event, date) &&
          filter.selectedMembers.includes(event.memberId) &&
          (filter.showAllDayEvents || !event.isAllDay),
      )
      .sort(compareEventsAllDayFirst);

    days.push({ date, events: dayEvents });
  }

  if (days.every((day) => day.events.length === 0)) return [];

  const rows: ScheduleRow[] = [];
  let gapStart: Date | null = null;

  for (const day of days) {
    if (day.events.length === 0) {
      if (!gapStart) gapStart = day.date;
      continue;
    }
    if (gapStart) {
      const previous = addDays(day.date, -1);
      rows.push({ kind: "gap", start: gapStart, end: previous });
      gapStart = null;
    }
    rows.push({ kind: "day", date: day.date, events: day.events });
  }

  if (gapStart) {
    rows.push({
      kind: "gap",
      start: gapStart,
      end: days[days.length - 1].date,
    });
  }

  return rows;
}
