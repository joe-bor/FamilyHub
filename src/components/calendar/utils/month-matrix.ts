import { isEventOnDate } from "@/lib/time-utils";
import type { CalendarEvent, FamilyColor, FamilyMember } from "@/lib/types";

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

/** Distinct members with an event on each day, in family order. */
export function selectMonthDayMembers(
  events: CalendarEvent[],
  members: FamilyMember[],
): Map<string, FamilyMember[]> {
  const dayMemberIds = new Map<string, Set<string>>();
  for (const event of events) {
    for (const day of uniqueEventDays(event)) {
      const key = day.toDateString();
      if (!dayMemberIds.has(key)) dayMemberIds.set(key, new Set());
      dayMemberIds.get(key)?.add(event.memberId);
    }
  }

  const result = new Map<string, FamilyMember[]>();
  for (const [key, ids] of dayMemberIds) {
    const dayMembers = members.filter((member) => ids.has(member.id));
    if (dayMembers.length > 0) result.set(key, dayMembers);
  }
  return result;
}

export function selectMonthDayDots(
  events: CalendarEvent[],
  members: FamilyMember[],
): Map<string, FamilyColor[]> {
  const result = new Map<string, FamilyColor[]>();
  for (const [key, dayMembers] of selectMonthDayMembers(events, members)) {
    result.set(
      key,
      dayMembers.map((member) => member.color),
    );
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
