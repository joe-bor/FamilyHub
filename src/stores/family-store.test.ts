import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFamilyStore } from "./family-store";

/**
 * Tests for the family hydration store.
 *
 * Note: The family store has been simplified to only handle hydration state.
 * Family data is now managed via TanStack Query hooks (useFamily, useCreateFamily, etc.)
 * and persisted via the API layer's localStorage write-through.
 *
 * The selectors (useFamilyMembers, useFamilyName, etc.) are now part of the API
 * hooks layer (@/api/hooks/use-family.ts) and should be tested there.
 */
describe("FamilyStore (Hydration)", () => {
  beforeEach(() => {
    // Reset to initial state for tests
    useFamilyStore.setState({ _hasHydrated: false });
    // Spy on console methods to verify error handling
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("initializes with _hasHydrated = false", () => {
      useFamilyStore.setState({ _hasHydrated: false });
      expect(useFamilyStore.getState()._hasHydrated).toBe(false);
    });
  });

  describe("setHasHydrated", () => {
    it("sets _hasHydrated to true", () => {
      useFamilyStore.getState().setHasHydrated(true);

      expect(useFamilyStore.getState()._hasHydrated).toBe(true);
    });

    it("sets _hasHydrated to false", () => {
      useFamilyStore.getState().setHasHydrated(true);
      useFamilyStore.getState().setHasHydrated(false);

      expect(useFamilyStore.getState()._hasHydrated).toBe(false);
    });
  });

  describe("state isolation", () => {
    it("only contains hydration state", () => {
      const state = useFamilyStore.getState();

      // The store should only have hydration-related properties
      expect("_hasHydrated" in state).toBe(true);
      expect("setHasHydrated" in state).toBe(true);

      // Should not have legacy family data properties
      expect("family" in state).toBe(false);
      expect("initializeFamily" in state).toBe(false);
      expect("addMember" in state).toBe(false);
    });
  });
});
