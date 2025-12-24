/**
 * Shared time parsing utilities for calendar components.
 * Centralizes time parsing logic and compiles regex once for reuse.
 */

import { format, parseISO, startOfDay } from "date-fns";

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

/**
 * Convert 24-hour time format to 12-hour format with AM/PM.
 * Example: "16:00" -> "4:00 PM", "09:30" -> "9:30 AM"
 */
export function format24hTo12h(time24h: string): string {
  const [hours, minutes] = time24h.split(":");
  const hour = Number.parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Convert 12-hour time format to 24-hour format.
 * Example: "4:00 PM" -> "16:00", "9:30 AM" -> "09:30"
 */
export function format12hTo24h(time12h: string): string {
  const { hours, minutes } = parseTime(time12h);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Format a Date to a local date string (yyyy-MM-dd).
 * Uses date-fns format() which respects local timezone,
 * avoiding the timezone shift bug from toISOString().
 */
export function formatLocalDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Parse a date string (yyyy-MM-dd) to a local Date at midnight.
 * Uses date-fns to ensure consistent local timezone handling,
 * avoiding the browser-specific quirk of appending "T00:00:00".
 */
export function parseLocalDate(dateStr: string): Date {
  return startOfDay(parseISO(dateStr));
}
