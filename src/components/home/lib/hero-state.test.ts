import type { CalendarEvent } from "@/lib/types";
import { deriveHeroState } from "./hero-state";

const baseDate = new Date(2026, 3, 25);

function at(hours: number, minutes = 0) {
  return new Date(2026, 3, 25, hours, minutes, 0, 0);
}

function createEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: overrides.id ?? "event-1",
    title: overrides.title ?? "Test Event",
    startTime: overrides.startTime ?? "9:00 AM",
    endTime: overrides.endTime ?? "10:00 AM",
    date: overrides.date ?? baseDate,
    endDate: overrides.endDate,
    memberId: overrides.memberId ?? "member-1",
    isAllDay: overrides.isAllDay ?? false,
    location: overrides.location,
    source: overrides.source ?? "NATIVE",
    description: overrides.description,
    recurrenceRule: overrides.recurrenceRule,
    recurringEventId: overrides.recurringEventId,
    isRecurring: overrides.isRecurring,
    htmlLink: overrides.htmlLink,
  };
}

describe("deriveHeroState", () => {
  it("returns ALL_CLEAR_TODAY when there are no events", () => {
    expect(deriveHeroState({ todayEvents: [], now: at(9) })).toEqual({
      kind: "ALL_CLEAR_TODAY",
    });
  });

  it("returns RIGHT_NOW for an in-progress timed event", () => {
    const current = createEvent();

    expect(deriveHeroState({ todayEvents: [current], now: at(9, 30) })).toEqual(
      {
        kind: "RIGHT_NOW",
        event: current,
      },
    );
  });

  it("returns UP_NEXT for the next future timed event", () => {
    const past = createEvent({
      id: "past",
      startTime: "7:00 AM",
      endTime: "8:00 AM",
    });
    const next = createEvent({
      id: "next",
      startTime: "14:00",
      endTime: "15:00",
    });

    expect(deriveHeroState({ todayEvents: [past, next], now: at(12) })).toEqual(
      {
        kind: "UP_NEXT",
        event: next,
      },
    );
  });

  it("returns ALL_DAY_ONLY when only all-day events exist", () => {
    const allDay = createEvent({
      id: "all-day",
      isAllDay: true,
      startTime: "00:00",
      endTime: "23:59",
    });

    expect(deriveHeroState({ todayEvents: [allDay], now: at(12) })).toEqual({
      kind: "ALL_DAY_ONLY",
      event: allDay,
    });
  });

  it("returns REST_OF_DAY_CLEAR when timed events already ended, even with all-day events present", () => {
    const past = createEvent({
      id: "past",
      startTime: "7:00 AM",
      endTime: "8:00 AM",
    });
    const allDay = createEvent({
      id: "all-day",
      isAllDay: true,
      startTime: "12:00 AM",
      endTime: "11:59 PM",
    });

    expect(
      deriveHeroState({ todayEvents: [past, allDay], now: at(12) }),
    ).toEqual({
      kind: "REST_OF_DAY_CLEAR",
    });
  });

  it("ignores all-day events when a timed event is up next", () => {
    const allDay = createEvent({
      id: "all-day",
      isAllDay: true,
      startTime: "00:00",
      endTime: "23:59",
    });
    const next = createEvent({
      id: "next",
      startTime: "1:30 PM",
      endTime: "2:30 PM",
    });

    expect(
      deriveHeroState({ todayEvents: [allDay, next], now: at(12) }),
    ).toEqual({
      kind: "UP_NEXT",
      event: next,
    });
  });
});
