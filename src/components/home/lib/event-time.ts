import { format24hTo12h, getTimeInMinutes } from "@/lib/time-utils";
import type { CalendarEvent } from "@/lib/types";

const TIME_24H_REGEX = /^([01]?\d|2[0-3]):[0-5]\d$/;

export function getEventTimeInMinutes(time: string): number {
  if (TIME_24H_REGEX.test(time)) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  return getTimeInMinutes(time);
}

export function getEventDateTime(
  event: CalendarEvent,
  boundary: "start" | "end",
): Date {
  const baseDate =
    boundary === "end" && event.endDate ? event.endDate : event.date;
  const time = boundary === "start" ? event.startTime : event.endTime;
  const minutes = getEventTimeInMinutes(time);
  const dateTime = new Date(baseDate);

  dateTime.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return dateTime;
}

export function formatEventTimeForDisplay(time: string): string {
  return TIME_24H_REGEX.test(time) ? format24hTo12h(time) : time;
}

/** Comparator ordering events by start time only, earliest first. */
export function compareByStartDateTime(
  left: CalendarEvent,
  right: CalendarEvent,
): number {
  return (
    getEventDateTime(left, "start").getTime() -
    getEventDateTime(right, "start").getTime()
  );
}

/** Comparator ordering all-day events before timed events, then by start time. */
export function compareAllDayFirst(
  left: CalendarEvent,
  right: CalendarEvent,
): number {
  if (left.isAllDay && !right.isAllDay) return -1;
  if (!left.isAllDay && right.isAllDay) return 1;
  return compareByStartDateTime(left, right);
}
