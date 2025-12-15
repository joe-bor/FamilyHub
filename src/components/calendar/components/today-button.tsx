import { CalendarCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface TodayButtonProps {
  onClick: () => void
  isToday: boolean
}

export function TodayButton({ onClick, isToday }: TodayButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isToday}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
        isToday
          ? "bg-primary/10 text-primary cursor-default"
          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
      )}
    >
      <CalendarCheck className="w-4 h-4" />
      <span>Today</span>
    </button>
  )
}
