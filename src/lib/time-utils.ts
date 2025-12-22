/**
 * Shared time parsing utilities for calendar components.
 * Centralizes time parsing logic and compiles regex once for reuse.
 */

// Compile regex once, reuse across all calls
const TIME_REGEX = /(\d+):(\d+)\s*(AM|PM)/i;

export interface ParsedTime {
  hours: number;
  minutes: number;
}

/**
 * Parse a time string like "9:30 AM" or "2:00 PM" into hours (24h) and minutes.
 */
export function parseTime(timeStr: string): ParsedTime {
  const match = timeStr.match(TIME_REGEX);
  if (!match) {
    return { hours: 0, minutes: 0 };
  }

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  // Convert to 24-hour format
  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

/**
 * Convert a time string to total minutes since midnight.
 * Useful for sorting and comparing events.
 */
export function getTimeInMinutes(timeStr: string): number {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

/**
 * Compare two events by their start time.
 * Use as a comparator function for Array.sort().
 */
export function compareEventsByTime(
  a: { startTime: string },
  b: { startTime: string },
): number {
  return getTimeInMinutes(a.startTime) - getTimeInMinutes(b.startTime);
}
