import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CalendarNavigationProps {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  isViewingToday: boolean;
}

export function CalendarNavigation({
  label,
  onPrevious,
  onNext,
  onToday,
  isViewingToday,
}: CalendarNavigationProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevious}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label="Previous"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <button
        onClick={onToday}
        disabled={isViewingToday}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
          isViewingToday
            ? "bg-primary/10 text-primary cursor-default"
            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        )}
      >
        <CalendarCheck className="w-4 h-4" />
        <span>Today</span>
      </button>

      <h2 className="text-lg font-semibold text-foreground min-w-[200px] text-center">
        {label}
      </h2>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label="Next"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
