import type { CalendarEvent, CreateEventRequest } from "@/lib/types";
import { testMembers } from "./family";

/**
 * Today's date at midnight (for consistent test dates).
 */
export const today = new Date();
today.setHours(0, 0, 0, 0);

/**
 * Create a date relative to today.
 */
export function getRelativeDate(daysFromToday: number): Date {
  const date = new Date(today);
  date.setDate(date.getDate() + daysFromToday);
  return date;
}

/**
 * Test events for various scenarios.
 */
export const testEvents: CalendarEvent[] = [
  {
    id: "event-1",
    title: "Morning Meeting",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
    date: today,
    memberId: testMembers[0].id,
  },
  {
    id: "event-2",
    title: "Lunch with Team",
    startTime: "12:00 PM",
    endTime: "1:00 PM",
    date: today,
    memberId: testMembers[1].id,
    location: "Downtown Cafe",
  },
  {
    id: "event-3",
    title: "Soccer Practice",
    startTime: "4:00 PM",
    endTime: "5:30 PM",
    date: today,
    memberId: testMembers[2].id,
  },
  {
    id: "event-4",
    title: "All Day Event",
    startTime: "12:00 AM",
    endTime: "11:59 PM",
    date: today,
    memberId: testMembers[0].id,
    isAllDay: true,
  },
];

/**
 * Single test event for simpler tests.
 */
export const testEvent: CalendarEvent = testEvents[0];

/**
 * Test event for tomorrow.
 */
export const tomorrowEvent: CalendarEvent = {
  id: "event-tomorrow",
  title: "Tomorrow's Meeting",
  startTime: "10:00 AM",
  endTime: "11:00 AM",
  date: getRelativeDate(1),
  memberId: testMembers[0].id,
};

/**
 * Test event for yesterday.
 */
export const yesterdayEvent: CalendarEvent = {
  id: "event-yesterday",
  title: "Yesterday's Event",
  startTime: "2:00 PM",
  endTime: "3:00 PM",
  date: getRelativeDate(-1),
  memberId: testMembers[1].id,
};

/**
 * Create a custom test event with overrides.
 */
export function createTestEvent(
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id: `event-${Date.now()}`,
    title: "Test Event",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
    date: today,
    memberId: testMembers[0].id,
    ...overrides,
  };
}

/**
 * Create a valid CreateEventRequest for API testing.
 */
export function createEventRequest(
  overrides: Partial<CreateEventRequest> = {},
): CreateEventRequest {
  const date = overrides.date ?? today.toISOString().split("T")[0];
  return {
    title: "New Event",
    startTime: "2:00 PM",
    endTime: "3:00 PM",
    date,
    memberId: testMembers[0].id,
    ...overrides,
  };
}

/**
 * Events for a full week of testing.
 */
export function createWeekOfEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (let i = 0; i < 7; i++) {
    events.push({
      id: `week-event-${i}`,
      title: `Day ${i} Event`,
      startTime: "10:00 AM",
      endTime: "11:00 AM",
      date: getRelativeDate(i),
      memberId: testMembers[i % testMembers.length].id,
    });
  }
  return events;
}
