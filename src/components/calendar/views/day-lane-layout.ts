import { getTimeInMinutes } from "@/lib/time-utils";
import type { CalendarEvent } from "@/lib/types";

export interface EventWithLayout extends CalendarEvent {
  column: number;
  totalColumns: number;
}

export function eventsOverlap(a: CalendarEvent, b: CalendarEvent): boolean {
  const aStart = getTimeInMinutes(a.startTime);
  const aEnd = getTimeInMinutes(a.endTime);
  const bStart = getTimeInMinutes(b.startTime);
  const bEnd = getTimeInMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Greedy column packing for overlapping timed events. Each event gets the first
 * column where it does not overlap an existing event; totalColumns is the width
 * of its overlap cluster. Used by the tablet Day canvas and each member lane.
 */
export function calculateEventColumns(
  events: CalendarEvent[],
): EventWithLayout[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => {
    const aStart = getTimeInMinutes(a.startTime);
    const bStart = getTimeInMinutes(b.startTime);
    if (aStart !== bStart) return aStart - bStart;
    const aDuration = getTimeInMinutes(a.endTime) - aStart;
    const bDuration = getTimeInMinutes(b.endTime) - bStart;
    return bDuration - aDuration;
  });

  const result: EventWithLayout[] = [];
  const columns: CalendarEvent[][] = [];

  for (const event of sorted) {
    let assignedColumn = -1;
    for (let col = 0; col < columns.length; col++) {
      const hasOverlap = columns[col].some((e) => eventsOverlap(e, event));
      if (!hasOverlap) {
        assignedColumn = col;
        break;
      }
    }
    if (assignedColumn === -1) {
      assignedColumn = columns.length;
      columns.push([]);
    }
    columns[assignedColumn].push(event);
    result.push({ ...event, column: assignedColumn, totalColumns: 0 });
  }

  for (const eventWithLayout of result) {
    const overlapping = result.filter((e) => eventsOverlap(e, eventWithLayout));
    const maxColumn = Math.max(...overlapping.map((e) => e.column));
    eventWithLayout.totalColumns = maxColumn + 1;
  }

  return result;
}
