import type { CalendarEvent } from "@/lib/types";
import { compareByStartDateTime, getEventDateTime } from "./event-time";

export type HeroState =
  | { kind: "RIGHT_NOW"; event: CalendarEvent }
  | { kind: "UP_NEXT"; event: CalendarEvent }
  | { kind: "ALL_DAY_ONLY"; event: CalendarEvent }
  | { kind: "REST_OF_DAY_CLEAR" }
  | { kind: "ALL_CLEAR_TODAY" };

export function deriveHeroState({
  todayEvents,
  now,
}: {
  todayEvents: CalendarEvent[];
  now: Date;
}): HeroState {
  const timedEvents = todayEvents
    .filter((event) => !event.isAllDay)
    .sort(compareByStartDateTime);
  const allDayEvents = todayEvents.filter((event) => event.isAllDay);

  const inProgress = timedEvents.find((event) => {
    const start = getEventDateTime(event, "start");
    const end = getEventDateTime(event, "end");
    return start <= now && now < end;
  });

  if (inProgress) {
    return { kind: "RIGHT_NOW", event: inProgress };
  }

  const next = timedEvents.find(
    (event) => getEventDateTime(event, "start") > now,
  );
  if (next) {
    return { kind: "UP_NEXT", event: next };
  }

  if (timedEvents.length === 0 && allDayEvents.length > 0) {
    return { kind: "ALL_DAY_ONLY", event: allDayEvents[0] };
  }

  if (timedEvents.length > 0) {
    return { kind: "REST_OF_DAY_CLEAR" };
  }

  return { kind: "ALL_CLEAR_TODAY" };
}
