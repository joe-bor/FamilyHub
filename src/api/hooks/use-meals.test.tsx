import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { ApiResponse, MealBoard } from "@/lib/types";
import { testRecipeDetail } from "@/test/fixtures/recipes";
import {
  resetMockMeals,
  seedMockMealsBoard,
  seedMockRecipes,
  server,
} from "@/test/mocks/server";
import {
  mealsKeys,
  useDuplicateMealSlot,
  useMealsBoard,
  useMoveMealSlot,
  useRemoveMealSlot,
  useUpsertMealSlot,
} from "./use-meals";

const emptyBoard: MealBoard = {
  weekStartDate: "2026-06-07",
  days: Array.from({ length: 7 }, (_, dayIndex) => ({
    date: `2026-06-${String(7 + dayIndex).padStart(2, "0")}`,
    dayIndex,
    slots: [
      {
        id: null,
        weekStartDate: "2026-06-07",
        dayIndex,
        mealType: "breakfast",
        primary: null,
        extras: [],
        note: null,
      },
      {
        id: null,
        weekStartDate: "2026-06-07",
        dayIndex,
        mealType: "lunch",
        primary: null,
        extras: [],
        note: null,
      },
      {
        id: null,
        weekStartDate: "2026-06-07",
        dayIndex,
        mealType: "dinner",
        primary: null,
        extras: [],
        note: null,
      },
    ],
  })),
};

function boardWithOccupiedDinner(): MealBoard {
  const board = structuredClone(emptyBoard);
  board.days[1].slots[2] = {
    id: "slot-monday-dinner",
    weekStartDate: "2026-06-07",
    dayIndex: 1,
    mealType: "dinner",
    primary: {
      id: "entry-primary",
      role: "primary",
      sourceType: "quick",
      recipeId: null,
      title: "Pasta",
      imageUrl: null,
      note: "Use the red sauce",
    },
    extras: [],
    note: null,
  };
  board.days[2].slots[2] = {
    id: "slot-tuesday-dinner",
    weekStartDate: "2026-06-07",
    dayIndex: 2,
    mealType: "dinner",
    primary: {
      id: "entry-destination",
      role: "primary",
      sourceType: "quick",
      recipeId: null,
      title: "Soup",
      imageUrl: null,
      note: null,
    },
    extras: [],
    note: null,
  };
  return board;
}

describe("useMeals", () => {
  let queryClient: QueryClient;

  function createWrapper() {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  }

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => {
    server.resetHandlers();
    resetMockMeals();
    queryClient.clear();
  });
  afterAll(() => server.close());

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
  });

  it("loads a meals board for the selected week with lowercase first-class slots", async () => {
    seedMockMealsBoard(emptyBoard);

    const { result } = renderHook(() => useMealsBoard("2026-06-07"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.data.days).toHaveLength(7);
    });

    expect(result.current.data?.data.weekStartDate).toBe("2026-06-07");
    expect(
      result.current.data?.data.days[0].slots.map((slot) => slot.mealType),
    ).toEqual(["breakfast", "lunch", "dinner"]);
  });

  it("writes a quick meal slot and invalidates the board query", async () => {
    seedMockMealsBoard(emptyBoard);
    queryClient.setQueryData(mealsKeys.board("2026-06-07"), {
      data: emptyBoard,
    } satisfies ApiResponse<MealBoard>);

    const { result } = renderHook(() => useUpsertMealSlot(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      weekStartDate: "2026-06-07",
      dayIndex: 1,
      mealType: "dinner",
      primary: {
        sourceType: "quick",
        recipeId: null,
        title: "  Leftovers  ",
        imageUrl: null,
        note: "Add salad",
      },
      extras: [
        {
          sourceType: "quick",
          recipeId: null,
          title: "Fruit",
          imageUrl: null,
          note: null,
        },
      ],
      note: null,
      collisionMode: null,
    });

    await waitFor(() => {
      expect(result.current.data?.data.primary?.title).toBe("Leftovers");
    });

    expect(result.current.data?.data.extras[0].title).toBe("Fruit");
    expect(
      queryClient.getQueryState(mealsKeys.board("2026-06-07"))?.isInvalidated,
    ).toBe(true);
  });

  it("creates recipe-backed slots from backend board-display snapshots", async () => {
    seedMockMealsBoard(emptyBoard);
    seedMockRecipes([testRecipeDetail]);

    const { result } = renderHook(() => useUpsertMealSlot(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      weekStartDate: "2026-06-07",
      dayIndex: 2,
      mealType: "lunch",
      primary: {
        sourceType: "recipe",
        recipeId: testRecipeDetail.id,
        title: null,
        imageUrl: null,
        note: null,
      },
      extras: [],
      note: null,
      collisionMode: null,
    });

    await waitFor(() => {
      expect(result.current.data?.data.primary).toMatchObject({
        sourceType: "recipe",
        recipeId: testRecipeDetail.id,
        title: testRecipeDetail.title,
        imageUrl: testRecipeDetail.imageUrl,
        note: testRecipeDetail.note,
      });
    });
  });

  it("moves a meal with an explicit lowercase collision mode", async () => {
    const board = boardWithOccupiedDinner();
    seedMockMealsBoard(board);
    queryClient.setQueryData(mealsKeys.board("2026-06-07"), {
      data: board,
    } satisfies ApiResponse<MealBoard>);

    const { result } = renderHook(() => useMoveMealSlot(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      sourceWeekStartDate: "2026-06-07",
      sourceDayIndex: 1,
      sourceMealType: "dinner",
      destinationWeekStartDate: "2026-06-07",
      destinationDayIndex: 2,
      destinationMealType: "dinner",
      collisionMode: "replace_primary",
    });

    await waitFor(() => {
      const mondayDinner = result.current.data?.data.days[1].slots[2];
      const tuesdayDinner = result.current.data?.data.days[2].slots[2];
      expect(mondayDinner?.primary).toBe(null);
      expect(tuesdayDinner?.primary?.title).toBe("Pasta");
    });

    expect(
      queryClient.getQueryState(mealsKeys.board("2026-06-07"))?.isInvalidated,
    ).toBe(true);
  });

  it("duplicates a meal explicitly and can add it as an extra on collision", async () => {
    const board = boardWithOccupiedDinner();
    seedMockMealsBoard(board);

    const { result } = renderHook(() => useDuplicateMealSlot(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      sourceWeekStartDate: "2026-06-07",
      sourceDayIndex: 1,
      sourceMealType: "dinner",
      destinationWeekStartDate: "2026-06-07",
      destinationDayIndex: 2,
      destinationMealType: "dinner",
      collisionMode: "add_as_extra",
    });

    await waitFor(() => {
      const mondayDinner = result.current.data?.data.days[1].slots[2];
      const tuesdayDinner = result.current.data?.data.days[2].slots[2];
      expect(mondayDinner?.primary?.title).toBe("Pasta");
      expect(tuesdayDinner?.primary?.title).toBe("Soup");
      expect(tuesdayDinner?.extras.map((extra) => extra.title)).toEqual([
        "Pasta",
      ]);
    });
  });

  it("removes a planned slot and invalidates its board", async () => {
    const board = boardWithOccupiedDinner();
    seedMockMealsBoard(board);
    queryClient.setQueryData(mealsKeys.board("2026-06-07"), {
      data: board,
    } satisfies ApiResponse<MealBoard>);

    const { result } = renderHook(() => useRemoveMealSlot(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      weekStartDate: "2026-06-07",
      dayIndex: 1,
      mealType: "dinner",
    });

    await waitFor(() => {
      const mondayDinner = result.current.data?.data.days[1].slots[2];
      expect(mondayDinner?.primary).toBe(null);
      expect(mondayDinner?.extras).toEqual([]);
    });

    expect(
      queryClient.getQueryState(mealsKeys.board("2026-06-07"))?.isInvalidated,
    ).toBe(true);
  });

  it("keeps optimistic cache assertions alive for meal mutations", async () => {
    seedMockMealsBoard(emptyBoard);
    queryClient.setQueryData(mealsKeys.board("2026-06-07"), {
      data: emptyBoard,
    } satisfies ApiResponse<MealBoard>);

    const { result } = renderHook(() => useUpsertMealSlot(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      weekStartDate: "2026-06-07",
      dayIndex: 0,
      mealType: "breakfast",
      primary: {
        sourceType: "quick",
        recipeId: null,
        title: "Toast",
        imageUrl: null,
        note: null,
      },
      extras: [],
      note: null,
      collisionMode: null,
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<ApiResponse<MealBoard>>(
          mealsKeys.board("2026-06-07"),
        )?.data.days[0].slots[0].primary?.title,
      ).toBe("Toast");
    });
  });
});
