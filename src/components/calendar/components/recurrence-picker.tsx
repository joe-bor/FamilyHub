import { format } from "date-fns";
import { useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  getOrdinalSuffix,
  type RecurrenceFrequency,
} from "@/lib/recurrence-utils";
import { formatLocalDate, parseLocalDate } from "@/lib/time-utils";
import { cn } from "@/lib/utils";

const DAY_BUTTONS = [
  { key: "MO", label: "M" },
  { key: "TU", label: "T" },
  { key: "WE", label: "W" },
  { key: "TH", label: "T" },
  { key: "FR", label: "F" },
  { key: "SA", label: "S" },
  { key: "SU", label: "S" },
] as const;

type RecurrenceOption =
  | "none"
  | "daily"
  | "weekly-on-day"
  | "weekly-custom"
  | "monthly";

interface RecurrencePickerProps {
  frequency: RecurrenceFrequency;
  interval: number;
  weeklyDays?: string[];
  monthDay?: number;
  endDate?: string;
  eventDate: string; // yyyy-MM-dd — used to derive day name
  onChange: (updates: {
    frequency: RecurrenceFrequency;
    interval: number;
    weeklyDays?: string[];
    monthDay?: number;
    endDate?: string;
  }) => void;
}

function getEventDayAbbr(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return format(date, "EEEEEE").toUpperCase().slice(0, 2);
}

function getEventDayName(dateStr: string): string {
  return format(parseLocalDate(dateStr), "EEEE");
}

function getEventMonthDay(dateStr: string): number {
  return parseLocalDate(dateStr).getDate();
}

function deriveOption(
  frequency: RecurrenceFrequency,
  weeklyDays?: string[],
  eventDate?: string,
): RecurrenceOption {
  if (frequency === "none") return "none";
  if (frequency === "daily") return "daily";
  if (frequency === "monthly") return "monthly";
  if (frequency === "weekly") {
    if (!weeklyDays || weeklyDays.length === 0) return "weekly-on-day";
    if (
      eventDate &&
      weeklyDays.length === 1 &&
      weeklyDays[0] === getEventDayAbbr(eventDate)
    ) {
      return "weekly-on-day";
    }
    return "weekly-custom";
  }
  return "none";
}

function RecurrencePicker({
  frequency,
  interval,
  weeklyDays,
  monthDay,
  endDate,
  eventDate,
  onChange,
}: RecurrencePickerProps) {
  // Track when user explicitly picks "weekly-custom" — deriveOption can't
  // distinguish it from "weekly-on-day" when only the event's day is selected.
  const [forceCustom, setForceCustom] = useState(false);
  const selectedOption =
    forceCustom && frequency === "weekly"
      ? "weekly-custom"
      : deriveOption(frequency, weeklyDays, eventDate);
  const isRepeating = frequency !== "none";

  const handleOptionChange = (option: RecurrenceOption) => {
    setForceCustom(option === "weekly-custom");
    switch (option) {
      case "none":
        onChange({
          frequency: "none",
          interval: 1,
          weeklyDays: undefined,
          monthDay: undefined,
          endDate: undefined,
        });
        break;
      case "daily":
        onChange({
          frequency: "daily",
          interval,
          weeklyDays: undefined,
          monthDay: undefined,
          endDate,
        });
        break;
      case "weekly-on-day":
        onChange({
          frequency: "weekly",
          interval,
          weeklyDays: [getEventDayAbbr(eventDate)],
          monthDay: undefined,
          endDate,
        });
        break;
      case "weekly-custom":
        onChange({
          frequency: "weekly",
          interval,
          weeklyDays: weeklyDays?.length
            ? weeklyDays
            : [getEventDayAbbr(eventDate)],
          monthDay: undefined,
          endDate,
        });
        break;
      case "monthly":
        onChange({
          frequency: "monthly",
          interval,
          weeklyDays: undefined,
          monthDay: monthDay || getEventMonthDay(eventDate),
          endDate,
        });
        break;
    }
  };

  const toggleDay = (day: string) => {
    const current = weeklyDays ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    onChange({
      frequency: "weekly",
      interval,
      weeklyDays: next.length > 0 ? next : undefined,
      monthDay: undefined,
      endDate,
    });
  };

  const endDateAsDate = endDate ? parseLocalDate(endDate) : undefined;

  return (
    <div className="space-y-3">
      {/* Frequency dropdown */}
      <div className="space-y-2">
        <Label>Repeat</Label>
        <select
          value={selectedOption}
          onChange={(e) =>
            handleOptionChange(e.target.value as RecurrenceOption)
          }
          className="flex h-10 w-full rounded-md border border-input bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="none">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly-on-day">
            Weekly on {getEventDayName(eventDate)}
          </option>
          <option value="weekly-custom">Weekly on custom days...</option>
          <option value="monthly">
            Monthly on the {getOrdinalSuffix(getEventMonthDay(eventDate))}
          </option>
        </select>
      </div>

      {/* Day-of-week toggles for custom weekly */}
      {selectedOption === "weekly-custom" && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Repeat on</Label>
          <div className="flex gap-1.5">
            {DAY_BUTTONS.map(({ key, label }) => {
              const isSelected = weeklyDays?.includes(key) ?? false;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDay(key)}
                  className={cn(
                    "w-9 h-9 rounded-full text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                  aria-label={key}
                  aria-pressed={isSelected}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Interval selector */}
      {isRepeating && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">
            Every
          </Label>
          <input
            type="number"
            min={1}
            max={99}
            value={interval}
            onChange={(e) => {
              const val = Math.max(1, Number.parseInt(e.target.value, 10) || 1);
              onChange({
                frequency,
                interval: val,
                weeklyDays,
                monthDay,
                endDate,
              });
            }}
            className="w-16 h-8 rounded-md border border-input bg-input px-2 text-sm text-center"
          />
          <span className="text-xs text-muted-foreground">
            {frequency === "daily"
              ? interval === 1
                ? "day"
                : "days"
              : frequency === "weekly"
                ? interval === 1
                  ? "week"
                  : "weeks"
                : interval === 1
                  ? "month"
                  : "months"}
          </span>
        </div>
      )}

      {/* End date */}
      {isRepeating && (
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Label className="text-xs text-muted-foreground">Ends</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="recurrence-end"
                  checked={!endDate}
                  onChange={() =>
                    onChange({
                      frequency,
                      interval,
                      weeklyDays,
                      monthDay,
                      endDate: undefined,
                    })
                  }
                  className="accent-primary"
                />
                Never
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="recurrence-end"
                  checked={!!endDate}
                  onChange={() => {
                    if (!endDate) {
                      onChange({
                        frequency,
                        interval,
                        weeklyDays,
                        monthDay,
                        endDate: eventDate,
                      });
                    }
                  }}
                  className="accent-primary"
                />
                On date
              </label>
            </div>
          </div>
          {endDate && (
            <DatePicker
              value={endDateAsDate}
              onChange={(date) => {
                onChange({
                  frequency,
                  interval,
                  weeklyDays,
                  monthDay,
                  endDate: date ? formatLocalDate(date) : undefined,
                });
              }}
              placeholder="Pick end date"
              fromDate={parseLocalDate(eventDate)}
            />
          )}
        </div>
      )}
    </div>
  );
}

export type { RecurrencePickerProps };
export { RecurrencePicker };
