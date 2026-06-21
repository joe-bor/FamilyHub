export type ActivityModule = "calendar" | "lists";
export type ActivityKind = "added" | "edited" | "removed";

/** A comparable snapshot of one tracked entity. Stores every watched field so
 * "edited" is a field compare (the backend exposes no updatedAt). */
export interface SnapshotEntry {
  storeKey: string; // `${module}:${entityKey}` — unique across modules
  module: ActivityModule;
  title: string;
  // calendar fields (undefined for lists)
  date?: string; // formatLocalDate(event.date)
  startTime?: string;
  endTime?: string;
  endDate?: string;
  isAllDay?: boolean;
  location?: string;
  memberId?: string;
  recurringEventId?: string;
  entityId?: string | null; // raw calendar id (may be null) / list id
  // lists fields (undefined for calendar)
  totalItems?: number;
  completedItems?: number;
}

export type Snapshot = Record<string, SnapshotEntry>;

export interface ActivityItem {
  storeKey: string;
  module: ActivityModule;
  kind: ActivityKind;
  title: string;
  detail?: string;
  memberId?: string;
  recurringEventId?: string;
  date?: string;
  entityId?: string | null;
  detectedAt: number;
}

/** The calendar query window the snapshot was captured under, as local-date
 * strings. The window slides daily, so the diff only compares calendar entities
 * within the overlap of the previous and current windows (§4.4). */
export interface EventWindow {
  start: string; // formatLocalDate(today)
  end: string; // formatLocalDate(today + W)
}

export interface ActivityState {
  snapshot: Snapshot;
  log: ActivityItem[];
  snapshotSavedAt: number;
  eventWindow: EventWindow; // bounds the snapshot's calendar entities were captured under
}

export interface FeedRow {
  storeKey: string;
  kind: ActivityKind;
  label: string; // "Dentist", "Groceries"
  detail?: string; // "Tue 9:00 AM", "+3 items"
  memberId?: string;
  module: ActivityModule;
  date?: string;
  entityId?: string | null;
}

export interface FeedGroup {
  id: string; // "calendar" or `lists:${listId}`
  module: ActivityModule;
  summary: string; // "Calendar · 2 added, 1 changed" | "Groceries · +3 items"
  rows: FeedRow[]; // length 1 → render directly (no expander); >1 → expandable
  rowsOverflow: number; // sub-rows beyond the calendar sub-row cap (for "and N more" inside the group)
  newest: number; // max detectedAt in group (for ordering + divider placement)
}

export interface Feed {
  groups: FeedGroup[];
  dividerAfter: number; // index after which the "earlier" divider renders; -1 = no divider
  overflow: number; // count beyond the cap (for "and N more")
}
