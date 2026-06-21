import type { ActivityItem, Feed, FeedGroup, FeedRow } from "./types";

const MODULE_RANK: Record<string, number> = { calendar: 0, lists: 1 };

function rowOf(i: ActivityItem): FeedRow {
  return {
    storeKey: i.storeKey,
    kind: i.kind,
    label: i.title,
    detail: i.detail,
    memberId: i.memberId,
    module: i.module,
    date: i.date,
    entityId: i.entityId,
  };
}

// Deterministic order: newest first, then title, then storeKey — so a same-cycle
// batch (every delta shares detectedAt) never reshuffles between renders (§5).
function byRecency(a: ActivityItem, b: ActivityItem): number {
  return (
    b.detectedAt - a.detectedAt ||
    a.title.localeCompare(b.title) ||
    a.storeKey.localeCompare(b.storeKey)
  );
}

// One sub-row per distinct series change. The signature includes everything the
// sub-row actually renders — kind, title (label), member (dot), detail — so two
// instances collapse ONLY when they would display identically; any visible change
// (retitle, reassignment, time move) stays a separate row (§4.2).
function seriesSignature(i: ActivityItem): string | null {
  return i.recurringEventId
    ? `${i.recurringEventId}|${i.kind}|${i.title}|${i.memberId ?? ""}|${i.detail ?? ""}`
    : null;
}

function calendarSummary(items: ActivityItem[]): string {
  const added = items.filter((i) => i.kind === "added").length;
  const changed = items.filter((i) => i.kind === "edited").length;
  const removed = items.filter((i) => i.kind === "removed").length;
  const parts: string[] = [];
  if (added) parts.push(`${added} added`);
  if (changed) parts.push(`${changed} changed`);
  if (removed) parts.push(`${removed} removed`);
  return `Calendar · ${parts.join(", ")}`;
}

export function buildFeed(
  log: ActivityItem[],
  lastSeen: number,
  entryCap: number,
  subRowCap: number = entryCap,
): Feed {
  // Calendar: collapse series by the full visible signature
  // (recurringEventId, kind, title, memberId, detail), then group all calendar
  // items together. Non-recurring events are never collapsed.
  const seenSig = new Set<string>();
  const calItems: ActivityItem[] = [];
  for (const i of log.filter((x) => x.module === "calendar").sort(byRecency)) {
    const sig = seriesSignature(i);
    if (sig) {
      if (seenSig.has(sig)) continue;
      seenSig.add(sig);
    }
    calItems.push(i);
  }

  const groups: FeedGroup[] = [];
  if (calItems.length === 1) {
    const i = calItems[0];
    groups.push({
      id: "calendar",
      module: "calendar",
      summary: `${i.title}${i.detail ? ` · ${i.detail}` : ""}`,
      rows: [rowOf(i)],
      rowsOverflow: 0,
      newest: i.detectedAt,
    });
  } else if (calItems.length > 1) {
    const shown = calItems.slice(0, subRowCap);
    groups.push({
      id: "calendar",
      module: "calendar",
      summary: calendarSummary(calItems), // count over ALL items, not just the shown sub-rows
      rows: shown.map(rowOf),
      rowsOverflow: Math.max(0, calItems.length - subRowCap),
      newest: Math.max(...calItems.map((i) => i.detectedAt)),
    });
  }

  // Lists: one group per list.
  for (const i of log.filter((x) => x.module === "lists")) {
    groups.push({
      id: i.storeKey,
      module: "lists",
      summary: `${i.title}${i.detail ? ` · ${i.detail}` : ""}`,
      rows: [rowOf(i)],
      rowsOverflow: 0,
      newest: i.detectedAt,
    });
  }

  groups.sort(
    (a, b) =>
      b.newest - a.newest ||
      MODULE_RANK[a.module] - MODULE_RANK[b.module] ||
      a.summary.localeCompare(b.summary) ||
      a.id.localeCompare(b.id), // final tiebreak: group ids are unique → order never reshuffles between renders
  );

  const overflow = Math.max(0, groups.length - entryCap);
  const capped = groups.slice(0, entryCap);

  const newCount = capped.filter((g) => g.newest > lastSeen).length;
  const dividerAfter =
    newCount > 0 && newCount < capped.length ? newCount - 1 : -1;

  return { groups: capped, dividerAfter, overflow };
}
