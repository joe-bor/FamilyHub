import { useChoresBoard, useMealsBoard } from "@/api";
import { formatLocalDate, getWeekStartSunday } from "@/lib/time-utils";

export function useStateLine({ now = new Date() }: { now?: Date } = {}) {
  const weekStart = formatLocalDate(getWeekStartSunday(now));
  const todayStr = formatLocalDate(now);
  const { data: chores } = useChoresBoard();
  const { data: meals } = useMealsBoard(weekStart);

  const choresRemaining = chores?.data?.today.summary.remaining ?? 0;

  const day = meals?.data?.days.find((d) => d.date === todayStr);
  const dinnerTitle =
    day?.slots.find((s) => s.mealType === "dinner")?.primary?.title ?? null;

  const isEmpty = choresRemaining === 0 && !dinnerTitle;
  return { choresRemaining, dinnerTitle, isEmpty };
}
