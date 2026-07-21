import { differenceInCalendarDays, format } from "date-fns";
import { type ReactNode, useRef } from "react";
import { useFamilyMembers } from "@/api";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { getEventKey } from "@/lib/time-utils";
import { type CalendarEvent, colorMap, getFamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MonthOverflowPopoverProps {
  date: Date;
  /** Every event for the day, not only the hidden ones. */
  events: CalendarEvent[];
  /** Always a boolean — the popover is unconditionally controlled. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventClick: (event: CalendarEvent) => void;
  onOpenDay: (date: Date) => void;
  /** Focus target for dismissals; actions transfer focus elsewhere. */
  onCloseFocus?: () => void;
  /** The element the popover anchors to — the day cell. */
  children: ReactNode;
}

export function MonthOverflowPopover({
  date,
  events,
  open,
  onOpenChange,
  onEventClick,
  onOpenDay,
  onCloseFocus,
  children,
}: MonthOverflowPopoverProps) {
  const familyMembers = useFamilyMembers();
  const skipCloseFocus = useRef(false);

  const closeForAction = (action: () => void) => {
    skipCloseFocus.current = true;
    onOpenChange(false);
    action();
  };

  return (
    // Anchor-based, deliberately trigger-less. The popover must be openable on
    // ANY day that has events. `open` is always a boolean, never undefined, so
    // the Radix instance is unambiguously controlled.
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) skipCloseFocus.current = false;
        onOpenChange(next);
      }}
    >
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        align="start"
        aria-label={`Events for ${format(date, "MMMM d, yyyy")}`}
        className="motion-reduce:animate-none"
        onInteractOutside={() => {
          // Let a pointer/focus dismissal keep the newly chosen outside target.
          // Escape has no interact-outside event and restores the cell below.
          skipCloseFocus.current = true;
        }}
        onCloseAutoFocus={(event) => {
          // Escape returns to the cell. Outside pointer dismissal keeps the
          // selected target; actions transfer focus or unmount this grid.
          event.preventDefault();
          if (skipCloseFocus.current) {
            skipCloseFocus.current = false;
            return;
          }
          onCloseFocus?.();
        }}
      >
        <p className="mb-2 text-sm font-semibold">
          {format(date, "EEEE, MMMM d")}
        </p>
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
          {events.map((event) => {
            const member = getFamilyMember(familyMembers, event.memberId);
            const memberName = member?.name ?? "Unknown member";
            const colors = member ? colorMap[member.color] : undefined;
            const spanTotal = event.endDate
              ? differenceInCalendarDays(event.endDate, event.date) + 1
              : 1;
            const spanDay = differenceInCalendarDays(date, event.date) + 1;
            const actionLabel = [
              event.title,
              event.isAllDay
                ? "all day"
                : `${event.startTime} to ${event.endTime}`,
              memberName,
              spanTotal > 1 ? `day ${spanDay} of ${spanTotal}` : undefined,
              event.isRecurring ? "repeats" : undefined,
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <li key={getEventKey(event)}>
                <button
                  type="button"
                  aria-label={actionLabel}
                  onClick={() => closeForAction(() => onEventClick(event))}
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left hover:bg-accent"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-8 w-1 shrink-0 rounded-full",
                      colors?.bg ?? "bg-muted",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {event.title}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {event.isAllDay
                        ? "All day"
                        : `${event.startTime} – ${event.endTime}`}
                      {` · ${memberName}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => closeForAction(() => onOpenDay(date))}
          className="mt-2 min-h-11 w-full rounded-lg border border-border text-sm font-medium hover:bg-accent"
        >
          Open in Day view
        </button>
      </PopoverContent>
    </Popover>
  );
}
