import { differenceInMinutes, format } from "date-fns";

function formatRelativeMinutes(
  minutes: number,
  absoluteDate: Date,
  prefix = "",
): string {
  if (minutes < 60) {
    return `${prefix}in ${minutes} min`;
  }

  if (minutes <= 6 * 60) {
    const hours = Math.floor(minutes / 60);
    const unit = hours === 1 ? "hr" : "hrs";
    return `${prefix}in ${hours} ${unit}`;
  }

  return `${prefix}at ${format(absoluteDate, "h:mm a")}`;
}

export function formatRelativeStart(start: Date, now: Date): string {
  return formatRelativeMinutes(differenceInMinutes(start, now), start);
}

export function formatRemainingEnd(end: Date, now: Date): string {
  return formatRelativeMinutes(differenceInMinutes(end, now), end, "ends ");
}
