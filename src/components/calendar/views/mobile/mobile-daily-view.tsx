import { useMemo, useRef } from "react";
import {
  CALENDAR_START_HOUR,
  compareEventsByTime,
  getEventKey,
  getTimeInMinutes,
  isEventOnDate,
  parseTime,
} from "@/lib/time-utils";
import {
  type CalendarEvent,
  colorMap,
  type FamilyColor,
  type FamilyMember,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  CurrentTimeIndicator,
  useAutoScrollToNow,
} from "../../components/current-time-indicator";
import { SwipeContainer } from "./swipe-container";

interface MobileDailyViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  memberMap: Map<string, FamilyMember>;
  onEventClick: (event: CalendarEvent) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const START_HOUR = CALENDAR_START_HOUR; // 6
const ROW_HEIGHT = 60; // px per hour (mobile: 60, desktop: 80)
const END_HOUR = 23;

// All hours rendered in the grid (6-23)
const ALL_HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i,
);

// Only even hours get labels on mobile
const EVEN_TIME_SLOTS = [
  { hour: 6, label: "6 AM" },
  { hour: 8, label: "8 AM" },
  { hour: 10, label: "10 AM" },
  { hour: 12, label: "12 PM" },
  { hour: 14, label: "2 PM" },
  { hour: 16, label: "4 PM" },
  { hour: 18, label: "6 PM" },
  { hour: 20, label: "8 PM" },
  { hour: 22, label: "10 PM" },
];

const EVEN_HOUR_SET = new Set(EVEN_TIME_SLOTS.map((s) => s.hour));
const EVEN_HOUR_LABEL: Record<number, string> = Object.fromEntries(
  EVEN_TIME_SLOTS.map((s) => [s.hour, s.label]),
);

/**
 * Extract the raw hex color from a Tailwind arbitrary-value bg class.
 * e.g. "bg-[#e88470]" → "#e88470"
 */
function extractHexFromBgClass(bgClass: string): string {
  const match = bgClass.match(/bg-\[([^\]]+)\]/);
  return match ? match[1] : "#e88470";
}

const COLOR_HEX: Record<FamilyColor, string> = Object.fromEntries(
  Object.entries(colorMap).map(([key, val]) => [
    key,
    extractHexFromBgClass(val.bg),
  ]),
) as Record<FamilyColor, string>;

function getEventGridPosition(startTime: string, endTime: string) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);

  const startRow = start.hours - START_HOUR;
  const startMinuteOffset = start.minutes / 60;

  const endRow = end.hours - START_HOUR;
  const endMinuteOffset = end.minutes / 60;

  const top = (startRow + startMinuteOffset) * ROW_HEIGHT;
  const bottom = (endRow + endMinuteOffset) * ROW_HEIGHT;
  const height = Math.max(bottom - top, 30);

  return { top, height };
}

function eventsOverlap(a: CalendarEvent, b: CalendarEvent): boolean {
  const aStart = getTimeInMinutes(a.startTime);
  const aEnd = getTimeInMinutes(a.endTime);
  const bStart = getTimeInMinutes(b.startTime);
  const bEnd = getTimeInMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

interface EventWithLayout extends CalendarEvent {
  column: number;
  totalColumns: number;
}

function calculateEventColumns(events: CalendarEvent[]): EventWithLayout[] {
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

export function MobileDailyView({
  events,
  currentDate,
  memberMap,
  onEventClick,
  onSwipeLeft,
  onSwipeRight,
}: MobileDailyViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const isCurrentDay = currentDate.toDateString() === today.toDateString();

  useAutoScrollToNow(
    isCurrentDay ? scrollContainerRef : { current: null },
    START_HOUR,
    ROW_HEIGHT,
  );

  const timedEvents = useMemo(() => {
    return events
      .filter((event) => isEventOnDate(event, currentDate) && !event.isAllDay)
      .sort(compareEventsByTime);
  }, [events, currentDate]);

  const eventsWithLayout = useMemo(
    () => calculateEventColumns(timedEvents),
    [timedEvents],
  );

  return (
    <SwipeContainer
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
      className="flex flex-col"
    >
      {/* Scrollable grid */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <div className="flex">
          {/* Time column — 32px (w-8) */}
          <div className="w-8 shrink-0 bg-card border-r border-border">
            {ALL_HOURS.map((hour) => (
              <div
                key={hour}
                className="flex items-start justify-end pr-1 pt-0.5 border-b border-border/50"
                style={{ height: `${ROW_HEIGHT}px` }}
              >
                {EVEN_HOUR_SET.has(hour) && (
                  <span className="text-[10px] text-foreground/60 font-medium leading-none">
                    {EVEN_HOUR_LABEL[hour]}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Event grid — relative container for absolute-positioned events */}
          <div
            className={cn("flex-1 relative", isCurrentDay && "bg-primary/5")}
          >
            {/* Grid rows */}
            {ALL_HOURS.map((hour, index) => (
              <div
                key={hour}
                className={cn(
                  "border-b border-border/50",
                  index % 2 === 0 && "bg-muted/30",
                )}
                style={{ height: `${ROW_HEIGHT}px` }}
              />
            ))}

            {/* Current time indicator */}
            {isCurrentDay && (
              <div className="absolute inset-0 pointer-events-none">
                <CurrentTimeIndicator
                  startHour={START_HOUR}
                  rowHeight={ROW_HEIGHT}
                />
              </div>
            )}

            {/* Events */}
            {eventsWithLayout.map((event) => {
              const { top, height } = getEventGridPosition(
                event.startTime,
                event.endTime,
              );
              const { column, totalColumns } = event;

              // Limit to 2 columns on mobile (vs 3 on desktop)
              const effectiveColumns = Math.min(totalColumns, 2);
              const columnWidth = 100 / effectiveColumns;
              const left = Math.min(column, 1) * columnWidth;

              const member = memberMap.get(event.memberId);
              const borderColor = member
                ? COLOR_HEX[member.color]
                : COLOR_HEX.coral;

              // Strip layout fields before passing to caller
              const {
                column: _col,
                totalColumns: _tc,
                ...originalEvent
              } = event;

              return (
                <button
                  type="button"
                  key={getEventKey(event)}
                  onClick={() => onEventClick(originalEvent)}
                  className={cn(
                    "absolute overflow-hidden rounded-lg text-left",
                    "bg-card border border-border/50 shadow-sm",
                    "active:opacity-80 transition-opacity",
                  )}
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 44)}px`,
                    left: `calc(${left}% + 4px)`,
                    width: `calc(${columnWidth}% - 6px)`,
                    borderLeftWidth: "3px",
                    borderLeftColor: borderColor,
                  }}
                >
                  <div className="px-1.5 py-1 h-full flex flex-col justify-start">
                    <span className="font-semibold text-[13px] leading-tight truncate block">
                      {event.title}
                    </span>
                    {height >= 30 && (
                      <span className="text-[11px] text-muted-foreground leading-tight">
                        {event.startTime}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </SwipeContainer>
  );
}
