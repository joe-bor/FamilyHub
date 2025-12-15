import type React from "react"

import { Calendar, CalendarDays, CalendarRange, List } from "lucide-react"
import { cn } from "@/lib/utils"

export type CalendarViewType = "daily" | "weekly" | "monthly" | "schedule"

interface CalendarViewSwitcherProps {
  view: CalendarViewType
  onViewChange: (view: CalendarViewType) => void
}

const views: { id: CalendarViewType; label: string; icon: React.ReactNode }[] = [
  { id: "daily", label: "Day", icon: <Calendar className="w-4 h-4" /> },
  { id: "weekly", label: "Week", icon: <CalendarDays className="w-4 h-4" /> },
  { id: "monthly", label: "Month", icon: <CalendarRange className="w-4 h-4" /> },
  { id: "schedule", label: "Schedule", icon: <List className="w-4 h-4" /> },
]

export function CalendarViewSwitcher({ view, onViewChange }: CalendarViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {views.map((v) => (
        <button
          key={v.id}
          onClick={() => onViewChange(v.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            view === v.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50",
          )}
        >
          {v.icon}
          <span>{v.label}</span>
        </button>
      ))}
    </div>
  )
}
