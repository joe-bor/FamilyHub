import { Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string; // "HH:mm" format (24h)
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  step?: number; // Minutes interval (default: 15)
  minTime?: string; // Minimum allowed time (for end time validation)
}

// Generate time options from 6:00 AM to 11:45 PM
function generateTimeOptions(startHour = 6, endHour = 23, step = 15): string[] {
  const times: string[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += step) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      times.push(`${h}:${m}`);
    }
  }
  return times;
}

// Convert 24h format to 12h display format
function formatTimeDisplay(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number.parseInt(hourStr, 10);
  const minute = minuteStr;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute} ${period}`;
}

function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  disabled = false,
  error = false,
  className,
  step = 15,
  minTime,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);

  const timeOptions = useMemo(() => generateTimeOptions(6, 23, step), [step]);

  const handleSelect = (time: string) => {
    onChange(time);
    setOpen(false);
  };

  const isTimeDisabled = (time: string): boolean => {
    if (!minTime) return false;
    return time <= minTime;
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
      <PopoverContent className="w-48 p-0" align="start">
        <ScrollArea className="h-64">
          <div className="p-2">
            {timeOptions.map((time) => {
              const isDisabled = isTimeDisabled(time);
              const isSelected = value === time;
              return (
                <button
                  key={time}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(time)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm rounded-md transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent",
                    isDisabled && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {formatTimeDisplay(time)}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export { TimePicker };
export type { TimePickerProps };
