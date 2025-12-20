import { Check, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface FilterState {
  selectedMembers: string[];
  showAllDayEvents: boolean;
}

interface CalendarFilterProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
}

export function CalendarFilter({
  filter,
  onFilterChange,
}: CalendarFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleAllDayEvents = () => {
    onFilterChange({ ...filter, showAllDayEvents: !filter.showAllDayEvents });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors",
          isOpen || !filter.showAllDayEvents
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        )}
        title="More options"
      >
        <Settings2 className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-card rounded-xl shadow-lg border border-border z-50 overflow-hidden">
          <div className="p-2">
            <button
              onClick={toggleAllDayEvents}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                filter.showAllDayEvents ? "bg-muted" : "hover:bg-muted/50",
              )}
            >
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                <span className="text-[10px] font-medium">24</span>
              </div>
              <span className="flex-1 text-left text-sm text-foreground">
                All Day Events
              </span>
              <div
                className={cn(
                  "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                  filter.showAllDayEvents
                    ? "bg-primary border-primary"
                    : "border-border",
                )}
              >
                {filter.showAllDayEvents && (
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                )}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
