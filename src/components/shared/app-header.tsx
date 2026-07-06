import { Menu } from "lucide-react";
import { useFamilyMembers, useFamilyName } from "@/api";
import { getContextLabel } from "@/components/calendar/utils/context-label";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks";
import { colorMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  type ModuleType,
  useAppStore,
  useCalendarStore,
  useIsViewingToday,
} from "@/stores";

const MODULE_TITLES: Record<Exclude<ModuleType, "calendar">, string> = {
  lists: "Lists",
  chores: "Chores",
  meals: "Meals",
  recipes: "Recipes",
  photos: "Photos",
};

export function AppHeader() {
  // From calendar-store
  const currentDate = useCalendarStore((state) => state.currentDate);
  const calendarView = useCalendarStore((state) => state.calendarView);
  const goToToday = useCalendarStore((state) => state.goToToday);
  const isViewingToday = useIsViewingToday();

  // From family-store
  const familyName = useFamilyName();
  const familyMembers = useFamilyMembers();

  // From app-store
  const openSidebar = useAppStore((state) => state.openSidebar);
  const activeModule = useAppStore((state) => state.activeModule);

  // Mobile detection
  const isMobile = useIsMobile();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Mobile: a single module-aware row — title left, contextual actions + Menu
  // right. The title reflects where you are (family name on Home, calendar
  // context label on Calendar, module name elsewhere).
  if (isMobile) {
    const mobileTitle =
      activeModule === null
        ? familyName || "Family Hub"
        : activeModule === "calendar"
          ? getContextLabel(calendarView, currentDate)
          : MODULE_TITLES[activeModule];

    return (
      <header className="shrink-0 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 flex items-center justify-between gap-3 min-h-16 px-4 py-3">
        <h1 className="min-w-0 truncate text-[22px] leading-7 font-semibold text-foreground">
          {mobileTitle}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          {activeModule === "calendar" && (
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
          )}
          <button
            type="button"
            onClick={openSidebar}
            aria-label="Menu"
            className="-my-1 flex h-11 w-11 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>
    );
  }

  // Desktop: one compact row — Menu, family name, date/time inline, member
  // dots right. No weather chip until a real weather feature exists.
  return (
    <header
      className={cn(
        "shrink-0 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85",
        "flex items-center justify-between gap-4",
        "px-6 py-2",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Menu"
          className="text-muted-foreground hover:text-foreground"
          onClick={openSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-lg leading-7 font-semibold text-foreground">
          {familyName || "Family Hub"}
        </h1>
        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
          <span>{formatDate(currentDate)}</span>
          <span>•</span>
          <span>{formatTime(new Date())}</span>
        </div>
      </div>

      {/* Family member indicators - used for calendar filtering */}
      {familyMembers.length > 0 && (
        <div className="flex shrink-0 items-center gap-1.5">
          {familyMembers.slice(0, 6).map((member) => (
            <div
              key={member.id}
              className={cn("h-3 w-3 rounded-full", colorMap[member.color].bg)}
              title={member.name}
            />
          ))}
        </div>
      )}
    </header>
  );
}
