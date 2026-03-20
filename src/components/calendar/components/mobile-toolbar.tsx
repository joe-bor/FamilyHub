import { endOfWeek, format, startOfWeek } from "date-fns";
import { Home, Menu } from "lucide-react";
import { useEffect } from "react";
import type { FamilyMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCalendarStore, useIsViewingToday } from "@/stores";
import { MemberAvatar } from "./member-avatar";

interface MobileToolbarProps {
  members: FamilyMember[];
  onOpenSidebar: () => void;
  onGoHome: () => void;
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
      return `${format(weekStart, "MMM d")} \u2013 ${format(weekEnd, "d")}`;
    }
    case "daily":
      return format(currentDate, "EEE, MMM d");
    case "schedule":
      return "Upcoming";
    default:
      return format(currentDate, "MMMM yyyy");
  }
}

export function MobileToolbar({
  members,
  onOpenSidebar,
  onGoHome,
}: MobileToolbarProps) {
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
    <div className="flex flex-col bg-background border-b border-border">
      {/* Row 1: Header Bar */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-semibold text-foreground">
          {contextLabel}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToToday}
            className={cn(
              "px-2 py-1 text-sm font-semibold rounded",
              isViewingToday ? "text-primary/50" : "text-primary",
            )}
          >
            Today
          </button>
          <button
            type="button"
            onClick={onGoHome}
            aria-label="Home"
            className="p-2 text-foreground/70 hover:text-foreground"
          >
            <Home className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Menu"
            className="p-2 text-foreground/70 hover:text-foreground"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Controls Bar */}
      <div className="flex items-center justify-between px-3 pb-2">
        {/* View Switcher */}
        <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
          {VIEW_PILLS.map(({ view, label, ariaLabel }) => (
            <button
              key={view}
              type="button"
              aria-label={ariaLabel}
              onClick={() => setCalendarView(view)}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                calendarView === view
                  ? "bg-primary text-primary-foreground"
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
                className="p-2.5"
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
