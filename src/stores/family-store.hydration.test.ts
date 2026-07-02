import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FAMILY_STORAGE_KEY } from "@/lib/constants";
import type { FamilyData } from "@/lib/types";

/**
 * Regression tests for the module-initialization import cycle:
 *
 *   use-family.ts → @/stores (index) → family-store.ts → use-family.ts
 *
 * family-store.ts runs initializeHydration() at module scope. When
 * use-family.ts is the first module in the cycle to evaluate (the normal app
 * boot order), family-store.ts executed before use-family.ts finished
 * initializing, so syncFamilyFromStorage() hit the `familyKeys` const in its
 * temporal dead zone. The resulting ReferenceError was caught and only
 * logged, silently skipping the boot-time localStorage → query cache seed.
 *
 * These tests force that exact evaluation order with a fresh module registry.
 */

const storedFamily: FamilyData = {
  id: "family-1",
  name: "Test Family",
  members: [{ id: "member-1", name: "Alice", color: "coral" }],
  createdAt: "2025-01-01T00:00:00.000Z",
};

describe("family hydration when use-family evaluates before family-store", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.setItem(
      FAMILY_STORAGE_KEY,
      JSON.stringify({
        state: { family: storedFamily, _hasHydrated: true },
        version: 0,
      }),
    );
  });

  afterEach(() => {
    localStorage.removeItem(FAMILY_STORAGE_KEY);
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("seeds the query cache from localStorage without a hydration error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Evaluate use-family.ts first — its @/stores import pulls in
    // family-store.ts, whose module-scope hydration runs mid-cycle.
    const { familyKeys } = await import("@/api/hooks/use-family");
    const { queryClient } = await import("@/providers/query-client");

    expect(errorSpy).not.toHaveBeenCalledWith(
      "Failed to check localStorage for family data:",
      expect.anything(),
    );
    expect(queryClient.getQueryData(familyKeys.family())).toEqual({
      data: storedFamily,
    });
  });

  it("marks the store as hydrated", async () => {
    await import("@/api/hooks/use-family");
    const { useFamilyStore } = await import("@/stores/family-store");

    expect(useFamilyStore.getState()._hasHydrated).toBe(true);
  });
});
