import { isEventOnDate } from "@/lib/time-utils";
import type { CalendarEvent } from "@/lib/types";

/** Corner geometry for a chip within a multi-day run. */
export type MonthChipEdge = "start" | "middle" | "end" | "solo";

export interface MonthSlot {
  kind: "event" | "blank";
  event?: CalendarEvent;
  edge?: MonthChipEdge;
}

export interface MonthCellPlan {
  /** Slots to render, already truncated to capacity. */
  slots: MonthSlot[];
  /** Events not rendered. Excludes reserved blank slots. */
  overflowCount: number;
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** True when the event spans more than one calendar day. */
export function isMultiDay(event: CalendarEvent): boolean {
  return Boolean(event.endDate) && !sameDay(event.date, event.endDate as Date);
}

/**
 * Corner geometry for `event` as rendered on `day`. Rounded corners appear
 * only at the run's true start and true end, so a run clipped by the visible
 * grid keeps square edges at the grid boundary — and a week boundary needs no
 * special case.
 */
export function multiDayEdge(event: CalendarEvent, day: Date): MonthChipEdge {
  if (!isMultiDay(event)) return "solo";
  const isStart = sameDay(event.date, day);
  const isEnd = sameDay(event.endDate as Date, day);
  if (isStart && isEnd) return "solo";
  if (isStart) return "start";
  if (isEnd) return "end";
  return "middle";
}

/**
 * Multi-day events touching this week row, in the stable order every cell in
 * the row uses: start ascending, then end descending (longest first), then
 * title. Computed once per row so a run holds one slot index across the row.
 *
 * Known limitation (spec Section 4.3): this is row-scoped, so a run can hold a
 * different index in the next row. Alignment is exact within a row only.
 */
export function orderRowMultiDay(
  events: CalendarEvent[],
  weekDays: Date[],
): CalendarEvent[] {
  return events
    .filter(
      (event) =>
        isMultiDay(event) && weekDays.some((day) => isEventOnDate(event, day)),
    )
    .sort((a, b) => {
      const byStart = a.date.getTime() - b.date.getTime();
      if (byStart !== 0) return byStart;
      const aEnd = (a.endDate ?? a.date).getTime();
      const bEnd = (b.endDate ?? b.date).getTime();
      if (aEnd !== bEnd) return bEnd - aEnd;
      return a.title.localeCompare(b.title);
    });
}

/**
 * Ordered slot plan for one day cell.
 *
 * Multi-day runs occupy slots `0..k`, where `k` is the highest index in
 * `rowMultiDay` covering this day; slots below `k` that do not cover this day
 * are reserved blank so the runs above stay aligned. Single-day events follow.
 * The result is truncated to `capacity`, reserving the last visual slot for
 * the `+N` summary when anything is hidden. A reserved blank can be the only
 * visible prefix in a pathological overlap; this preserves exact lane
 * alignment and is an explicit, tested limitation rather than a false
 * guarantee that one chip always renders.
 */
export function planCellSlots({
  rowMultiDay,
  day,
  singleDayEvents,
  capacity,
}: {
  rowMultiDay: CalendarEvent[];
  day: Date;
  singleDayEvents: CalendarEvent[];
  capacity: number;
}): MonthCellPlan {
  let lastCovering = -1;
  for (let i = 0; i < rowMultiDay.length; i++) {
    if (isEventOnDate(rowMultiDay[i], day)) lastCovering = i;
  }

  const slots: MonthSlot[] = [];
  for (let i = 0; i <= lastCovering; i++) {
    const event = rowMultiDay[i];
    if (isEventOnDate(event, day)) {
      slots.push({ kind: "event", event, edge: multiDayEdge(event, day) });
    } else {
      slots.push({ kind: "blank" });
    }
  }
  for (const event of singleDayEvents) {
    slots.push({ kind: "event", event, edge: "solo" });
  }

  if (slots.length <= capacity) {
    return { slots, overflowCount: 0 };
  }

  const visibleCount = Math.max(0, capacity - 1);
  const visible = slots.slice(0, visibleCount);
  const overflowCount = slots
    .slice(visibleCount)
    .filter((slot) => slot.kind === "event").length;

  return { slots: visible, overflowCount };
}
