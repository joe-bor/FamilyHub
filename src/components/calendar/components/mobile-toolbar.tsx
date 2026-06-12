import { useEffect } from "react";
import type { FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCalendarStore } from "@/stores";
import { MemberAvatar } from "./member-avatar";

interface MobileToolbarProps {
  members: FamilyMember[];
}

const VIEW_PILLS = [
  { view: "daily", label: "D", ariaLabel: "Daily view" },
  { view: "weekly", label: "W", ariaLabel: "Weekly view" },
  { view: "monthly", label: "M", ariaLabel: "Monthly view" },
  { view: "schedule", label: "S", ariaLabel: "Schedule view" },
] as const;

export function MobileToolbar({ members }: MobileToolbarProps) {
  const calendarView = useCalendarStore((s) => s.calendarView);
  const setCalendarView = useCalendarStore((s) => s.setCalendarView);
  const filter = useCalendarStore((s) => s.filter);
  const toggleMember = useCalendarStore((s) => s.toggleMember);
  const initializeSelectedMembers = useCalendarStore(
    (s) => s.initializeSelectedMembers,
  );

  // Initialize selected members on first load or when persisted filter is stale
  useEffect(() => {
    if (members.length === 0) return;

    const currentMemberIds = members.map((m) => m.id);
    const hasValidSelection = filter.selectedMembers.some((id) =>
      currentMemberIds.includes(id),
    );

    if (filter.selectedMembers.length === 0 || !hasValidSelection) {
      initializeSelectedMembers(currentMemberIds);
    }
  }, [members, filter.selectedMembers, initializeSelectedMembers]);

  return (
    // Controls row — the title / Today / Menu row now lives in the shared
    // module-aware AppHeader; this bar owns only the calendar-specific controls.
    <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
      {/* View Switcher */}
      <div className="flex items-center gap-0.5 rounded-xl bg-muted p-1">
        {VIEW_PILLS.map(({ view, label, ariaLabel }) => (
          <button
            key={view}
            type="button"
            aria-label={ariaLabel}
            onClick={() => setCalendarView(view)}
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm leading-none font-semibold transition-colors",
              calendarView === view
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Member Filter Dots */}
      <div className="flex items-center gap-1">
        {members.map((member) => {
          const isIncluded = filter.selectedMembers.includes(member.id);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => toggleMember(member.id)}
              aria-label={`${member.name} filter`}
              className="rounded-full p-2 transition-colors hover:bg-muted"
            >
              <MemberAvatar
                name={member.name}
                color={member.color}
                size="md"
                variant={isIncluded ? "filled" : "ring"}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
