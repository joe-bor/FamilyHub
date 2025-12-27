import { Calendar, CalendarDays, CalendarRange, List } from "lucide-react";
import type React from "react";
import type { CalendarViewType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCalendarStore } from "@/stores";

const views: { id: CalendarViewType; label: string; icon: React.ReactNode }[] =
  [
    { id: "daily", label: "Day", icon: <Calendar className="w-4 h-4" /> },
    { id: "weekly", label: "Week", icon: <CalendarDays className="w-4 h-4" /> },
    {
      id: "monthly",
      label: "Month",
      icon: <CalendarRange className="w-4 h-4" />,
    },
    { id: "schedule", label: "Schedule", icon: <List className="w-4 h-4" /> },
  ];

export function CalendarViewSwitcher() {
  const calendarView = useCalendarStore((state) => state.calendarView);
  const setCalendarView = useCalendarStore((state) => state.setCalendarView);

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {views.map((v) => (
        <button
          key={v.id}
          onClick={() => setCalendarView(v.id)}
          className={cn(
            "flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 min-h-11 min-w-11 rounded-md text-sm font-medium transition-all",
            calendarView === v.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50",
          )}
        >
          {v.icon}
          <span className="hidden sm:inline">{v.label}</span>
        </button>
      ))}
    </div>
  );
}
