import { endOfWeek, format, startOfWeek } from "date-fns";
import type { CalendarViewType } from "@/lib/types";

/**
 * Human-readable label describing the calendar's current view + date context
 * (e.g. "June 2026", "Jun 1 – 7", "Mon, Jun 1", "Upcoming"). Shared by the
 * module-aware app header and the calendar mobile toolbar so both render one
 * consistent label.
 */
export function getContextLabel(
  calendarView: CalendarViewType,
  currentDate: Date,
): string {
  switch (calendarView) {
    case "monthly":
      return format(currentDate, "MMMM yyyy");
    case "weekly": {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
      return sameMonth
        ? `${format(weekStart, "MMM d")} – ${format(weekEnd, "d")}`
        : `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`;
    }
    case "daily":
      return format(currentDate, "EEE, MMM d");
    case "schedule":
      return "Upcoming";
    default:
      return format(currentDate, "MMMM yyyy");
  }
}
