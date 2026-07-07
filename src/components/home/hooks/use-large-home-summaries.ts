import { useChoresBoard, useLists, useMealsBoard } from "@/api";
import { formatLocalDate, getWeekStartSunday } from "@/lib/time-utils";
import {
  deriveChoresSummary,
  deriveListsSummary,
  deriveMealsSummary,
} from "../lib/large-home-selectors";

export function useLargeHomeSummaries({
  now = new Date(),
}: {
  now?: Date;
} = {}) {
  const weekStart = formatLocalDate(getWeekStartSunday(now));
  const chores = useChoresBoard();
  const meals = useMealsBoard(weekStart);
  const lists = useLists();

  return [
    deriveChoresSummary({
      board: chores.data?.data ?? null,
      isLoading: chores.isLoading,
      isError: chores.isError,
    }),
    deriveMealsSummary({
      board: meals.data?.data ?? null,
      today: now,
      isLoading: meals.isLoading,
      isError: meals.isError,
    }),
    deriveListsSummary({
      lists: lists.data?.data ?? null,
      isLoading: lists.isLoading,
      isError: lists.isError,
    }),
  ];
}
