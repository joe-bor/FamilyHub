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
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={onPrevious}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Previous"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <button
        onClick={onToday}
        disabled={isViewingToday}
        className={cn(
          "flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
          isViewingToday
            ? "bg-primary/10 text-primary cursor-default"
            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        )}
      >
        <CalendarCheck className="h-4 w-4" />
        <span>Today</span>
      </button>

      <h2 className="min-w-0 truncate text-center text-base font-semibold text-foreground sm:min-w-[8rem] sm:text-lg">
        {label}
      </h2>

      <Button
        variant="ghost"
        size="icon-lg"
        onClick={onNext}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Next"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
