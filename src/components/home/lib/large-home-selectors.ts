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
  MealDay,
  MealSlot,
  MealType,
} from "@/lib/types";
import {
  compareAllDayFirst,
  compareByStartDateTime,
  getEventDateTime,
} from "./event-time";

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

/**
 * Rest-of-day agenda items, excluding the hero by event KEY (recurring-safe:
 * matches on id, or recurringEventId+date for expanded instances) so the same
 * recurring instance isn't duplicated. All-day events always survive the
 * ended-filter regardless of `now`; timed events are dropped once ended.
 */
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
    .sort(compareAllDayFirst)
    .slice(0, limit);
}

export interface TomorrowPeek {
  items: CalendarEvent[];
  /** True when `items` are actually tomorrow's events; false for the fallback. */
  isTomorrow: boolean;
}

/**
 * Small look-ahead into tomorrow. Assumes `comingUpEvents` already excludes
 * today. Falls back to the earliest upcoming events (beyond tomorrow) when
 * tomorrow itself has nothing scheduled, so the peek is never empty while
 * later events exist. Callers should use `isTomorrow` to label the fallback
 * section as "Coming up" rather than "Tomorrow".
 */
export function selectTomorrowPeek(
  comingUpEvents: CalendarEvent[],
  currentDate: Date,
  limit = 3,
): TomorrowPeek {
  const tomorrow = startOfDay(addDays(currentDate, 1));

  const tomorrowItems = comingUpEvents
    .filter((event) => isSameDay(event.date, tomorrow))
    .sort(compareByStartDateTime)
    .slice(0, limit);

  if (tomorrowItems.length > 0)
    return { items: tomorrowItems, isTomorrow: true };

  return {
    items: [...comingUpEvents].sort(compareByStartDateTime).slice(0, limit),
    isTomorrow: false,
  };
}

/** Summaries always carry a routing target, even when loading or unavailable. */
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

/** Locates today's day entry and dinner slot in a single pass over the board. */
function findTodayDinnerSlot(
  board: MealBoard,
  today: Date,
): { day: MealDay; slot: MealSlot } | null {
  const todayKey = formatLocalDate(today);
  const day = board.days.find((candidate) => candidate.date === todayKey);
  const slot = day?.slots.find((candidate) => candidate.mealType === "dinner");
  if (!day || !slot) return null;

  return { day, slot };
}

/** Routing target for today's dinner slot, or null when today isn't on the board. */
export function getTodayDinnerTarget(
  board: MealBoard,
  today: Date,
): MealSlotTarget | null {
  const found = findTodayDinnerSlot(board, today);
  if (!found) return null;

  return {
    weekStartDate: board.weekStartDate,
    dayIndex: found.day.dayIndex,
    mealType: "dinner",
  };
}

/** Summaries always carry a routing target, even when loading or unavailable. */
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

  const found = findTodayDinnerSlot(board, today);
  const target: MealSlotTarget = found
    ? {
        weekStartDate: board.weekStartDate,
        dayIndex: found.day.dayIndex,
        mealType: "dinner",
      }
    : fallbackTarget;
  const dinner = found?.slot;
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

/** Summaries always carry a routing target, even when loading or unavailable. */
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
