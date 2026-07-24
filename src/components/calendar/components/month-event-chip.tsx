import { Repeat } from "lucide-react";
import { useFamilyMembers } from "@/api";
import { type CalendarEvent, colorMap, getFamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MONTH_CHIP_BLEED_X, MONTH_CHIP_HEIGHT } from "../utils/month-capacity";
import type { MonthChipEdge } from "../utils/month-slots";
import { GoogleBadge, isGoogleEvent } from "./calendar-event";

interface MonthEventChipProps {
  event: CalendarEvent;
  edge: MonthChipEdge;
  /** False at Sunday so nothing bleeds outside the row. */
  weldLeft: boolean;
  /** False at Saturday so nothing bleeds outside the row. */
  weldRight: boolean;
}

export function MonthEventChip({
  event,
  edge,
  weldLeft,
  weldRight,
}: MonthEventChipProps) {
  const familyMembers = useFamilyMembers();
  const member = getFamilyMember(familyMembers, event.memberId);
  const colors = member ? colorMap[member.color] : undefined;
  const memberFirstName = member?.name.trim().split(/\s+/)[0] ?? "Unknown";
  const left = weldLeft ? MONTH_CHIP_BLEED_X : 0;
  const right = weldRight ? MONTH_CHIP_BLEED_X : 0;

  return (
    <div
      data-testid="month-event-chip"
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative z-10 flex w-full shrink-0 items-center gap-1 overflow-hidden whitespace-nowrap px-1.5 text-left text-sm font-medium",
        colors ? [colors.bg, "text-white"] : ["bg-muted", "text-foreground"],
        edge === "solo" && "rounded",
        edge === "start" && "rounded-l",
        edge === "end" && "rounded-r",
      )}
      style={{
        height: MONTH_CHIP_HEIGHT,
        minHeight: MONTH_CHIP_HEIGHT,
        maxHeight: MONTH_CHIP_HEIGHT,
        marginLeft: -left,
        width: `calc(100% + ${left + right}px)`,
      }}
    >
      {event.isAllDay && (
        <span
          data-testid="month-all-day-marker"
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      )}
      {isGoogleEvent(event) && (
        <span className="shrink-0" aria-hidden="true">
          <GoogleBadge size={8} />
        </span>
      )}
      <span
        data-testid="month-chip-member"
        className="max-w-[35%] shrink-0 truncate font-semibold"
      >
        {memberFirstName}
      </span>
      <span aria-hidden="true">·</span>
      <span className="truncate">{event.title}</span>
      {event.isRecurring && (
        <Repeat
          data-testid="month-recurring-marker"
          aria-hidden="true"
          className="ml-auto size-3 shrink-0"
        />
      )}
    </div>
  );
}
