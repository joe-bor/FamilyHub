import { addDays, isSameDay, startOfDay } from "date-fns";
import {
  formatLocalDate,
  getEventKey,
  getWeekStartSunday,
} from "@/lib/time-utils";
import type {
  CalendarEvent,
  ChoresBoard,
  ListSummary,
  MealBoard,
  MealType,
} from "@/lib/types";
import { getEventDateTime } from "./event-time";

export type SummaryStatus =
  | "loading"
  | "unavailable"
  | "empty"
  | "done"
  | "remaining"
  | "planned"
  | "missing"
  | "active"
  | "quiet";

export interface MealSlotTarget {
  weekStartDate: string;
  dayIndex: number;
  mealType: MealType;
}

export type HomeSummaryTarget =
  | { module: "chores" }
  | { module: "lists"; listId?: string }
  | ({ module: "meals" } & MealSlotTarget);

export interface HomeStateSummary {
  module: "chores" | "meals" | "lists";
  kind: SummaryStatus;
  label: string;
  target: HomeSummaryTarget;
}

export function selectRestOfDayItems(
  todayEvents: CalendarEvent[],
  heroEvent: CalendarEvent | null,
  now: Date,
  limit = 5,
): CalendarEvent[] {
  const heroKey = heroEvent ? getEventKey(heroEvent) : null;

  return todayEvents
    .filter((event) => getEventKey(event) !== heroKey)
    .filter((event) => {
      if (event.isAllDay) return true;
      return getEventDateTime(event, "end") > now;
    })
    .sort((left, right) => {
      if (left.isAllDay && !right.isAllDay) return -1;
      if (!left.isAllDay && right.isAllDay) return 1;
      return (
        getEventDateTime(left, "start").getTime() -
        getEventDateTime(right, "start").getTime()
      );
    })
    .slice(0, limit);
}

export function selectTomorrowPeek(
  comingUpEvents: CalendarEvent[],
  currentDate: Date,
  limit = 3,
): CalendarEvent[] {
  const tomorrow = startOfDay(addDays(currentDate, 1));

  const tomorrowItems = comingUpEvents
    .filter((event) => isSameDay(event.date, tomorrow))
    .sort(
      (left, right) =>
        getEventDateTime(left, "start").getTime() -
        getEventDateTime(right, "start").getTime(),
    )
    .slice(0, limit);

  if (tomorrowItems.length > 0) return tomorrowItems;

  return [...comingUpEvents]
    .sort(
      (left, right) =>
        getEventDateTime(left, "start").getTime() -
        getEventDateTime(right, "start").getTime(),
    )
    .slice(0, limit);
}

export function deriveChoresSummary({
  board,
  isLoading,
  isError,
}: {
  board: ChoresBoard | null | undefined;
  isLoading: boolean;
  isError: boolean;
}): HomeStateSummary {
  if (isLoading) {
    return {
      module: "chores",
      kind: "loading",
      label: "Loading chores",
      target: { module: "chores" },
    };
  }
  if (isError || !board) {
    return {
      module: "chores",
      kind: "unavailable",
      label: "Chores unavailable",
      target: { module: "chores" },
    };
  }

  const { total, remaining } = board.today.summary;
  if (total === 0) {
    return {
      module: "chores",
      kind: "empty",
      label: "No chores configured",
      target: { module: "chores" },
    };
  }
  if (remaining === 0) {
    return {
      module: "chores",
      kind: "done",
      label: "Chores done",
      target: { module: "chores" },
    };
  }

  return {
    module: "chores",
    kind: "remaining",
    label: `${remaining} chore${remaining === 1 ? "" : "s"} left`,
    target: { module: "chores" },
  };
}

export function getTodayDinnerTarget(
  board: MealBoard,
  today: Date,
): MealSlotTarget | null {
  const todayKey = formatLocalDate(today);
  const day = board.days.find((candidate) => candidate.date === todayKey);
  const slot = day?.slots.find((candidate) => candidate.mealType === "dinner");
  if (!day || !slot) return null;

  return {
    weekStartDate: board.weekStartDate,
    dayIndex: day.dayIndex,
    mealType: "dinner",
  };
}

export function deriveMealsSummary({
  board,
  today,
  isLoading,
  isError,
}: {
  board: MealBoard | null | undefined;
  today: Date;
  isLoading: boolean;
  isError: boolean;
}): HomeStateSummary {
  const fallbackTarget: MealSlotTarget = {
    weekStartDate: formatLocalDate(getWeekStartSunday(today)),
    dayIndex: today.getDay(),
    mealType: "dinner",
  };

  if (isLoading) {
    return {
      module: "meals",
      kind: "loading",
      label: "Loading meals",
      target: { module: "meals", ...fallbackTarget },
    };
  }
  if (isError || !board) {
    return {
      module: "meals",
      kind: "unavailable",
      label: "Meals unavailable",
      target: { module: "meals", ...fallbackTarget },
    };
  }

  const target = getTodayDinnerTarget(board, today) ?? fallbackTarget;
  const todayKey = formatLocalDate(today);
  const day = board.days.find((candidate) => candidate.date === todayKey);
  const dinner = day?.slots.find((slot) => slot.mealType === "dinner");
  const title = dinner?.primary?.title ?? dinner?.extras[0]?.title ?? null;

  if (title) {
    return {
      module: "meals",
      kind: "planned",
      label: `${title} tonight`,
      target: { module: "meals", ...target },
    };
  }

  return {
    module: "meals",
    kind: "missing",
    label: "Dinner not planned",
    target: { module: "meals", ...target },
  };
}

export function deriveListsSummary({
  lists,
  isLoading,
  isError,
}: {
  lists: ListSummary[] | null | undefined;
  isLoading: boolean;
  isError: boolean;
}): HomeStateSummary {
  if (isLoading) {
    return {
      module: "lists",
      kind: "loading",
      label: "Loading lists",
      target: { module: "lists" },
    };
  }
  if (isError || !lists) {
    return {
      module: "lists",
      kind: "unavailable",
      label: "Lists unavailable",
      target: { module: "lists" },
    };
  }

  const grocery = lists
    .filter((list) => list.kind === "grocery")
    .map((list) => ({
      ...list,
      activeItems: Math.max(0, list.totalItems - list.completedItems),
    }))
    .sort((left, right) => right.activeItems - left.activeItems)[0];

  if (grocery && grocery.activeItems > 0) {
    return {
      module: "lists",
      kind: "active",
      label: `${grocery.activeItems} grocery item${grocery.activeItems === 1 ? "" : "s"}`,
      target: { module: "lists", listId: grocery.id },
    };
  }

  return {
    module: "lists",
    kind: "quiet",
    label: "Lists quiet",
    target: { module: "lists" },
  };
}
