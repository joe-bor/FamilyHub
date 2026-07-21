import { format } from "date-fns";
import type React from "react";
import { useRef } from "react";
import { formatLocalDate, getEventKey } from "@/lib/time-utils";
import { type CalendarEvent, colorMap, type FamilyColor } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  MONTH_CELL_PADDING_X,
  MONTH_CELL_PADDING_Y,
  MONTH_CHIP_GAP,
  MONTH_CHIP_HEIGHT,
  MONTH_HEADER_SLOT_GAP,
  MONTH_NUMERAL_BLOCK,
} from "../utils/month-capacity";
import type { MonthCellPlan } from "../utils/month-slots";
import { MonthEventChip } from "./month-event-chip";
import { MonthOverflowPopover } from "./month-overflow-popover";

interface MonthDayCellProps {
  date: Date;
  /** Visible grid month, used by adjacent-day accessible names. */
  visibleMonthName: string;
  /** Sunday=0 through Saturday=6; suppresses outward weld bleed. */
  columnIndex: number;
  plan: MonthCellPlan;
  /** Every event on this day, for the popover and the accessible name. */
  allEvents: CalendarEvent[];
  memberColors: FamilyColor[];
  memberNames: string[];
  isToday: boolean;
  isFocused: boolean;
  isOutsideMonth: boolean;
  isWeekend: boolean;
  rowHeight: number;
  /** Parent policy: populated day opens popover; empty day opens Day view. */
  onActivateDay: (date: Date) => void;
  /** Explicit action inside the popover. */
  onSelectDay: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onFocusDay: (date: Date) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, date: Date) => void;
  popoverOpen: boolean;
  onPopoverOpenChange: (open: boolean) => void;
}

function memberSummary(names: string[]): string {
  if (names.length === 1) return `${names[0]} has events`;
  const joined = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `${joined} have events`;
}

export function MonthDayCell({
  date,
  visibleMonthName,
  columnIndex,
  plan,
  allEvents,
  memberColors,
  memberNames,
  isToday,
  isFocused,
  isOutsideMonth,
  isWeekend,
  rowHeight,
  onActivateDay,
  onSelectDay,
  onEventClick,
  onFocusDay,
  onKeyDown,
  popoverOpen,
  onPopoverOpenChange,
}: MonthDayCellProps) {
  const cellRef = useRef<HTMLDivElement>(null);

  const eventCount = allEvents.length;
  const countLabel =
    eventCount === 0
      ? "no events"
      : `${eventCount} ${eventCount === 1 ? "event" : "events"}`;
  const outsideLabel = isOutsideMonth ? `, outside ${visibleMonthName}` : "";
  const memberSummaryId =
    memberNames.length > 0
      ? `month-members-${formatLocalDate(date)}`
      : undefined;

  const cell = (
    // One >=44px target. Dense chip/+N children are presentational.
    // biome-ignore lint/a11y/useSemanticElements: div with gridcell role needed — not table data, and never a button per the interaction contract
    <div
      ref={cellRef}
      role="gridcell"
      tabIndex={isFocused ? 0 : -1}
      aria-current={isToday ? "date" : undefined}
      aria-haspopup={allEvents.length > 0 ? "dialog" : undefined}
      aria-label={`${format(date, "MMMM d, yyyy")}, ${countLabel}${outsideLabel}`}
      aria-describedby={memberSummaryId}
      data-date={formatLocalDate(date)}
      onClick={() => {
        cellRef.current?.focus();
        onFocusDay(date);
        onActivateDay(date);
      }}
      onFocus={() => onFocusDay(date)}
      onKeyDown={(event) => onKeyDown(event, date)}
      className={cn(
        "box-border flex cursor-pointer flex-col overflow-visible rounded-lg border transition-colors motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        isWeekend ? "bg-muted/40" : "bg-card",
        isOutsideMonth && "bg-muted/20",
        isToday && "border-primary bg-primary/10",
        !isToday && isOutsideMonth && "border-border/30 hover:bg-muted/30",
        !isToday && !isOutsideMonth && "border-border/50 hover:bg-accent/50",
        // Today's own ring, and the selected ring, must both be able to show
        // on the same cell — spec 4.7 requires them separable when they
        // coincide. Today uses an inset ring, selected an offset outline.
        isToday && "ring-1 ring-primary ring-inset",
        isFocused && "outline outline-2 outline-offset-[-3px] outline-ring",
      )}
      style={{
        height: rowHeight,
        paddingTop: MONTH_CELL_PADDING_Y / 2,
        paddingBottom: MONTH_CELL_PADDING_Y / 2,
        paddingLeft: MONTH_CELL_PADDING_X,
        paddingRight: MONTH_CELL_PADDING_X,
        gap: MONTH_HEADER_SLOT_GAP,
      }}
    >
      <div
        className="flex shrink-0 items-center justify-between"
        style={{ height: MONTH_NUMERAL_BLOCK, minHeight: MONTH_NUMERAL_BLOCK }}
      >
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            isOutsideMonth && "text-muted-foreground",
            isToday && "text-primary",
          )}
        >
          {date.getDate()}
        </span>
        {memberColors.length > 0 && (
          <span className="flex items-center gap-0.5">
            {memberColors.slice(0, 4).map((color, index) => (
              <span
                key={`${color}-${index}`}
                aria-hidden="true"
                className={cn("size-1.5 rounded-full", colorMap[color]?.bg)}
              />
            ))}
            <span id={memberSummaryId} className="sr-only">
              {memberSummary(memberNames)}
            </span>
          </span>
        )}
      </div>

      <div
        className="pointer-events-none flex min-h-0 flex-col"
        style={{ gap: MONTH_CHIP_GAP }}
      >
        {plan.slots.map((slot, index) =>
          slot.kind === "blank" || !slot.event ? (
            <div
              key={`blank-${index}`}
              data-testid="month-slot-blank"
              aria-hidden="true"
              className="shrink-0"
              style={{
                height: MONTH_CHIP_HEIGHT,
                minHeight: MONTH_CHIP_HEIGHT,
              }}
            />
          ) : (
            <MonthEventChip
              key={getEventKey(slot.event)}
              event={slot.event}
              edge={slot.edge ?? "solo"}
              weldLeft={
                columnIndex > 0 &&
                (slot.edge === "middle" || slot.edge === "end")
              }
              weldRight={
                columnIndex < 6 &&
                (slot.edge === "middle" || slot.edge === "start")
              }
            />
          ),
        )}

        {plan.overflowCount > 0 && (
          <div
            data-testid="month-overflow-summary"
            aria-hidden="true"
            className="w-full shrink-0 rounded px-1.5 text-left text-sm font-semibold text-primary"
            style={{
              height: MONTH_CHIP_HEIGHT,
              minHeight: MONTH_CHIP_HEIGHT,
            }}
          >
            +{plan.overflowCount} more
          </div>
        )}
      </div>
    </div>
  );

  if (allEvents.length === 0) return cell;

  return (
    <MonthOverflowPopover
      date={date}
      events={allEvents}
      open={popoverOpen}
      onOpenChange={onPopoverOpenChange}
      onEventClick={onEventClick}
      onOpenDay={onSelectDay}
      onCloseFocus={() => cellRef.current?.focus()}
    >
      {cell}
    </MonthOverflowPopover>
  );
}
