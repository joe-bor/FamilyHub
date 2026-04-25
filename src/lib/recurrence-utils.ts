/**
 * Utilities for converting between RecurrenceFormState and RRULE strings.
 * RRULE follows RFC 5545 format — the same format Google Calendar uses.
 */

import { format } from "date-fns";

export type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly";

export interface RecurrenceFormState {
  frequency: RecurrenceFrequency;
  interval: number;
  weeklyDays?: string[];
  monthDay?: number;
  endDate?: string; // yyyy-MM-dd
}

const FREQ_MAP: Record<Exclude<RecurrenceFrequency, "none">, string> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
};

const DAY_ABBR_TO_FULL: Record<string, string> = {
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
  SU: "Sun",
};

const DAY_ORDER = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

export function getOrdinalSuffix(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  const lastOne = n % 10;
  if (lastOne === 1) return `${n}st`;
  if (lastOne === 2) return `${n}nd`;
  if (lastOne === 3) return `${n}rd`;
  return `${n}th`;
}

/**
 * Convert RecurrenceFormState to an RRULE string.
 * Returns null for frequency "none".
 */
export function buildRRule(state: RecurrenceFormState): string | null {
  if (state.frequency === "none") return null;

  const parts: string[] = [`FREQ=${FREQ_MAP[state.frequency]}`];

  if (state.interval > 1) {
    parts.push(`INTERVAL=${state.interval}`);
  }

  if (
    state.frequency === "weekly" &&
    state.weeklyDays &&
    state.weeklyDays.length > 0
  ) {
    const sorted = [...state.weeklyDays].sort(
      (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b),
    );
    parts.push(`BYDAY=${sorted.join(",")}`);
  }

  if (state.frequency === "monthly" && state.monthDay) {
    parts.push(`BYMONTHDAY=${state.monthDay}`);
  }

  if (state.endDate) {
    const until = state.endDate.replace(/-/g, "");
    parts.push(`UNTIL=${until}`);
  }

  return parts.join(";");
}

/**
 * Parse an RRULE string back into RecurrenceFormState.
 * Used when editing a recurring event in "edit all" mode.
 */
export function parseRRule(rrule: string): RecurrenceFormState {
  const rule = rrule;
  const params = new Map<string, string>();

  for (const part of rule.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx > 0) {
      params.set(part.slice(0, eqIdx), part.slice(eqIdx + 1));
    }
  }

  const freqRaw = params.get("FREQ");
  let frequency: RecurrenceFrequency = "none";
  if (freqRaw === "DAILY") frequency = "daily";
  else if (freqRaw === "WEEKLY") frequency = "weekly";
  else if (freqRaw === "MONTHLY") frequency = "monthly";

  const interval = params.has("INTERVAL")
    ? Number.parseInt(params.get("INTERVAL")!, 10)
    : 1;

  const weeklyDays = params.has("BYDAY")
    ? params.get("BYDAY")!.split(",")
    : undefined;

  const monthDay = params.has("BYMONTHDAY")
    ? Number.parseInt(params.get("BYMONTHDAY")!, 10)
    : undefined;

  let endDate: string | undefined;
  if (params.has("UNTIL")) {
    const until = params.get("UNTIL")!;
    // Convert yyyyMMdd to yyyy-MM-dd
    endDate = `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}`;
  }

  return { frequency, interval, weeklyDays, monthDay, endDate };
}

/**
 * Format an RRULE into a human-readable label for display.
 * Examples: "Daily", "Weekly on Tue, Thu, Fri", "Every 2 weeks on Mon",
 *           "Monthly on the 15th", "Daily until Jun 15, 2026"
 */
export function formatRecurrenceLabel(rrule: string, eventDate: Date): string {
  const state = parseRRule(rrule);

  const intervalPrefix = state.interval > 1 ? `Every ${state.interval} ` : "";

  let base: string;

  switch (state.frequency) {
    case "daily":
      base = intervalPrefix ? `${intervalPrefix}days` : "Daily";
      break;
    case "weekly": {
      const unit = intervalPrefix ? `${intervalPrefix}weeks` : "Weekly";
      if (state.weeklyDays && state.weeklyDays.length > 0) {
        const sorted = [...state.weeklyDays].sort(
          (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b),
        );
        const dayNames = sorted.map((d) => DAY_ABBR_TO_FULL[d] ?? d);
        base = `${unit} on ${dayNames.join(", ")}`;
      } else {
        const dayName = format(eventDate, "EEEE");
        base = `${unit} on ${dayName}`;
      }
      break;
    }
    case "monthly": {
      const unit = intervalPrefix ? `${intervalPrefix}months` : "Monthly";
      if (state.monthDay) {
        base = `${unit} on the ${getOrdinalSuffix(state.monthDay)}`;
      } else {
        const day = eventDate.getDate();
        base = `${unit} on the ${getOrdinalSuffix(day)}`;
      }
      break;
    }
    default:
      return "Does not repeat";
  }

  if (state.endDate) {
    const endDate = new Date(
      Number.parseInt(state.endDate.slice(0, 4), 10),
      Number.parseInt(state.endDate.slice(5, 7), 10) - 1,
      Number.parseInt(state.endDate.slice(8, 10), 10),
    );
    const formatted = format(endDate, "MMM d, yyyy");
    return `${base} until ${formatted}`;
  }

  return base;
}
