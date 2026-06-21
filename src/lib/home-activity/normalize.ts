import { formatLocalDate, getEventKey } from "@/lib/time-utils";
import type { CalendarEvent, ListSummary } from "@/lib/types";
import type { Snapshot } from "./types";

export function buildSnapshot(
  events: CalendarEvent[],
  lists: ListSummary[],
): Snapshot {
  const snap: Snapshot = {};

  for (const e of events) {
    const storeKey = `calendar:${getEventKey(e)}`;
    snap[storeKey] = {
      storeKey,
      module: "calendar",
      title: e.title,
      date: formatLocalDate(e.date),
      startTime: e.startTime,
      endTime: e.endTime,
      endDate: e.endDate ? formatLocalDate(e.endDate) : undefined,
      isAllDay: e.isAllDay,
      location: e.location,
      memberId: e.memberId,
      recurringEventId: e.recurringEventId,
      entityId: e.id,
    };
  }

  for (const l of lists) {
    const storeKey = `lists:${l.id}`;
    snap[storeKey] = {
      storeKey,
      module: "lists",
      title: l.name,
      totalItems: l.totalItems,
      completedItems: l.completedItems,
      entityId: l.id,
    };
  }

  return snap;
}
