import { isEventOnDate } from "@/lib/time-utils";
import type { CalendarEvent, FamilyColor, FamilyMember } from "@/lib/types";

/** Fixed rail width when shown (spec Section 4.2, ~300px). Tunable in the screenshot gate. */
export const RAIL_WIDTH = 300;
/** Minimum comfortable member-lane width before the rail yields its space back. */
export const MIN_LANE_WIDTH = 190;
/** Time-axis gutter width (matches the `w-16` axis = 64px). */
export const TIME_AXIS_WIDTH = 64;
/**
 * Persistent desktop module-nav rail (`NavigationTabs`, `w-20` = 80px, rendered
 * `{!isMobile && <NavigationTabs/>}` in `App.tsx`) sits left of the calendar, so
 * the calendar's content box is `viewport - 80`. The threshold must include it.
 */
export const DESKTOP_NAV_WIDTH = 80;
/** Slack for lane borders/padding so the threshold is not razor-thin. */
export const RAIL_LAYOUT_SLACK = 48;

/**
 * Minimum viewport width at which the mini-month rail can appear for a family
 * of `memberCount`: desktop nav + time axis + lanes + rail + slack.
 */
export function railThresholdPx(memberCount: number): number {
  return (
    DESKTOP_NAV_WIDTH +
    TIME_AXIS_WIDTH +
    MIN_LANE_WIDTH * Math.max(memberCount, 1) +
    RAIL_WIDTH +
    RAIL_LAYOUT_SLACK
  );
}

export function buildMonthMatrix(currentDate: Date): Date[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const result: Date[] = [];
  const leading = firstDay.getDay();
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = leading - 1; i >= 0; i--) {
    result.push(new Date(year, month - 1, prevMonthLastDate - i));
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    result.push(new Date(year, month, d));
  }
  let nextDay = 1;
  while (result.length % 7 !== 0) {
    result.push(new Date(year, month + 1, nextDay++));
  }
  return result;
}

export function selectMonthDayDots(
  events: CalendarEvent[],
  members: FamilyMember[],
): Map<string, FamilyColor[]> {
  const dayMemberIds = new Map<string, Set<string>>();
  for (const event of events) {
    for (const day of uniqueEventDays(event)) {
      const key = day.toDateString();
      if (!dayMemberIds.has(key)) dayMemberIds.set(key, new Set());
      dayMemberIds.get(key)?.add(event.memberId);
    }
  }

  const result = new Map<string, FamilyColor[]>();
  for (const [key, ids] of dayMemberIds) {
    const colors = members.filter((m) => ids.has(m.id)).map((m) => m.color);
    if (colors.length > 0) result.set(key, colors);
  }
  return result;
}

function uniqueEventDays(event: CalendarEvent): Date[] {
  const days: Date[] = [event.date];
  if (event.endDate) {
    const cursor = new Date(event.date);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor <= event.endDate) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return days.filter((day) => isEventOnDate(event, day));
}
