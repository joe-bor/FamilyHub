import { CALENDAR_START_HOUR, parseTime } from "@/lib/time-utils";
import type { CalendarEvent } from "@/lib/types";

/** Desktop hour-row height at tablet widths (768-1023px), matching today's grid. */
export const DEFAULT_HOUR_ROW_HEIGHT = 80;
/**
 * Denser hour-row height applied on lg+ (1024px+). Spec Section 3 calls for 48-56px so
 * 12-14 hours are visible at 1440x900; tuned during the screenshot gate (Task 8).
 */
export const DENSE_HOUR_ROW_HEIGHT = 52;

/** Minimum rendered event height so a short event stays tappable. */
export const MIN_EVENT_PX = 30;

/** 6 AM-11 PM row labels shared by the Week and Day grids (18 rows). */
export const TIME_SLOTS = [
  "6 AM",
  "7 AM",
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
  "9 PM",
  "10 PM",
  "11 PM",
] as const;

/** Row height for the current breakpoint. */
export function hourRowHeightFor(isLargeScreen: boolean): number {
  return isLargeScreen ? DENSE_HOUR_ROW_HEIGHT : DEFAULT_HOUR_ROW_HEIGHT;
}

export interface EventOffsets {
  startOffsetHours: number;
  spanHours: number;
}

/** Offsets (in hours from CALENDAR_START_HOUR) for an event's start and span. */
export function getEventOffsets(
  startTime: string,
  endTime: string,
): EventOffsets {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const startOffsetHours =
    start.hours - CALENDAR_START_HOUR + start.minutes / 60;
  const endOffsetHours = end.hours - CALENDAR_START_HOUR + end.minutes / 60;
  return { startOffsetHours, spanHours: endOffsetHours - startOffsetHours };
}

/** Absolute top/height in px for the given offsets at a row height. */
export function pxFromOffsets(
  { startOffsetHours, spanHours }: EventOffsets,
  rowHeight: number,
): { top: number; height: number } {
  return {
    top: startOffsetHours * rowHeight,
    height: Math.max(spanHours * rowHeight, MIN_EVENT_PX),
  };
}

/** Minutes from the start hour for a "9:30 AM"-style time string. */
export function minutesFromStartHour(
  timeStr: string,
  startHour: number,
): number {
  const { hours, minutes } = parseTime(timeStr);
  return (hours - startHour) * 60 + minutes;
}

/**
 * Earliest timed-event start (minutes from the start hour) across the given
 * events, ignoring all-day events. Returns null when there are no timed events.
 */
export function earliestEventStartMinutes(
  events: Pick<CalendarEvent, "startTime" | "isAllDay">[],
  startHour: number,
): number | null {
  const timed = events.filter((event) => !event.isAllDay);
  if (timed.length === 0) return null;
  return Math.min(
    ...timed.map((event) => minutesFromStartHour(event.startTime, startHour)),
  );
}
