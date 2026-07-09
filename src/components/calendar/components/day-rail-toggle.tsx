import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDayRailState } from "@/stores";

export function DayRailToggle() {
  const { dayRailHidden, toggleDayRail } = useDayRailState();
  const Icon = dayRailHidden ? PanelRightOpen : PanelRightClose;

  return (
    <button
      type="button"
      onClick={toggleDayRail}
      aria-pressed={!dayRailHidden}
      aria-label={
        dayRailHidden ? "Show month navigator" : "Hide month navigator"
      }
      className={cn(
        "flex min-h-11 min-w-11 items-center justify-center rounded-full border transition-colors",
        dayRailHidden
          ? "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
          : "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
