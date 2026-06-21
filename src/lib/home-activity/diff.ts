import { parseLocalDate } from "@/lib/time-utils";
import type {
  ActivityItem,
  ActivityKind,
  Snapshot,
  SnapshotEntry,
} from "./types";

const CALENDAR_FIELDS: (keyof SnapshotEntry)[] = [
  "title",
  "date",
  "startTime",
  "endTime",
  "endDate",
  "isAllDay",
  "location",
  "memberId",
];

function calendarChanged(a: SnapshotEntry, b: SnapshotEntry): boolean {
  return CALENDAR_FIELDS.some((f) => a[f] !== b[f]);
}

function listChanged(fresh: SnapshotEntry, prev: SnapshotEntry): boolean {
  if (fresh.title !== prev.title) return true;
  if (fresh.totalItems !== prev.totalItems) return true;
  // completedItems: only an INCREASE (checked off) is surfaced. An un-check
  // (decrease) with no other change is suppressed — there is no "updated"
  // signal (spec §4.2).
  return (fresh.completedItems ?? 0) > (prev.completedItems ?? 0);
}

function calendarDetail(e: SnapshotEntry): string {
  if (e.isAllDay) return "all day";
  return e.startTime
    ? `${affixDay(e.date)} ${e.startTime}`.trim()
    : (e.date ?? "");
}

function affixDay(date?: string): string {
  if (!date) return "";
  // parseLocalDate (not raw `new Date("yyyy-MM-dd")`) per the repo's TZ convention.
  return parseLocalDate(date).toLocaleDateString(undefined, {
    weekday: "short",
  }); // "Tue"
}

function listDetail(fresh: SnapshotEntry, prev?: SnapshotEntry): string {
  if (!prev) return "New list"; // created → summary "<name> · New list" (§5)
  // Single summary signal per list: a rename takes precedence — if the title also
  // changed, the item-count delta is intentionally not surfaced this cycle.
  if (fresh.title !== prev.title) return "renamed";
  const totalDelta = (fresh.totalItems ?? 0) - (prev.totalItems ?? 0);
  if (totalDelta > 0) return `+${totalDelta} items`;
  if (totalDelta < 0) return `${-totalDelta} removed`;
  // Only reachable when completedItems increased — listChanged() gates out the
  // title/total/uncheck cases, so there is no unspecified "updated" fallback.
  const doneDelta = (fresh.completedItems ?? 0) - (prev.completedItems ?? 0);
  return `${doneDelta} checked off`;
}

/** Calendar entities outside the overlap of the previous and current detection
 * windows are sliding-edge churn, not real adds/removes (spec §4.4). Lists are
 * unwindowed and always pass. yyyy-MM-dd strings compare chronologically. */
function inWindow(
  e: SnapshotEntry,
  overlap?: { start: string; end: string },
): boolean {
  if (!overlap || e.module !== "calendar" || !e.date) return true;
  return e.date >= overlap.start && e.date <= overlap.end;
}

function item(
  entry: SnapshotEntry,
  kind: ActivityKind,
  detail: string,
  detectedAt: number,
): ActivityItem {
  return {
    storeKey: entry.storeKey,
    module: entry.module,
    kind,
    title: entry.title,
    detail,
    memberId: entry.memberId,
    recurringEventId: entry.recurringEventId,
    date: entry.date,
    entityId: entry.entityId,
    detectedAt,
  };
}

export function diffSnapshots(
  fresh: Snapshot,
  prev: Snapshot,
  detectedAt: number,
  overlap?: { start: string; end: string },
): ActivityItem[] {
  const out: ActivityItem[] = [];

  for (const key of Object.keys(fresh)) {
    const f = fresh[key];
    const p = prev[key];
    if (!p) {
      if (!inWindow(f, overlap)) continue; // entered at the sliding top edge — not a real add
      out.push(
        item(
          f,
          "added",
          f.module === "calendar" ? calendarDetail(f) : listDetail(f),
          detectedAt,
        ),
      );
      continue;
    }
    const changed =
      f.module === "calendar" ? calendarChanged(f, p) : listChanged(f, p);
    if (changed) {
      out.push(
        item(
          f,
          "edited",
          f.module === "calendar" ? calendarDetail(f) : listDetail(f, p),
          detectedAt,
        ),
      );
    }
  }

  for (const key of Object.keys(prev)) {
    if (fresh[key]) continue;
    const p = prev[key];
    if (!inWindow(p, overlap)) continue; // aged out below the sliding bottom edge — not a real remove
    out.push(item(p, "removed", "", detectedAt));
  }

  return out;
}

export function mergeLog(
  log: ActivityItem[],
  deltas: ActivityItem[],
): ActivityItem[] {
  const byKey = new Map(log.map((i) => [i.storeKey, i]));
  for (const d of deltas) {
    const existing = byKey.get(d.storeKey);
    if (!existing) {
      byKey.set(d.storeKey, d);
      continue;
    }
    if (d.kind === "removed") {
      // An add then a remove within the window net-cancels — no lingering row
      // (spec §4.4 / §9 AC). Otherwise the removal wins.
      if (existing.kind === "added") {
        byKey.delete(d.storeKey);
        continue;
      }
      byKey.set(d.storeKey, {
        ...d,
        kind: "removed",
        detectedAt: Math.max(existing.detectedAt, d.detectedAt),
      });
      continue;
    }
    // d is added/edited: a prior "added" stays "added"; otherwise take the delta's kind.
    // (A prior "removed" re-appearing is emitted by diffSnapshots as "added", so this resolves to "added".)
    const kind = existing.kind === "added" ? "added" : d.kind;
    byKey.set(d.storeKey, {
      ...d,
      kind,
      detectedAt: Math.max(existing.detectedAt, d.detectedAt),
    });
  }
  return [...byKey.values()];
}

export function reconcileLog(
  log: ActivityItem[],
  freshKeys: Set<string>,
  window?: { start: string; end: string },
): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (const i of log) {
    if (freshKeys.has(i.storeKey)) {
      out.push(i);
      continue;
    }
    // Absent from `fresh`. A calendar entry whose date is OUTSIDE the current query
    // window merely aged out of the fetch — it was NOT deleted. Preserve it as-is
    // (do not drop an `added`, do not demote an `edited`) until normal 48h pruning.
    // Without this, the window-aware diff's suppression is undone here (§4.4).
    if (
      window &&
      i.module === "calendar" &&
      i.date &&
      (i.date < window.start || i.date > window.end)
    ) {
      out.push(i);
      continue;
    }
    if (i.kind === "added") {
      // genuinely absent within the window → drop the phantom
    } else if (i.kind === "edited") {
      out.push({ ...i, kind: "removed" });
    } else {
      out.push(i); // already removed
    }
  }
  return out;
}

export function pruneLog(
  log: ActivityItem[],
  now: number,
  maxAgeMs: number,
): ActivityItem[] {
  // Inclusive boundary: an entry exactly maxAgeMs old is kept (drops only when strictly older).
  return log.filter((i) => now - i.detectedAt <= maxAgeMs);
}
