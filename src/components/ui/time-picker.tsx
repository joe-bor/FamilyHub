import { Clock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string; // "HH:mm" format (24h)
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0-59
const PERIODS = ["AM", "PM"] as const;

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

// Convert 24h format to 12h components
function parse24hTo12h(time: string): {
  hour: number;
  minute: number;
  period: "AM" | "PM";
} {
  const [hourStr, minuteStr] = time.split(":");
  const hour24 = Number.parseInt(hourStr, 10);
  const minute = Number.parseInt(minuteStr, 10);

  let hour12: number;
  let period: "AM" | "PM";

  if (hour24 === 0) {
    hour12 = 12;
    period = "AM";
  } else if (hour24 === 12) {
    hour12 = 12;
    period = "PM";
  } else if (hour24 > 12) {
    hour12 = hour24 - 12;
    period = "PM";
  } else {
    hour12 = hour24;
    period = "AM";
  }

  return { hour: hour12, minute, period };
}

// Convert 12h components to 24h format string
function format12hTo24h(
  hour: number,
  minute: number,
  period: "AM" | "PM",
): string {
  let hour24: number;

  if (period === "AM") {
    hour24 = hour === 12 ? 0 : hour;
  } else {
    hour24 = hour === 12 ? 12 : hour + 12;
  }

  return `${hour24.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

// Format for display in trigger button
function formatTimeDisplay(time: string): string {
  const { hour, minute, period } = parse24hTo12h(time);
  return `${hour}:${minute.toString().padStart(2, "0")} ${period}`;
}

interface WheelColumnProps<T extends string | number> {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  formatItem?: (item: T) => string;
}

function WheelColumn<T extends string | number>({
  items,
  value,
  onChange,
  formatItem = (item) => String(item),
}: WheelColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const hasInitializedRef = useRef(false);

  const selectedIndex = items.indexOf(value);

  // Scroll to selected item on mount and when value changes externally
  useEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      const targetScroll = selectedIndex * ITEM_HEIGHT;

      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = targetScroll;
          hasInitializedRef.current = true;
        }
      });
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    isScrollingRef.current = true;

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Debounce the selection
    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;

      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));

      // Snap to position
      containerRef.current.scrollTop = clampedIndex * ITEM_HEIGHT;

      const newValue = items[clampedIndex];
      if (newValue !== value) {
        onChange(newValue);
      }

      isScrollingRef.current = false;
    }, 100);
  }, [items, value, onChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleItemClick = (item: T, index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: "smooth",
      });
    }
    onChange(item);
  };

  // Calculate padding to center first/last items
  const paddingHeight = ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;

  return (
    <div className="relative h-[200px] w-16 overflow-hidden">
      {/* Selection highlight - z-0 so it's behind items */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-md bg-accent"
        style={{ height: ITEM_HEIGHT }}
      />

      {/* Scrollable content - z-10 so items appear above highlight */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative z-10 h-full overflow-y-auto scrollbar-hide"
        style={{
          scrollSnapType: "y mandatory",
        }}
      >
        {/* Top padding */}
        <div style={{ height: paddingHeight }} />

        {items.map((item, index) => {
          const isSelected = item === value;
          return (
            <button
              key={item}
              type="button"
              onClick={() => handleItemClick(item, index)}
              className={cn(
                "flex w-full items-center justify-center text-lg transition-all",
                isSelected
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
              style={{
                height: ITEM_HEIGHT,
                scrollSnapAlign: "center",
              }}
            >
              {formatItem(item)}
            </button>
          );
        })}

        {/* Bottom padding */}
        <div style={{ height: paddingHeight }} />
      </div>

      {/* Fade overlays - z-20 on top of everything */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-popover to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-popover to-transparent" />
    </div>
  );
}

function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  disabled = false,
  error = false,
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [mountKey, setMountKey] = useState(0);

  // Parse current value or use defaults
  const parsed = value
    ? parse24hTo12h(value)
    : { hour: 9, minute: 0, period: "AM" as const };
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(parsed.period);

  // Sync internal state when value prop changes
  useEffect(() => {
    if (value) {
      const p = parse24hTo12h(value);
      setHour(p.hour);
      setMinute(p.minute);
      setPeriod(p.period);
    }
  }, [value]);

  // Force re-mount of wheel columns when popover opens
  useEffect(() => {
    if (open) {
      setMountKey((k) => k + 1);
    }
  }, [open]);

  const handleConfirm = () => {
    const time24 = format12hTo24h(hour, minute, period);
    onChange(time24);
    setOpen(false);
  };

  const handleCancel = () => {
    // Reset to original value
    if (value) {
      const p = parse24hTo12h(value);
      setHour(p.hour);
      setMinute(p.minute);
      setPeriod(p.period);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal bg-input hover:bg-input/80",
            !value && "text-muted-foreground",
            error && "border-destructive ring-destructive/20",
            className,
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value ? formatTimeDisplay(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="flex gap-2">
          {/* Hours */}
          <WheelColumn
            key={`hour-${mountKey}`}
            items={HOURS}
            value={hour}
            onChange={setHour}
          />

          {/* Minutes */}
          <WheelColumn
            key={`minute-${mountKey}`}
            items={MINUTES}
            value={minute}
            onChange={setMinute}
            formatItem={(m) => m.toString().padStart(2, "0")}
          />

          {/* AM/PM */}
          <WheelColumn
            key={`period-${mountKey}`}
            items={PERIODS}
            value={period}
            onChange={setPeriod}
          />
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            OK
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { TimePicker };
export type { TimePickerProps };
