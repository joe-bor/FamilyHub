import { Clock } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  infiniteScroll?: boolean;
}

// Number of times to repeat items for infinite scroll effect
const REPEAT_COUNT = 5;

function WheelColumn<T extends string | number>({
  items,
  value,
  onChange,
  formatItem = (item) => String(item),
  infiniteScroll = true,
}: WheelColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRepositioningRef = useRef(false);

  const itemCount = items.length;
  const selectedIndex = items.indexOf(value);

  // For infinite scroll: repeat items 5x. Otherwise use items as-is.
  const displayItems = useMemo(
    () =>
      infiniteScroll
        ? Array.from({ length: REPEAT_COUNT }, () => items).flat()
        : items,
    [items, infiniteScroll],
  );
  const middleSetOffset = infiniteScroll
    ? Math.floor(REPEAT_COUNT / 2) * itemCount
    : 0;
  const totalItemCount = displayItems.length;

  // Get the scroll position for a given item index (in original items array)
  const getScrollPosition = useCallback(
    (index: number) => (middleSetOffset + index) * ITEM_HEIGHT,
    [middleSetOffset],
  );

  // Scroll to selected item on mount and when value changes externally
  useEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      const targetScroll = getScrollPosition(selectedIndex);

      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = targetScroll;
        }
      });
    }
  }, [selectedIndex, getScrollPosition]);

  // Handle infinite scroll repositioning (only when infiniteScroll is enabled)
  const repositionIfNeeded = useCallback(() => {
    if (!infiniteScroll) return;
    if (!containerRef.current || isRepositioningRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const totalHeight = totalItemCount * ITEM_HEIGHT;

    // Define boundaries for repositioning (when user scrolls too far from center)
    const lowerBound = itemCount * ITEM_HEIGHT;
    const upperBound = totalHeight - itemCount * 2 * ITEM_HEIGHT;

    if (scrollTop < lowerBound || scrollTop > upperBound) {
      isRepositioningRef.current = true;

      // Calculate current position within the item cycle
      const currentOffset = scrollTop % (itemCount * ITEM_HEIGHT);
      // Jump to equivalent position in middle set
      const newScrollTop = middleSetOffset * ITEM_HEIGHT + currentOffset;

      containerRef.current.scrollTop = newScrollTop;

      requestAnimationFrame(() => {
        isRepositioningRef.current = false;
      });
    }
  }, [infiniteScroll, itemCount, middleSetOffset, totalItemCount]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || isRepositioningRef.current) return;

    isScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current || isRepositioningRef.current) return;

      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);

      // Get the actual item index (modulo original items length for infinite, clamped for finite)
      const actualIndex = infiniteScroll
        ? ((index % itemCount) + itemCount) % itemCount
        : Math.max(0, Math.min(index, itemCount - 1));

      // Snap to position
      const snappedScroll = infiniteScroll
        ? index * ITEM_HEIGHT
        : actualIndex * ITEM_HEIGHT;
      containerRef.current.scrollTop = snappedScroll;

      const newValue = items[actualIndex];
      if (newValue !== value) {
        onChange(newValue);
      }

      // Reposition to middle set after snapping (only for infinite scroll)
      if (infiniteScroll) {
        repositionIfNeeded();
      }

      isScrollingRef.current = false;
    }, 100);
  }, [items, itemCount, value, onChange, infiniteScroll, repositionIfNeeded]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleItemClick = (actualIndex: number) => {
    if (containerRef.current) {
      const targetScroll = getScrollPosition(actualIndex);
      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    }
    onChange(items[actualIndex]);
  };

  // Calculate padding to center first/last items
  const paddingHeight = ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;

  return (
    <div className="relative h-[200px] w-16 overflow-hidden">
      {/* Selection highlight - z-0, with accent color and subtle border */}
      <div
        className="pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2 rounded-lg bg-primary/15 ring-1 ring-primary/30"
        style={{ height: ITEM_HEIGHT }}
      />

      {/* Scrollable content with touch optimizations */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative z-10 h-full overflow-y-auto scrollbar-hide"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          overscrollBehavior: "contain",
        }}
      >
        {/* Top padding */}
        <div style={{ height: paddingHeight }} />

        {displayItems.map((item, displayIndex) => {
          // Calculate the actual index in the original items array
          const actualIndex = infiniteScroll
            ? displayIndex % itemCount
            : displayIndex;
          const isSelected = item === value;

          return (
            <button
              key={`${item}-${displayIndex}`}
              type="button"
              onClick={() => handleItemClick(actualIndex)}
              className={cn(
                "flex w-full items-center justify-center transition-all duration-150",
                isSelected
                  ? "text-xl font-bold text-primary"
                  : "text-base text-muted-foreground/70",
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
            infiniteScroll={false}
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
