import { endOfWeek, format, startOfWeek } from "date-fns";
import { Menu } from "lucide-react";
import { useEffect } from "react";
import type { FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCalendarStore, useIsViewingToday } from "@/stores";
import { MemberAvatar } from "./member-avatar";

interface MobileToolbarProps {
  members: FamilyMember[];
  onOpenSidebar: () => void;
}

const VIEW_PILLS = [
  { view: "daily", label: "D", ariaLabel: "Daily view" },
  { view: "weekly", label: "W", ariaLabel: "Weekly view" },
  { view: "monthly", label: "M", ariaLabel: "Monthly view" },
  { view: "schedule", label: "S", ariaLabel: "Schedule view" },
] as const;

function getContextLabel(calendarView: string, currentDate: Date): string {
  switch (calendarView) {
    case "monthly":
      return format(currentDate, "MMMM yyyy");
    case "weekly": {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
      return sameMonth
        ? `${format(weekStart, "MMM d")} \u2013 ${format(weekEnd, "d")}`
        : `${format(weekStart, "MMM d")} \u2013 ${format(weekEnd, "MMM d")}`;
    }
    case "daily":
      return format(currentDate, "EEE, MMM d");
    case "schedule":
      return "Upcoming";
    default:
      return format(currentDate, "MMMM yyyy");
  }
}

export function MobileToolbar({ members, onOpenSidebar }: MobileToolbarProps) {
  const calendarView = useCalendarStore((s) => s.calendarView);
  const currentDate = useCalendarStore((s) => s.currentDate);
  const setCalendarView = useCalendarStore((s) => s.setCalendarView);
  const goToToday = useCalendarStore((s) => s.goToToday);
  const filter = useCalendarStore((s) => s.filter);
  const toggleMember = useCalendarStore((s) => s.toggleMember);
  const initializeSelectedMembers = useCalendarStore(
    (s) => s.initializeSelectedMembers,
  );
  const isViewingToday = useIsViewingToday();

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

  const contextLabel = getContextLabel(calendarView, currentDate);

  return (
    <div className="flex flex-col border-b border-border bg-background">
      {/* Row 1: Header Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[22px] leading-7 font-semibold text-foreground">
          {contextLabel}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-sm leading-5 font-semibold transition-colors",
              isViewingToday
                ? "text-primary/50"
                : "text-primary hover:bg-primary/10",
            )}
          >
            Today
          </button>
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Menu"
            className="-my-1 flex h-11 w-11 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Row 2: Controls Bar */}
      <div className="flex items-center justify-between gap-3 px-4 pb-3">
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
    </div>
  );
}
