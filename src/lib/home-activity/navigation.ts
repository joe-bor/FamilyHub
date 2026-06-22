import { getEventKey } from "@/lib/time-utils";
import type { CalendarEvent } from "@/lib/types";
import type { FeedRow } from "./types";

export type FeedSelection =
  | { type: "open-event"; event: CalendarEvent }
  | { type: "open-list"; listId: string }
  | { type: "focus-calendar"; date: string }
  | { type: "switch-module"; module: "calendar" | "lists" };

export function resolveFeedSelection(
  row: FeedRow,
  inWindowEvents: CalendarEvent[],
): FeedSelection {
  if (row.module === "lists") {
    // A removed list has no detail to open → land on the Lists module rather than
    // request a deleted id (which would 404).
    if (row.kind === "removed" || !row.entityId)
      return { type: "switch-module", module: "lists" };
    return { type: "open-list", listId: row.entityId };
  }
  // A removed calendar event's sheet is gone → focus its day (or the module).
  if (row.kind === "removed") {
    return row.date
      ? { type: "focus-calendar", date: row.date }
      : { type: "switch-module", module: "calendar" };
  }
  const key = row.storeKey.replace("calendar:", "");
  const match = inWindowEvents.find((e) => getEventKey(e) === key);
  if (match) return { type: "open-event", event: match };
  if (row.date) return { type: "focus-calendar", date: row.date };
  return { type: "switch-module", module: "calendar" };
}
