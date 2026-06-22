import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStateLine } from "./use-state-line";

// Module-level mutables feed the mocked query hooks (the factory closes over them),
// so each test sets the chores/meals data it needs before rendering.
let choresResult: unknown;
let mealsResult: unknown;

vi.mock("@/api", () => ({
  useChoresBoard: () => choresResult,
  useMealsBoard: () => mealsResult,
}));

const choresWith = (remaining: number) => ({
  data: { data: { today: { summary: { remaining } } } },
});
const mealsWithDinner = (date: string, title: string | null) => ({
  data: {
    data: {
      days: [
        {
          date,
          slots: [{ mealType: "dinner", primary: title ? { title } : null }],
        },
      ],
    },
  },
});
const emptyMeals = { data: { data: { days: [] } } };

describe("useStateLine", () => {
  it("reports chores remaining and tonight's dinner for the local day", () => {
    choresResult = choresWith(3);
    mealsResult = mealsWithDinner("2026-06-21", "Tacos"); // June 21 — month index is 0-based
    const { result } = renderHook(() =>
      useStateLine({ now: new Date(2026, 5, 21) }),
    );
    expect(result.current.choresRemaining).toBe(3);
    expect(result.current.dinnerTitle).toBe("Tacos");
    expect(result.current.isEmpty).toBe(false);
  });

  it("is empty when no chores remain and no dinner is planned", () => {
    choresResult = choresWith(0);
    mealsResult = emptyMeals;
    const { result } = renderHook(() =>
      useStateLine({ now: new Date(2026, 5, 21) }),
    );
    expect(result.current.choresRemaining).toBe(0);
    expect(result.current.dinnerTitle).toBeNull();
    expect(result.current.isEmpty).toBe(true);
  });

  it("is not empty with chores remaining but no dinner", () => {
    choresResult = choresWith(2);
    mealsResult = emptyMeals;
    const { result } = renderHook(() =>
      useStateLine({ now: new Date(2026, 5, 21) }),
    );
    expect(result.current.dinnerTitle).toBeNull();
    expect(result.current.isEmpty).toBe(false);
  });

  it("is not empty with a dinner but zero chores remaining", () => {
    choresResult = choresWith(0);
    mealsResult = mealsWithDinner("2026-06-21", "Pasta");
    const { result } = renderHook(() =>
      useStateLine({ now: new Date(2026, 5, 21) }),
    );
    expect(result.current.choresRemaining).toBe(0);
    expect(result.current.dinnerTitle).toBe("Pasta");
    expect(result.current.isEmpty).toBe(false);
  });

  it("treats pending queries (undefined data) as empty", () => {
    choresResult = { data: undefined };
    mealsResult = { data: undefined };
    const { result } = renderHook(() =>
      useStateLine({ now: new Date(2026, 5, 21) }),
    );
    expect(result.current.choresRemaining).toBe(0);
    expect(result.current.dinnerTitle).toBeNull();
    expect(result.current.isEmpty).toBe(true);
  });
});
