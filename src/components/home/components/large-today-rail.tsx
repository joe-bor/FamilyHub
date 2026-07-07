import { format } from "date-fns";
import type { CalendarEvent, FamilyMember } from "@/lib/types";
import { colorMap, getFamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatEventTimeForDisplay } from "../lib/event-time";

function EventRow({
  event,
  members,
  onSelect,
}: {
  event: CalendarEvent;
  members: FamilyMember[];
  onSelect: (event: CalendarEvent) => void;
}) {
  const member = getFamilyMember(members, event.memberId);
  const colors = member ? colorMap[member.color] : colorMap.coral;
  const time = event.isAllDay
    ? "All day"
    : formatEventTimeForDisplay(event.startTime);

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className="flex min-h-14 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span
        aria-hidden="true"
        className={cn("h-2.5 w-2.5 shrink-0 rounded-full", colors.bg)}
      />
      <span className="w-20 shrink-0 text-sm font-medium text-foreground/60">
        {time}
      </span>
      <span className="min-w-0 flex-1 truncate text-lg font-semibold leading-7 text-foreground">
        {event.title}
      </span>
      {member && (
        <span className="shrink-0 text-sm text-muted-foreground">
          {member.name}
        </span>
      )}
    </button>
  );
}

export function LargeTodayRail({
  currentDate,
  todayItems,
  tomorrowItems,
  members,
  onSelect,
}: {
  currentDate: Date;
  todayItems: CalendarEvent[];
  tomorrowItems: CalendarEvent[];
  members: FamilyMember[];
  onSelect: (event: CalendarEvent) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col gap-6 rounded-lg border border-border/70 bg-card px-5 py-5 shadow-sm">
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="text-2xl font-semibold leading-8 text-foreground">
            Today
          </h3>
          <p className="text-sm font-medium text-muted-foreground">
            {format(currentDate, "EEE, MMM d")}
          </p>
        </div>
        {todayItems.length > 0 ? (
          <div className="space-y-1">
            {todayItems.map((event) => (
              <EventRow
                key={event.id ?? `${event.title}-${event.startTime}`}
                event={event}
                members={members}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            Rest of day clear
          </p>
        )}
      </section>

      {tomorrowItems.length > 0 && (
        <section className="border-t border-border/70 pt-5">
          <h3 className="mb-3 text-base font-semibold leading-6 text-foreground/70">
            Tomorrow
          </h3>
          <div className="space-y-1">
            {tomorrowItems.map((event) => (
              <EventRow
                key={event.id ?? `${event.title}-${event.startTime}`}
                event={event}
                members={members}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
