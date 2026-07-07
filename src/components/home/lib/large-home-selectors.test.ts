import { describe, expect, it } from "vitest";
import type {
  CalendarEvent,
  ChoresBoard,
  ListSummary,
  MealBoard,
} from "@/lib/types";
import {
  deriveChoresSummary,
  deriveListsSummary,
  deriveMealsSummary,
  getTodayDinnerTarget,
  selectRestOfDayItems,
  selectTomorrowPeek,
} from "./large-home-selectors";

const now = new Date(2026, 6, 5, 9, 0, 0);

const event = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  id: "e1",
  title: "Swim lesson",
  date: new Date(2026, 6, 5),
  startTime: "9:00 AM",
  endTime: "10:00 AM",
  memberId: "m1",
  isAllDay: false,
  source: "NATIVE",
  ...overrides,
});

const choresBoard = (
  remaining: number,
  total = Math.max(remaining, 1),
): ChoresBoard => ({
  timezone: "America/Los_Angeles",
  today: {
    scope: "TODAY",
    periodStartDate: "2026-07-05",
    periodEndDate: "2026-07-05",
    summary: { total, completed: total - remaining, remaining },
    assignees: [],
  },
  thisWeek: {
    scope: "THIS_WEEK",
    periodStartDate: "2026-07-05",
    periodEndDate: "2026-07-11",
    summary: { total: 0, completed: 0, remaining: 0 },
    assignees: [],
  },
  thisMonth: {
    scope: "THIS_MONTH",
    periodStartDate: "2026-07-01",
    periodEndDate: "2026-07-31",
    summary: { total: 0, completed: 0, remaining: 0 },
    assignees: [],
  },
});

const mealsBoard = (dinnerTitle: string | null): MealBoard => ({
  weekStartDate: "2026-07-05",
  days: Array.from({ length: 7 }, (_, dayIndex) => ({
    date: `2026-07-${String(5 + dayIndex).padStart(2, "0")}`,
    dayIndex,
    slots: (["breakfast", "lunch", "dinner"] as const).map((mealType) => ({
      id: mealType === "dinner" && dinnerTitle ? "slot-dinner" : null,
      weekStartDate: "2026-07-05",
      dayIndex,
      mealType,
      primary:
        mealType === "dinner" && dinnerTitle
          ? {
              id: "entry-dinner",
              role: "primary" as const,
              sourceType: "quick" as const,
              recipeId: null,
              title: dinnerTitle,
              imageUrl: null,
              note: null,
            }
          : null,
      extras: [],
      note: null,
    })),
  })),
});

describe("large home selectors", () => {
  it("selects 3-5 rest-of-day items after excluding the hero event", () => {
    const hero = event({
      id: "hero",
      startTime: "9:00 AM",
      endTime: "10:00 AM",
    });
    const later = [
      event({
        id: "a",
        title: "Dentist",
        startTime: "11:00 AM",
        endTime: "12:00 PM",
      }),
      event({
        id: "b",
        title: "Practice",
        startTime: "1:00 PM",
        endTime: "2:00 PM",
      }),
      event({
        id: "c",
        title: "Pickup",
        startTime: "3:00 PM",
        endTime: "4:00 PM",
      }),
      event({
        id: "d",
        title: "Dinner",
        startTime: "6:00 PM",
        endTime: "7:00 PM",
      }),
      event({
        id: "e",
        title: "Bedtime",
        startTime: "8:00 PM",
        endTime: "8:30 PM",
      }),
      event({
        id: "f",
        title: "Overflow",
        startTime: "9:00 PM",
        endTime: "9:30 PM",
      }),
    ];

    expect(selectRestOfDayItems([hero, ...later], hero, now)).toHaveLength(5);
    expect(
      selectRestOfDayItems([hero, ...later], hero, now).map((e) => e.title),
    ).toEqual(["Dentist", "Practice", "Pickup", "Dinner", "Bedtime"]);
  });

  it("selects a small tomorrow/near-future peek", () => {
    const tomorrow = new Date(2026, 6, 6);
    const dayAfter = new Date(2026, 6, 7);
    const items = selectTomorrowPeek(
      [
        event({
          id: "t1",
          title: "Camp",
          date: tomorrow,
          startTime: "8:00 AM",
        }),
        event({
          id: "t2",
          title: "Lunch",
          date: tomorrow,
          startTime: "12:00 PM",
        }),
        event({
          id: "t3",
          title: "Dentist",
          date: tomorrow,
          startTime: "4:00 PM",
        }),
        event({
          id: "d1",
          title: "Later",
          date: dayAfter,
          startTime: "9:00 AM",
        }),
      ],
      now,
    );

    expect(items.map((e) => e.title)).toEqual(["Camp", "Lunch", "Dentist"]);
  });

  it("derives chores remaining, done, empty, and unavailable states", () => {
    expect(
      deriveChoresSummary({
        board: choresBoard(3),
        isLoading: false,
        isError: false,
      }),
    ).toMatchObject({
      kind: "remaining",
      label: "3 chores left",
    });
    expect(
      deriveChoresSummary({
        board: choresBoard(0, 4),
        isLoading: false,
        isError: false,
      }),
    ).toMatchObject({
      kind: "done",
      label: "Chores done",
    });
    expect(
      deriveChoresSummary({
        board: choresBoard(0, 0),
        isLoading: false,
        isError: false,
      }),
    ).toMatchObject({
      kind: "empty",
      label: "No chores configured",
    });
    expect(
      deriveChoresSummary({ board: null, isLoading: false, isError: false }),
    ).toMatchObject({
      kind: "unavailable",
      label: "Chores unavailable",
    });
  });

  it("derives dinner planned and dinner missing states with a focus target", () => {
    expect(
      deriveMealsSummary({
        board: mealsBoard("Tacos"),
        today: new Date(2026, 6, 5),
        isLoading: false,
        isError: false,
      }),
    ).toMatchObject({
      kind: "planned",
      label: "Tacos tonight",
      target: { weekStartDate: "2026-07-05", dayIndex: 0, mealType: "dinner" },
    });

    expect(
      deriveMealsSummary({
        board: mealsBoard(null),
        today: new Date(2026, 6, 5),
        isLoading: false,
        isError: false,
      }),
    ).toMatchObject({
      kind: "missing",
      label: "Dinner not planned",
      target: { weekStartDate: "2026-07-05", dayIndex: 0, mealType: "dinner" },
    });
  });

  it("derives the best lists signal from active grocery items", () => {
    const lists: ListSummary[] = [
      {
        id: "g1",
        name: "Groceries",
        kind: "grocery",
        totalItems: 7,
        completedItems: 2,
      },
      {
        id: "todo",
        name: "Errands",
        kind: "to-do",
        totalItems: 5,
        completedItems: 1,
      },
    ];

    expect(
      deriveListsSummary({ lists, isLoading: false, isError: false }),
    ).toMatchObject({
      kind: "active",
      label: "5 grocery items",
      target: { module: "lists", listId: "g1" },
    });
  });

  it("finds today's dinner slot target", () => {
    expect(
      getTodayDinnerTarget(mealsBoard(null), new Date(2026, 6, 5)),
    ).toEqual({
      weekStartDate: "2026-07-05",
      dayIndex: 0,
      mealType: "dinner",
    });
  });
});
